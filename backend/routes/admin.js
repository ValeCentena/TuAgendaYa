const express = require("express");
const jwt = require("jsonwebtoken");
const db = require("../db");

const router = express.Router();

function normalizeText(value) {
  return String(value || "").trim();
}

function getAdminToken(req) {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}

function requireAdmin(req, res, next) {
  try {
    const token = getAdminToken(req);

    if (!token) {
      return res.status(401).json({ error: "Token admin requerido" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "admin") {
      return res.status(403).json({ error: "Acceso admin denegado" });
    }

    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Token admin inválido" });
  }
}


const NICO_LIFETIME_FREE_SLUG = 'barberianicoaquino';


async function ensureAdminProfessionalNotesTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS admin_professional_notes (
      professional_id BIGINT PRIMARY KEY REFERENCES professionals(id) ON DELETE CASCADE,
      note TEXT NOT NULL DEFAULT '',
      updated_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}


function normalizeProfessional(row) {
  const slug = String(row.slug || '').trim().toLowerCase();
  const lifetimeFree = row.lifetime_free === true || slug === NICO_LIFETIME_FREE_SLUG;

  return {
    id: row.id,
    name: row.name,
    businessName: row.business_name,
    business_name: row.business_name,
    email: row.email,
    phone: row.phone,
    profession: row.profession,
    address: row.address,
    slug: row.slug,
    logoUrl: row.logo_url,
    logo_url: row.logo_url,
    status: lifetimeFree ? 'active' : row.status,
    plan: lifetimeFree ? 'Profesional' : (row.plan || "gratis"),
    lifetimeFree,
    lifetime_free: lifetimeFree,
    monthlyLimit: Number(row.monthly_limit || 1000),
    monthly_limit: Number(row.monthly_limit || 1000),
    monthlyBookingsCount: Number(row.monthly_bookings_count || 0),
    monthly_bookings_count: Number(row.monthly_bookings_count || 0),
    planPaymentStatus: lifetimeFree ? 'paid' : (row.plan_payment_status || 'pending'),
    plan_payment_status: lifetimeFree ? 'paid' : (row.plan_payment_status || 'pending'),
    planExpiresAt: lifetimeFree ? null : (row.plan_expires_at || null),
    plan_expires_at: lifetimeFree ? null : (row.plan_expires_at || null),
    lastPaymentAt: row.last_payment_at || null,
    last_payment_at: row.last_payment_at || null,
    billingMethod: lifetimeFree ? 'lifetime_free' : (row.billing_method || null),
    billing_method: lifetimeFree ? 'lifetime_free' : (row.billing_method || null),
    planPrice: lifetimeFree ? 0 : Number(row.plan_price || 0),
    plan_price: lifetimeFree ? 0 : Number(row.plan_price || 0),
    planCurrency: row.plan_currency || 'UYU',
    plan_currency: row.plan_currency || 'UYU',
    promoStartedAt: row.promo_started_at || null,
    promo_started_at: row.promo_started_at || null,
    promoFreeMonths: Number(row.promo_free_months || 2),
    promo_free_months: Number(row.promo_free_months || 2),
    promoDiscountMonths: Number(row.promo_discount_months || 2),
    promo_discount_months: Number(row.promo_discount_months || 2),
    promoDiscountPercent: Number(row.promo_discount_percent || 50),
    promo_discount_percent: Number(row.promo_discount_percent || 50),
    bookingsCount: Number(row.bookings_count || 0),
    clientsCount: Number(row.clients_count || 0),
    createdAt: row.created_at,
    created_at: row.created_at,
    updatedAt: row.updated_at,
    updated_at: row.updated_at,
  };
}

router.post("/login", async (req, res) => {
  try {
    const email = normalizeText(req.body.email).toLowerCase();
    const password = normalizeText(req.body.password);

    const adminEmail = normalizeText(process.env.ADMIN_EMAIL).toLowerCase();
    const adminPassword = normalizeText(process.env.ADMIN_PASSWORD);

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: "JWT_SECRET no está configurado" });
    }

    if (!adminEmail || !adminPassword) {
      return res.status(500).json({ error: "ADMIN_EMAIL o ADMIN_PASSWORD no están configurados" });
    }

    if (!email || !password) {
      return res.status(400).json({ error: "Email y contraseña son obligatorios" });
    }

    if (email !== adminEmail || password !== adminPassword) {
      return res.status(401).json({ error: "Credenciales admin incorrectas" });
    }

    const token = jwt.sign(
      {
        role: "admin",
        email: adminEmail,
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({
      token,
      admin: {
        email: adminEmail,
        role: "admin",
      },
    });
  } catch (error) {
    console.error("Error admin login:", error);
    res.status(500).json({ error: "Error iniciando sesión admin" });
  }
});

router.get("/me", requireAdmin, async (req, res) => {
  res.json({
    admin: {
      email: req.admin.email,
      role: req.admin.role,
    },
  });
});

router.get("/stats", requireAdmin, async (req, res) => {
  try {
    const professionalsResult = await db.query(
      `
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'active')::int AS active,
        COUNT(*) FILTER (WHERE status = 'suspended')::int AS suspended
      FROM professionals
      `
    );

    const bookingsResult = await db.query(
      `
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE booking_date = CURRENT_DATE)::int AS today,
        COUNT(*) FILTER (WHERE booking_date > CURRENT_DATE)::int AS upcoming,
        COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
        COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled
      FROM bookings
      `
    );

    const clientsResult = await db.query(
      `
      SELECT COUNT(*)::int AS total
      FROM (
        SELECT professional_id, LOWER(TRIM(client_phone)) AS phone
        FROM bookings
        WHERE client_phone IS NOT NULL AND TRIM(client_phone) <> ''
        GROUP BY professional_id, LOWER(TRIM(client_phone))
      ) clients
      `
    );

    const latestResult = await db.query(
      `
      SELECT
        p.id,
        p.name,
        p.business_name,
        p.email,
        p.phone,
        p.profession,
        p.address,
        p.slug,
        p.logo_url,
        p.status,
        p.plan,
        p.lifetime_free,
        p.monthly_limit,
        p.plan_payment_status,
        p.plan_expires_at,
        p.last_payment_at,
        p.billing_method,
        p.plan_price,
        p.plan_currency,
        p.promo_started_at,
        p.promo_free_months,
        p.promo_discount_months,
        p.promo_discount_percent,
        p.created_at,
        p.updated_at,
        COUNT(b.id)::int AS bookings_count,
        COUNT(b.id) FILTER (WHERE b.booking_date >= DATE_TRUNC('month', CURRENT_DATE) AND b.booking_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')::int AS monthly_bookings_count,
        COUNT(DISTINCT LOWER(TRIM(b.client_phone))) FILTER (WHERE b.client_phone IS NOT NULL AND TRIM(b.client_phone) <> '')::int AS clients_count
      FROM professionals p
      LEFT JOIN bookings b ON b.professional_id = p.id
      GROUP BY p.id
      ORDER BY p.created_at DESC
      LIMIT 5
      `
    );

    res.json({
      professionals: professionalsResult.rows[0] || { total: 0, active: 0, suspended: 0 },
      bookings: bookingsResult.rows[0] || { total: 0, today: 0, upcoming: 0, completed: 0, cancelled: 0 },
      clients: clientsResult.rows[0] || { total: 0 },
      latestProfessionals: latestResult.rows.map(normalizeProfessional),
    });
  } catch (error) {
    console.error("Error admin stats:", error);
    res.status(500).json({ error: "Error obteniendo estadísticas admin" });
  }
});


router.get("/alerts", requireAdmin, async (req, res) => {
  try {
    const alertsResult = await db.query(
      `
      WITH monthly_usage AS (
        SELECT
          p.id AS professional_id,
          COUNT(b.id) FILTER (
            WHERE b.booking_date >= DATE_TRUNC('month', CURRENT_DATE)
              AND b.booking_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
          )::int AS monthly_bookings_count
        FROM professionals p
        LEFT JOIN bookings b ON b.professional_id = p.id
        GROUP BY p.id
      ),
      reminder_errors AS (
        SELECT
          b.professional_id,
          COUNT(*)::int AS error_count,
          MAX(b.reminder_2h_attempted_at) AS last_error_at,
          MAX(b.reminder_2h_error) AS last_error
        FROM bookings b
        WHERE b.reminder_2h_error IS NOT NULL
          AND TRIM(b.reminder_2h_error) <> ''
          AND b.reminder_2h_attempted_at >= NOW() - INTERVAL '7 days'
        GROUP BY b.professional_id
      )
      SELECT
        p.id,
        p.name,
        p.business_name,
        p.email,
        p.slug,
        p.status,
        p.plan,
        p.lifetime_free,
        p.monthly_limit,
        p.plan_payment_status,
        p.plan_expires_at,
        COALESCE(mu.monthly_bookings_count, 0)::int AS monthly_bookings_count,
        COALESCE(re.error_count, 0)::int AS reminder_error_count,
        re.last_error_at,
        re.last_error
      FROM professionals p
      LEFT JOIN monthly_usage mu ON mu.professional_id = p.id
      LEFT JOIN reminder_errors re ON re.professional_id = p.id
      ORDER BY p.business_name NULLS LAST, p.name NULLS LAST, p.id
      `
    );

    const alerts = [];

    for (const row of alertsResult.rows) {
      const slug = String(row.slug || '').trim().toLowerCase();
      const lifetimeFree = row.lifetime_free === true || slug === NICO_LIFETIME_FREE_SLUG;
      const suspended = String(row.status || '').toLowerCase() === 'suspended';
      const businessName = row.business_name || row.name || row.email || `Negocio #${row.id}`;
      const expiresAt = row.plan_expires_at ? new Date(row.plan_expires_at) : null;
      const monthlyLimit = Number(row.monthly_limit || 1000);
      const monthlyUsed = Number(row.monthly_bookings_count || 0);
      const monthlyPercent = monthlyLimit > 0 ? Math.round((monthlyUsed / monthlyLimit) * 100) : 0;

      if (!lifetimeFree && !suspended) {
        const overdueByStatus = String(row.plan_payment_status || '').toLowerCase() === 'overdue';
        const overdueByDate = expiresAt && !Number.isNaN(expiresAt.getTime()) && expiresAt < new Date(new Date().toDateString());

        if (overdueByStatus || overdueByDate) {
          alerts.push({
            id: `payment-overdue-${row.id}`,
            type: 'payment_overdue',
            severity: 'critical',
            professionalId: row.id,
            businessName,
            slug: row.slug || '',
            title: 'Pago vencido',
            detail: row.plan_expires_at ? `Venció el ${new Date(row.plan_expires_at).toLocaleDateString('es-UY')}` : 'El estado de pago figura vencido',
          });
        } else if (expiresAt && !Number.isNaN(expiresAt.getTime())) {
          const now = new Date();
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const expiryDay = new Date(expiresAt.getFullYear(), expiresAt.getMonth(), expiresAt.getDate());
          const daysLeft = Math.ceil((expiryDay.getTime() - today.getTime()) / 86400000);
          if (daysLeft >= 0 && daysLeft <= 7) {
            alerts.push({
              id: `payment-expiring-${row.id}`,
              type: 'payment_expiring',
              severity: daysLeft <= 2 ? 'warning' : 'info',
              professionalId: row.id,
              businessName,
              slug: row.slug || '',
              title: 'Membresía próxima a vencer',
              detail: daysLeft === 0 ? 'Vence hoy' : `Vence en ${daysLeft} día${daysLeft === 1 ? '' : 's'}`,
            });
          }
        }
      }

      if (!suspended && monthlyLimit > 0 && monthlyPercent >= 80) {
        alerts.push({
          id: `monthly-limit-${row.id}`,
          type: 'monthly_limit',
          severity: monthlyPercent >= 100 ? 'critical' : 'warning',
          professionalId: row.id,
          businessName,
          slug: row.slug || '',
          title: monthlyPercent >= 100 ? 'Límite mensual alcanzado' : 'Cerca del límite mensual',
          detail: `${monthlyUsed} de ${monthlyLimit} reservas este mes (${monthlyPercent}%)`,
        });
      }

      if (Number(row.reminder_error_count || 0) > 0) {
        alerts.push({
          id: `reminder-error-${row.id}`,
          type: 'reminder_error',
          severity: 'warning',
          professionalId: row.id,
          businessName,
          slug: row.slug || '',
          title: 'Error en recordatorio de cliente',
          detail: `${Number(row.reminder_error_count)} fallo${Number(row.reminder_error_count) === 1 ? '' : 's'} en los últimos 7 días`,
          lastError: row.last_error || '',
          lastErrorAt: row.last_error_at || null,
        });
      }
    }

    const severityOrder = { critical: 0, warning: 1, info: 2 };
    alerts.sort((a, b) => (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9));

    res.json({
      alerts,
      counts: {
        total: alerts.length,
        critical: alerts.filter((item) => item.severity === 'critical').length,
        warning: alerts.filter((item) => item.severity === 'warning').length,
        info: alerts.filter((item) => item.severity === 'info').length,
      },
      note: 'Las alertas de comunicación usan únicamente errores de recordatorios que quedan registrados en la base de datos.',
    });
  } catch (error) {
    console.error("Error admin alerts:", error);
    res.status(500).json({ error: "Error obteniendo alertas admin" });
  }
});

router.get("/professionals", requireAdmin, async (req, res) => {
  try {
    const search = normalizeText(req.query.search).toLowerCase();
    const status = normalizeText(req.query.status).toLowerCase();

    const params = [];
    const where = [];

    if (search) {
      params.push(`%${search}%`);
      where.push(`(
        LOWER(COALESCE(p.name, '')) LIKE $${params.length}
        OR LOWER(COALESCE(p.business_name, '')) LIKE $${params.length}
        OR LOWER(COALESCE(p.email, '')) LIKE $${params.length}
        OR LOWER(COALESCE(p.slug, '')) LIKE $${params.length}
        OR LOWER(COALESCE(p.profession, '')) LIKE $${params.length}
      )`);
    }

    if (status && status !== "all") {
      const lifetimeFreeSql = `(COALESCE(p.lifetime_free, FALSE) = TRUE OR LOWER(COALESCE(p.slug, '')) = '${NICO_LIFETIME_FREE_SLUG}')`;
      const activePaidSql = `(
        COALESCE(p.status, 'active') <> 'suspended'
        AND NOT ${lifetimeFreeSql}
        AND (
          LOWER(COALESCE(p.plan_payment_status, '')) = 'paid'
          OR (p.plan_expires_at IS NOT NULL AND p.plan_expires_at >= CURRENT_DATE)
        )
      )`;
      const expiredSql = `(
        COALESCE(p.status, 'active') <> 'suspended'
        AND NOT ${lifetimeFreeSql}
        AND (
          LOWER(COALESCE(p.plan_payment_status, '')) = 'overdue'
          OR (p.plan_expires_at IS NOT NULL AND p.plan_expires_at < CURRENT_DATE)
        )
      )`;

      if (status === 'suspended') {
        where.push(`p.status = 'suspended'`);
      } else if (status === 'lifetime_free') {
        where.push(lifetimeFreeSql);
      } else if (status === 'active_paid') {
        where.push(activePaidSql);
      } else if (status === 'expired') {
        where.push(expiredSql);
      } else if (status === 'trial') {
        where.push(`(
          COALESCE(p.status, 'active') <> 'suspended'
          AND NOT ${lifetimeFreeSql}
          AND NOT ${activePaidSql}
          AND NOT ${expiredSql}
        )`);
      } else {
        return res.status(400).json({ error: 'Filtro de estado inválido' });
      }
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

    const result = await db.query(
      `
      SELECT
        p.id,
        p.name,
        p.business_name,
        p.email,
        p.phone,
        p.profession,
        p.address,
        p.slug,
        p.logo_url,
        p.status,
        p.plan,
        p.lifetime_free,
        p.monthly_limit,
        p.plan_payment_status,
        p.plan_expires_at,
        p.last_payment_at,
        p.billing_method,
        p.plan_price,
        p.plan_currency,
        p.promo_started_at,
        p.promo_free_months,
        p.promo_discount_months,
        p.promo_discount_percent,
        p.created_at,
        p.updated_at,
        COUNT(b.id)::int AS bookings_count,
        COUNT(b.id) FILTER (WHERE b.booking_date >= DATE_TRUNC('month', CURRENT_DATE) AND b.booking_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')::int AS monthly_bookings_count,
        COUNT(DISTINCT LOWER(TRIM(b.client_phone))) FILTER (WHERE b.client_phone IS NOT NULL AND TRIM(b.client_phone) <> '')::int AS clients_count
      FROM professionals p
      LEFT JOIN bookings b ON b.professional_id = p.id
      ${whereSql}
      GROUP BY p.id
      ORDER BY p.created_at DESC
      LIMIT 200
      `,
      params
    );

    res.json({ professionals: result.rows.map(normalizeProfessional) });
  } catch (error) {
    console.error("Error admin professionals:", error);
    res.status(500).json({ error: "Error obteniendo negocios" });
  }
});

router.get("/professionals/:id", requireAdmin, async (req, res) => {
  try {
    const professionalId = Number(req.params.id);

    if (!professionalId || Number.isNaN(professionalId)) {
      return res.status(400).json({ error: "Profesional inválido" });
    }

    const professionalResult = await db.query(
      `
      SELECT
        p.id,
        p.name,
        p.business_name,
        p.email,
        p.phone,
        p.profession,
        p.address,
        p.slug,
        p.logo_url,
        p.status,
        p.plan,
        p.lifetime_free,
        p.monthly_limit,
        p.plan_payment_status,
        p.plan_expires_at,
        p.last_payment_at,
        p.billing_method,
        p.plan_price,
        p.plan_currency,
        p.promo_started_at,
        p.promo_free_months,
        p.promo_discount_months,
        p.promo_discount_percent,
        p.created_at,
        p.updated_at,
        COUNT(b.id)::int AS bookings_count,
        COUNT(b.id) FILTER (WHERE b.booking_date >= DATE_TRUNC('month', CURRENT_DATE) AND b.booking_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')::int AS monthly_bookings_count,
        COUNT(DISTINCT LOWER(TRIM(b.client_phone))) FILTER (WHERE b.client_phone IS NOT NULL AND TRIM(b.client_phone) <> '')::int AS clients_count
      FROM professionals p
      LEFT JOIN bookings b ON b.professional_id = p.id
      WHERE p.id = $1
      GROUP BY p.id
      LIMIT 1
      `,
      [professionalId]
    );

    if (professionalResult.rows.length === 0) {
      return res.status(404).json({ error: "Negocio no encontrado" });
    }

    await ensureAdminProfessionalNotesTable();

    const notesResult = await db.query(
      `SELECT note, updated_by, updated_at
       FROM admin_professional_notes
       WHERE professional_id = $1
       LIMIT 1`,
      [professionalId]
    );

    const bookingsResult = await db.query(
      `
      SELECT
        b.id,
        b.client_name,
        b.client_phone,
        b.booking_date,
        b.start_time,
        b.end_time,
        b.status,
        b.comment,
        b.created_at,
        ps.name AS service_name,
        ps.duration_minutes,
        ps.price,
        sm.name AS staff_name
      FROM bookings b
      LEFT JOIN professional_services ps ON ps.id = b.service_id
      LEFT JOIN staff_members sm ON sm.id = b.staff_id
      WHERE b.professional_id = $1
      ORDER BY b.booking_date DESC NULLS LAST, b.start_time DESC NULLS LAST, b.created_at DESC
      LIMIT 50
      `,
      [professionalId]
    );

    const noteRow = notesResult.rows[0] || null;

    res.json({
      professional: normalizeProfessional(professionalResult.rows[0]),
      latestBookings: bookingsResult.rows,
      adminNote: noteRow ? {
        note: noteRow.note || '',
        updatedBy: noteRow.updated_by || '',
        updatedAt: noteRow.updated_at || null,
      } : { note: '', updatedBy: '', updatedAt: null },
    });
  } catch (error) {
    console.error("Error admin professional detail:", error);
    res.status(500).json({ error: "Error obteniendo detalle del negocio" });
  }
});


router.patch("/professionals/:id/admin-note", requireAdmin, async (req, res) => {
  try {
    const professionalId = Number(req.params.id);
    if (!professionalId || Number.isNaN(professionalId)) {
      return res.status(400).json({ error: "Profesional inválido" });
    }

    const note = String(req.body?.note ?? '').trim();
    if (note.length > 5000) {
      return res.status(400).json({ error: "La nota interna no puede superar los 5000 caracteres" });
    }

    const exists = await db.query(`SELECT id FROM professionals WHERE id = $1 LIMIT 1`, [professionalId]);
    if (exists.rows.length === 0) {
      return res.status(404).json({ error: "Negocio no encontrado" });
    }

    await ensureAdminProfessionalNotesTable();

    const result = await db.query(
      `INSERT INTO admin_professional_notes (professional_id, note, updated_by, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       ON CONFLICT (professional_id)
       DO UPDATE SET note = EXCLUDED.note, updated_by = EXCLUDED.updated_by, updated_at = NOW()
       RETURNING note, updated_by, updated_at`,
      [professionalId, note, String(req.admin?.email || '')]
    );

    const row = result.rows[0];
    res.json({
      success: true,
      adminNote: {
        note: row.note || '',
        updatedBy: row.updated_by || '',
        updatedAt: row.updated_at || null,
      },
    });
  } catch (error) {
    console.error("Error guardando nota interna admin:", error);
    res.status(500).json({ error: "No se pudo guardar la nota interna" });
  }
});


router.post("/professionals/:id/support-session", requireAdmin, async (req, res) => {
  try {
    const professionalId = Number(req.params.id);

    if (!professionalId || Number.isNaN(professionalId)) {
      return res.status(400).json({ error: "Profesional inválido" });
    }

    const result = await db.query(
      `
      SELECT
        id, name, business_name, email, phone, profession, address, slug, logo_url,
        public_profile_image_url, status, created_at, updated_at
      FROM professionals
      WHERE id = $1
      LIMIT 1
      `,
      [professionalId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Negocio no encontrado" });
    }

    const professional = result.rows[0];

    if (professional.status !== 'active') {
      return res.status(409).json({ error: "El negocio está suspendido. Reactivalo antes de entrar en modo soporte." });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: "JWT_SECRET no está configurado" });
    }

    const supportToken = jwt.sign(
      {
        id: professional.id,
        professionalId: professional.id,
        email: professional.email,
        supportMode: true,
        supportAdmin: req.admin.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    await db.query(`
      CREATE TABLE IF NOT EXISTS admin_audit_log (
        id BIGSERIAL PRIMARY KEY,
        admin_email TEXT NOT NULL,
        action TEXT NOT NULL,
        professional_id BIGINT REFERENCES professionals(id) ON DELETE SET NULL,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await db.query(
      `INSERT INTO admin_audit_log (admin_email, action, professional_id, metadata)
       VALUES ($1, 'support_login', $2, $3::jsonb)`,
      [
        String(req.admin.email || ''),
        professional.id,
        JSON.stringify({
          businessName: professional.business_name || professional.name || '',
          slug: professional.slug || '',
        }),
      ]
    );

    res.json({
      success: true,
      token: supportToken,
      expiresInSeconds: 7200,
      professional: normalizeProfessional(professional),
    });
  } catch (error) {
    console.error("Error creando sesión de soporte:", error);
    res.status(500).json({ error: "No se pudo iniciar el modo soporte" });
  }
});

router.patch("/professionals/:id/status", requireAdmin, async (req, res) => {
  try {
    const professionalId = Number(req.params.id);
    const status = normalizeText(req.body.status).toLowerCase();

    if (!professionalId || Number.isNaN(professionalId)) {
      return res.status(400).json({ error: "Profesional inválido" });
    }

    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({ error: "Estado inválido" });
    }

    const result = await db.query(
      `
      UPDATE professionals
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING
        id,
        name,
        business_name,
        email,
        phone,
        profession,
        address,
        slug,
        logo_url,
        status,
        created_at,
        updated_at,
        0::int AS bookings_count,
        0::int AS clients_count
      `,
      [status, professionalId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Negocio no encontrado" });
    }

    res.json({
      success: true,
      professional: normalizeProfessional(result.rows[0]),
    });
  } catch (error) {
    console.error("Error admin status:", error);
    res.status(500).json({ error: "Error actualizando estado" });
  }
});


router.patch("/professionals/:id/plan-actions", requireAdmin, async (req, res) => {
  const client = await db.connect();

  try {
    const professionalId = Number(req.params.id);
    const action = normalizeText(req.body.action).toLowerCase();

    if (!professionalId || Number.isNaN(professionalId)) {
      return res.status(400).json({ error: "Profesional inválido" });
    }

    const currentResult = await client.query(
      `SELECT id, slug, plan, status, lifetime_free, plan_price, plan_currency, plan_expires_at
       FROM professionals
       WHERE id = $1
       LIMIT 1`,
      [professionalId]
    );

    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: "Negocio no encontrado" });
    }

    const current = currentResult.rows[0];
    const currentSlug = String(current.slug || '').trim().toLowerCase();

    await client.query('BEGIN');

    if (action === 'set_plan') {
      const requestedPlan = normalizeText(req.body.plan);
      const normalizedPlan = requestedPlan.toLowerCase();
      const allowedPlans = new Map([
        ['free', 'free'],
        ['gratis', 'free'],
        ['profesional', 'Profesional'],
        ['empresa', 'Empresa'],
      ]);
      const nextPlan = allowedPlans.get(normalizedPlan);

      if (!nextPlan) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: "Plan inválido" });
      }

      if (currentSlug === NICO_LIFETIME_FREE_SLUG && nextPlan !== 'Profesional') {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: "La membresía vitalicia de Nico está fijada en Profesional" });
      }

      await client.query(
        `UPDATE professionals
         SET plan = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [nextPlan, professionalId]
      );
    } else if (action === 'extend_expiration') {
      const days = Number.parseInt(req.body.days, 10);
      if (!Number.isInteger(days) || days < 1 || days > 3650) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: "Los días deben estar entre 1 y 3650" });
      }

      if (current.lifetime_free === true || currentSlug === NICO_LIFETIME_FREE_SLUG) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: "Una cuenta gratis de por vida no tiene vencimiento" });
      }

      await client.query(
        `UPDATE professionals
         SET status = 'active',
             plan_payment_status = 'paid',
             plan_expires_at = GREATEST(COALESCE(plan_expires_at, NOW()), NOW()) + ($1::int * INTERVAL '1 day'),
             updated_at = NOW()
         WHERE id = $2`,
        [days, professionalId]
      );
    } else if (action === 'mark_manual_payment') {
      const days = Number.parseInt(req.body.days ?? 30, 10);
      const amount = Number(req.body.amount ?? current.plan_price ?? process.env.PLAN_BASE_PRICE ?? 600);
      const currency = normalizeText(req.body.currency || current.plan_currency || process.env.PLAN_CURRENCY || 'UYU').toUpperCase();

      if (!Number.isInteger(days) || days < 1 || days > 3650) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: "Los días del pago deben estar entre 1 y 3650" });
      }
      if (!Number.isFinite(amount) || amount < 0 || amount > 100000000) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: "Importe inválido" });
      }
      if (!/^[A-Z]{3}$/.test(currency)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: "Moneda inválida" });
      }

      const baseResult = await client.query(
        `SELECT GREATEST(COALESCE(plan_expires_at, NOW()), NOW()) + ($1::int * INTERVAL '1 day') AS next_expires
         FROM professionals WHERE id = $2`,
        [days, professionalId]
      );
      const nextExpires = baseResult.rows[0]?.next_expires;

      await client.query(
        `UPDATE professionals
         SET status = 'active',
             plan = 'Profesional',
             lifetime_free = FALSE,
             plan_payment_status = 'paid',
             plan_expires_at = $1,
             last_payment_at = NOW(),
             billing_method = 'manual_admin',
             plan_price = $2,
             plan_currency = $3,
             updated_at = NOW()
         WHERE id = $4`,
        [nextExpires, amount, currency, professionalId]
      );

      await client.query(
        `INSERT INTO plan_payments
          (professional_id, method, status, amount, currency, plan, period_days, approved_at, expires_at, created_at, updated_at)
         VALUES ($1, 'manual_admin', 'approved', $2, $3, 'Profesional', $4, NOW(), $5, NOW(), NOW())`,
        [professionalId, amount, currency, days, nextExpires]
      );
    } else if (action === 'set_lifetime_free') {
      const enabled = req.body.enabled === true;

      if (!enabled && currentSlug === NICO_LIFETIME_FREE_SLUG) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: "La membresía gratis de por vida de Nico está protegida" });
      }

      if (enabled) {
        await client.query(
          `UPDATE professionals
           SET status = 'active',
               plan = 'Profesional',
               lifetime_free = TRUE,
               plan_payment_status = 'paid',
               plan_expires_at = NULL,
               billing_method = 'lifetime_free',
               plan_price = 0,
               updated_at = NOW()
           WHERE id = $1`,
          [professionalId]
        );
      } else {
        const basePrice = Number(process.env.PLAN_BASE_PRICE || 600) || 600;
        await client.query(
          `UPDATE professionals
           SET lifetime_free = FALSE,
               plan_payment_status = 'pending',
               plan_expires_at = NULL,
               billing_method = NULL,
               plan_price = CASE WHEN COALESCE(plan_price, 0) <= 0 THEN $1 ELSE plan_price END,
               updated_at = NOW()
           WHERE id = $2`,
          [basePrice, professionalId]
        );
      }
    } else if (action === 'reset_trial') {
      if (currentSlug === NICO_LIFETIME_FREE_SLUG) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: "La cuenta de Nico es gratis de por vida y no usa período de prueba" });
      }

      await client.query(
        `UPDATE professionals
         SET status = 'active',
             plan = 'free',
             lifetime_free = FALSE,
             promo_started_at = NOW(),
             plan_payment_status = 'pending',
             plan_expires_at = NULL,
             last_payment_at = NULL,
             billing_method = NULL,
             updated_at = NOW()
         WHERE id = $1`,
        [professionalId]
      );
    } else {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: "Acción de plan inválida" });
    }

    await client.query('COMMIT');

    const result = await db.query(
      `SELECT
        p.id, p.name, p.business_name, p.email, p.phone, p.profession, p.address, p.slug, p.logo_url,
        p.status, p.plan, p.lifetime_free, p.monthly_limit, p.plan_payment_status, p.plan_expires_at,
        p.last_payment_at, p.billing_method, p.plan_price, p.plan_currency,
        p.promo_started_at, p.promo_free_months, p.promo_discount_months, p.promo_discount_percent,
        p.created_at, p.updated_at,
        COUNT(b.id)::int AS bookings_count,
        COUNT(b.id) FILTER (WHERE b.booking_date >= DATE_TRUNC('month', CURRENT_DATE) AND b.booking_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')::int AS monthly_bookings_count,
        COUNT(DISTINCT LOWER(TRIM(b.client_phone))) FILTER (WHERE b.client_phone IS NOT NULL AND TRIM(b.client_phone) <> '')::int AS clients_count
       FROM professionals p
       LEFT JOIN bookings b ON b.professional_id = p.id
       WHERE p.id = $1
       GROUP BY p.id`,
      [professionalId]
    );

    res.json({ success: true, professional: normalizeProfessional(result.rows[0]) });
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error("Error admin plan action:", error);
    res.status(500).json({ error: "Error actualizando plan del negocio" });
  } finally {
    client.release();
  }
});


module.exports = router;
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

function normalizeProfessional(row) {
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
    status: row.status,
    plan: row.plan || "Profesional",
    monthlyLimit: Number(row.monthly_limit || row.monthlyLimit || 1000),
    monthlyBookingsCount: Number(row.monthly_bookings_count || row.monthlyBookingsCount || 0),
    monthlyBookingsRemaining: Math.max(0, Number(row.monthly_limit || row.monthlyLimit || 1000) - Number(row.monthly_bookings_count || row.monthlyBookingsCount || 0)),
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
        COUNT(*) FILTER (WHERE booking_date >= date_trunc('month', CURRENT_DATE)::date AND booking_date < (date_trunc('month', CURRENT_DATE) + interval '1 month')::date)::int AS monthly,
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
        'Profesional' AS plan,
        1000::int AS monthly_limit,
        p.created_at,
        p.updated_at,
        COUNT(b.id)::int AS bookings_count,
        COUNT(b.id) FILTER (WHERE b.booking_date >= date_trunc('month', CURRENT_DATE)::date AND b.booking_date < (date_trunc('month', CURRENT_DATE) + interval '1 month')::date)::int AS monthly_bookings_count,
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
      bookings: bookingsResult.rows[0] || { total: 0, today: 0, upcoming: 0, monthly: 0, completed: 0, cancelled: 0 },
      clients: clientsResult.rows[0] || { total: 0 },
      latestProfessionals: latestResult.rows.map(normalizeProfessional),
    });
  } catch (error) {
    console.error("Error admin stats:", error);
    res.status(500).json({ error: "Error obteniendo estadísticas admin" });
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
      params.push(status);
      where.push(`p.status = $${params.length}`);
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
        'Profesional' AS plan,
        1000::int AS monthly_limit,
        p.created_at,
        p.updated_at,
        COUNT(b.id)::int AS bookings_count,
        COUNT(b.id) FILTER (WHERE b.booking_date >= date_trunc('month', CURRENT_DATE)::date AND b.booking_date < (date_trunc('month', CURRENT_DATE) + interval '1 month')::date)::int AS monthly_bookings_count,
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
        'Profesional' AS plan,
        1000::int AS monthly_limit,
        p.created_at,
        p.updated_at,
        COUNT(b.id)::int AS bookings_count,
        COUNT(b.id) FILTER (WHERE b.booking_date >= date_trunc('month', CURRENT_DATE)::date AND b.booking_date < (date_trunc('month', CURRENT_DATE) + interval '1 month')::date)::int AS monthly_bookings_count,
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

    res.json({
      professional: normalizeProfessional(professionalResult.rows[0]),
      latestBookings: bookingsResult.rows,
    });
  } catch (error) {
    console.error("Error admin professional detail:", error);
    res.status(500).json({ error: "Error obteniendo detalle del negocio" });
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
        'Profesional' AS plan,
        1000::int AS monthly_limit,
        0::int AS monthly_bookings_count,
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

module.exports = router;
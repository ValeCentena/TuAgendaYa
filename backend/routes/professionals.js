const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../db');

async function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  try {
    const decoded = jwt.verify(
  header.slice(7),
  process.env.JWT_SECRET
);

    const professionalId =
      decoded.id ||
      decoded.professionalId ||
      decoded.professional_id ||
      decoded.userId ||
      decoded.user_id;

    if (!professionalId) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    const result = await db.query(
      `SELECT status FROM professionals WHERE id = $1 LIMIT 1`,
      [professionalId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Profesional no encontrado' });
    }

    if (result.rows[0].status !== 'active') {
      return res.status(403).json({ error: 'Cuenta suspendida' });
    }

    req.professional = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

// ── Helpers de tipo ───────────────────────────────────────────
// Convierte CUALQUIER valor truthy a 1 y cualquier falsy a 0.
// Maneja: true, false, 1, 0, "true", "false", "1", "0", null, undefined.
function toBoolInt(v) {
  if (v === true  || v === 1 || v === '1' || v === 'true' || v === 't')  return 1;
  if (v === false || v === 0 || v === '0' || v === 'false' || v === 'f') return 0;
  return v ? 1 : 0;
}

// Para professional_services.is_active.
// En la base real esta columna puede estar como BOOLEAN por migraciones anteriores.
// Usamos boolean real para no volver a mezclar boolean con integer.
function toServiceBool(v, fallback = true) {
  if (v === undefined || v === null || v === '') return fallback;
  if (v === true || v === 1 || v === '1' || v === 'true' || v === 't') return true;
  if (v === false || v === 0 || v === '0' || v === 'false' || v === 'f') return false;
  return Boolean(v);
}

// Devuelve "HH:MM" si el valor parece una hora válida, o null en otro caso.
// Nunca devuelve false, "false", undefined ni cadenas inválidas.
function toTimeOrNull(v) {
  if (v === null || v === undefined || v === false || v === '' ||
      v === 'false' || v === 'null' || v === 'undefined') return null;
  const s = String(v).slice(0, 5);
  return /^\d{2}:\d{2}$/.test(s) ? s : null;
}

// ── Helpers disponibilidad ────────────────────────────────────

function buildDefaultAvailability(professionalId) {
  return [0, 1, 2, 3, 4, 5, 6].map(d => ({
    professional_id: professionalId,
    day_of_week:     d,
    is_active:       d >= 1 && d <= 5 ? 1 : 0,
    start_time:      '09:00',
    end_time:        '18:00',
    break_enabled:   0,
    break_start:     null,
    break_end:       null,
  }));
}

function normTime(t) {
  if (!t) return null;
  return String(t).slice(0, 5);
}

function normalizeAvailRow(r) {
  return {
    ...r,
    is_active:     toBoolInt(r.is_active),
    start_time:    normTime(r.start_time) || '09:00',
    end_time:      normTime(r.end_time)   || '18:00',
    break_enabled: toBoolInt(r.break_enabled),
    break_start:   normTime(r.break_start),
    break_end:     normTime(r.break_end),
  };
}

function mergeAvailWithDefaults(rows, professionalId) {
  const defaults = buildDefaultAvailability(professionalId);
  return [0, 1, 2, 3, 4, 5, 6].map(d => {
    const found = rows.find(r => Number(r.day_of_week) === d);
    return found ? normalizeAvailRow(found) : defaults[d];
  });
}



async function ensurePublicProfileImageColumn() {
  await db.query(`
    ALTER TABLE professionals
    ADD COLUMN IF NOT EXISTS public_profile_image_url TEXT
  `);
}

function normalizeProfessionalProfile(row) {
  if (!row) return null;

  return {
    id: row.id,
    name: row.name || '',
    businessName: row.business_name || row.name || '',
    business_name: row.business_name || row.name || '',
    email: row.email || '',
    phone: row.phone || '',
    profession: row.profession || '',
    address: row.address || '',
    slug: row.slug || '',
    logoUrl: row.logo_url || '',
    logo_url: row.logo_url || '',
    publicProfileImageUrl: row.public_profile_image_url || '',
    public_profile_image_url: row.public_profile_image_url || '',
    status: row.status || '',
    createdAt: row.created_at,
    created_at: row.created_at,
    updatedAt: row.updated_at,
    updated_at: row.updated_at,
  };
}

// GET /api/professionals/me/profile
router.get('/me/profile', authMiddleware, async (req, res) => {
  try {
    const professionalId = req.professional.id;

    await ensurePublicProfileImageColumn();

    const result = await db.query(
      `SELECT
         id,
         name,
         business_name,
         email,
         phone,
         profession,
         address,
         slug,
         logo_url,
         public_profile_image_url,
         status,
         created_at,
         updated_at
       FROM professionals
       WHERE id = $1
       LIMIT 1`,
      [professionalId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profesional no encontrado' });
    }

    setNoStoreHeaders(res);
    return res.json({
      professional: normalizeProfessionalProfile(result.rows[0]),
    });
  } catch (err) {
    console.error('GET /me/profile error:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PATCH /api/professionals/me/profile
router.patch('/me/profile', authMiddleware, async (req, res) => {
  try {
    const professionalId = req.professional.id;

    await ensurePublicProfileImageColumn();

    const currentResult = await db.query(
      `SELECT
         id,
         name,
         business_name,
         email,
         phone,
         profession,
         address,
         slug,
         logo_url,
         public_profile_image_url,
         status,
         created_at,
         updated_at
       FROM professionals
       WHERE id = $1
       LIMIT 1`,
      [professionalId]
    );

    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Profesional no encontrado' });
    }

    const current = currentResult.rows[0];

    const businessNameInput =
      req.body.businessName !== undefined
        ? req.body.businessName
        : req.body.business_name;

    const logoUrlInput =
      req.body.logoUrl !== undefined
        ? req.body.logoUrl
        : req.body.logo_url;

    const publicProfileImageUrlInput =
      req.body.publicProfileImageUrl !== undefined
        ? req.body.publicProfileImageUrl
        : req.body.public_profile_image_url;

    const businessName =
      businessNameInput === undefined
        ? String(current.business_name || current.name || '').trim()
        : String(businessNameInput || '').trim();

    const phone =
      req.body.phone === undefined
        ? String(current.phone || '').trim()
        : String(req.body.phone || '').trim();

    const address =
      req.body.address === undefined
        ? String(current.address || '').trim()
        : String(req.body.address || '').trim();

    const logoUrl =
      logoUrlInput === undefined
        ? String(current.logo_url || '').trim()
        : String(logoUrlInput || '').trim();

    const publicProfileImageUrl =
      publicProfileImageUrlInput === undefined
        ? String(current.public_profile_image_url || '').trim()
        : String(publicProfileImageUrlInput || '').trim();

    if (!businessName) {
      return res.status(400).json({ error: 'El nombre del negocio es obligatorio' });
    }

    if (businessName.length > 160) {
      return res.status(400).json({ error: 'El nombre del negocio es demasiado largo' });
    }

    if (phone.length > 60) {
      return res.status(400).json({ error: 'El teléfono es demasiado largo' });
    }

    if (address.length > 300) {
      return res.status(400).json({ error: 'La dirección es demasiado larga' });
    }

    const logoIsAllowed =
      !logoUrl ||
      /^https?:\/\//i.test(logoUrl) ||
      /^data:image\/(?:png|jpeg|webp);base64,/i.test(logoUrl);

    if (!logoIsAllowed) {
      return res.status(400).json({ error: 'El logo debe ser una URL o una imagen válida' });
    }

    const publicProfileImageIsAllowed =
      !publicProfileImageUrl ||
      /^https?:\/\//i.test(publicProfileImageUrl) ||
      /^data:image\/(?:png|jpeg|webp);base64,/i.test(publicProfileImageUrl);

    if (!publicProfileImageIsAllowed) {
      return res.status(400).json({
        error: 'La foto pública debe ser una URL o una imagen válida',
      });
    }

    const updateResult = await db.query(
      `UPDATE professionals
       SET business_name = $1,
           phone = $2,
           address = $3,
           logo_url = $4,
           public_profile_image_url = $5,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
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
         public_profile_image_url,
         status,
         created_at,
         updated_at`,
      [
        businessName,
        phone || null,
        address || null,
        logoUrl || null,
        publicProfileImageUrl || null,
        professionalId,
      ]
    );

    setNoStoreHeaders(res);
    return res.json({
      professional: normalizeProfessionalProfile(updateResult.rows[0]),
    });
  } catch (err) {
    console.error('PATCH /me/profile error:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});



function normalizeClientPhone(phone) {
  const onlyNumbers = String(phone || '').replace(/\D/g, '');

  if (!onlyNumbers) return '';

  if (onlyNumbers.startsWith('598')) {
    return onlyNumbers;
  }

  if (onlyNumbers.startsWith('09') && onlyNumbers.length >= 8) {
    return `598${onlyNumbers.slice(1)}`;
  }

  if (onlyNumbers.startsWith('9') && onlyNumbers.length >= 8) {
    return `598${onlyNumbers}`;
  }

  if (onlyNumbers.startsWith('0') && onlyNumbers.length > 6) {
    return `598${onlyNumbers.slice(1)}`;
  }

  return onlyNumbers;
}

async function ensureProfessionalClientsTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS professional_clients (
      id SERIAL PRIMARY KEY,
      professional_id INTEGER NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
      client_name TEXT NOT NULL,
      client_phone TEXT NOT NULL,
      normalized_phone TEXT NOT NULL,
      device_contact_id TEXT,
      source TEXT NOT NULL DEFAULT 'device',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (professional_id, normalized_phone)
    )
  `);
}

function normalizeProfessionalClient(row) {
  return {
    id: row.id,
    clientName: row.client_name || '',
    client_name: row.client_name || '',
    name: row.client_name || '',
    clientPhone: row.client_phone || '',
    client_phone: row.client_phone || '',
    phone: row.client_phone || '',
    normalizedPhone: row.normalized_phone || '',
    normalized_phone: row.normalized_phone || '',
    source: row.source || 'device',
    createdAt: row.created_at,
    created_at: row.created_at,
    updatedAt: row.updated_at,
    updated_at: row.updated_at,
  };
}

// GET /api/professionals/me/clients
router.get('/me/clients', authMiddleware, async (req, res) => {
  try {
    const professionalId = req.professional.id;

    await ensureProfessionalClientsTable();

    const result = await db.query(
      `SELECT
         id,
         client_name,
         client_phone,
         normalized_phone,
         source,
         created_at,
         updated_at
       FROM professional_clients
       WHERE professional_id = $1
       ORDER BY client_name ASC, id ASC`,
      [professionalId]
    );

    setNoStoreHeaders(res);
    return res.json({
      clients: result.rows.map(normalizeProfessionalClient),
    });
  } catch (err) {
    console.error('GET /me/clients error:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/professionals/me/clients/import
router.post('/me/clients/import', authMiddleware, async (req, res) => {
  try {
    const professionalId = req.professional.id;
    const contacts = Array.isArray(req.body.contacts) ? req.body.contacts : [];

    if (contacts.length === 0) {
      return res.status(400).json({ error: 'Seleccioná al menos un contacto' });
    }

    if (contacts.length > 500) {
      return res.status(400).json({ error: 'Podés importar hasta 500 contactos por vez' });
    }

    await ensureProfessionalClientsTable();

    let imported = 0;
    let existing = 0;
    let skipped = 0;
    const processedPhones = new Set();

    for (const contact of contacts) {
      const clientName = String(contact?.name ?? contact?.clientName ?? '').trim().slice(0, 160);
      const clientPhone = String(contact?.phone ?? contact?.clientPhone ?? '').trim().slice(0, 60);
      const normalizedPhone = normalizeClientPhone(clientPhone);
      const deviceContactId = contact?.deviceContactId
        ? String(contact.deviceContactId).trim().slice(0, 255)
        : null;

      if (!normalizedPhone || normalizedPhone.length < 7) {
        skipped += 1;
        continue;
      }

      if (processedPhones.has(normalizedPhone)) {
        existing += 1;
        continue;
      }

      processedPhones.add(normalizedPhone);

      const result = await db.query(
        `INSERT INTO professional_clients (
           professional_id,
           client_name,
           client_phone,
           normalized_phone,
           device_contact_id,
           source,
           created_at,
           updated_at
         )
         VALUES ($1, $2, $3, $4, $5, 'device', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (professional_id, normalized_phone)
         DO NOTHING
         RETURNING id`,
        [
          professionalId,
          clientName || 'Cliente sin nombre',
          clientPhone,
          normalizedPhone,
          deviceContactId,
        ]
      );

      if (result.rows.length > 0) {
        imported += 1;
      } else {
        existing += 1;
      }
    }

    setNoStoreHeaders(res);
    return res.status(201).json({
      success: true,
      imported,
      existing,
      skipped,
    });
  } catch (err) {
    console.error('POST /me/clients/import error:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

async function ensureClientNotesTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS professional_client_notes (
      id SERIAL PRIMARY KEY,
      professional_id INTEGER NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
      client_key TEXT NOT NULL,
      client_name TEXT,
      client_phone TEXT,
      notes TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (professional_id, client_key)
    )
  `);
}

function normalizeClientNote(row) {
  return {
    id: row.id,
    clientKey: row.client_key,
    client_key: row.client_key,
    clientName: row.client_name || '',
    client_name: row.client_name || '',
    clientPhone: row.client_phone || '',
    client_phone: row.client_phone || '',
    notes: row.notes || '',
    createdAt: row.created_at,
    created_at: row.created_at,
    updatedAt: row.updated_at,
    updated_at: row.updated_at,
  };
}

// GET /api/professionals/me/client-notes
router.get('/me/client-notes', authMiddleware, async (req, res) => {
  try {
    const professionalId = req.professional.id;

    await ensureClientNotesTable();

    const result = await db.query(
      `SELECT
         id,
         client_key,
         client_name,
         client_phone,
         notes,
         created_at,
         updated_at
       FROM professional_client_notes
       WHERE professional_id = $1
       ORDER BY updated_at DESC, id DESC`,
      [professionalId]
    );

    setNoStoreHeaders(res);
    return res.json({
      notes: result.rows.map(normalizeClientNote),
    });
  } catch (err) {
    console.error('GET /me/client-notes error:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PATCH /api/professionals/me/client-notes/:clientKey
router.patch('/me/client-notes/:clientKey', authMiddleware, async (req, res) => {
  try {
    const professionalId = req.professional.id;
    const clientKey = String(req.params.clientKey || '').trim();
    const clientName = String(req.body.clientName ?? req.body.client_name ?? '').trim();
    const clientPhone = String(req.body.clientPhone ?? req.body.client_phone ?? '').trim();
    const notes = String(req.body.notes ?? '');

    if (!clientKey) {
      return res.status(400).json({ error: 'Cliente inválido' });
    }

    if (clientKey.length > 220) {
      return res.status(400).json({ error: 'Identificador de cliente demasiado largo' });
    }

    if (clientName.length > 160) {
      return res.status(400).json({ error: 'El nombre del cliente es demasiado largo' });
    }

    if (clientPhone.length > 60) {
      return res.status(400).json({ error: 'El teléfono del cliente es demasiado largo' });
    }

    if (notes.length > 3000) {
      return res.status(400).json({ error: 'La nota no puede superar los 3000 caracteres' });
    }

    await ensureClientNotesTable();

    const result = await db.query(
      `INSERT INTO professional_client_notes (
         professional_id,
         client_key,
         client_name,
         client_phone,
         notes,
         created_at,
         updated_at
       )
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (professional_id, client_key)
       DO UPDATE SET
         client_name = EXCLUDED.client_name,
         client_phone = EXCLUDED.client_phone,
         notes = EXCLUDED.notes,
         updated_at = CURRENT_TIMESTAMP
       RETURNING
         id,
         client_key,
         client_name,
         client_phone,
         notes,
         created_at,
         updated_at`,
      [
        professionalId,
        clientKey,
        clientName || null,
        clientPhone || null,
        notes,
      ]
    );

    setNoStoreHeaders(res);
    return res.json({
      note: normalizeClientNote(result.rows[0]),
    });
  } catch (err) {
    console.error('PATCH /me/client-notes/:clientKey error:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});


// GET /api/professionals/me/booking-start-interval
router.get('/me/booking-start-interval', authMiddleware, async (req, res) => {
  try {
    const professionalId = req.professional.id;

    await ensureBookingStartIntervalColumn();

    const result = await db.query(
      `SELECT booking_start_interval_minutes
       FROM professionals
       WHERE id = $1
       LIMIT 1`,
      [professionalId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profesional no encontrado' });
    }

    const interval =
      Number(result.rows[0].booking_start_interval_minutes) === 60 ? 60 : 30;

    setNoStoreHeaders(res);
    return res.json({
      bookingStartIntervalMinutes: interval,
      booking_start_interval_minutes: interval,
    });
  } catch (err) {
    console.error('GET /me/booking-start-interval error:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PATCH /api/professionals/me/booking-start-interval
router.patch('/me/booking-start-interval', authMiddleware, async (req, res) => {
  try {
    const professionalId = req.professional.id;
    const interval = Number(
      req.body.bookingStartIntervalMinutes ??
      req.body.booking_start_interval_minutes
    );

    if (![30, 60].includes(interval)) {
      return res.status(400).json({
        error: 'El intervalo debe ser de 30 o 60 minutos',
      });
    }

    await ensureBookingStartIntervalColumn();

    const result = await db.query(
      `UPDATE professionals
       SET booking_start_interval_minutes = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING booking_start_interval_minutes`,
      [interval, professionalId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profesional no encontrado' });
    }

    setNoStoreHeaders(res);
    return res.json({
      bookingStartIntervalMinutes: interval,
      booking_start_interval_minutes: interval,
    });
  } catch (err) {
    console.error('PATCH /me/booking-start-interval error:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});


async function ensureBookingStartIntervalColumn() {
  await db.query(`
    ALTER TABLE professionals
    ADD COLUMN IF NOT EXISTS booking_start_interval_minutes INTEGER DEFAULT 30
  `);

  await db.query(`
    UPDATE professionals
    SET booking_start_interval_minutes = 30
    WHERE booking_start_interval_minutes IS NULL
       OR booking_start_interval_minutes NOT IN (30, 60)
  `);
}

// ── Helpers servicios ─────────────────────────────────────────

function getDefaultServices(profession) {
  // No se generan servicios por defecto.
  // El profesional debe crear manualmente sus propios servicios.
  return [];
}



async function ensureProfessionalSettingsColumns() {
  await db.query(`ALTER TABLE professionals ADD COLUMN IF NOT EXISTS notify_new_booking INTEGER DEFAULT 1`);
  await db.query(`ALTER TABLE professionals ADD COLUMN IF NOT EXISTS notify_cancellation INTEGER DEFAULT 1`);
  await db.query(`ALTER TABLE professionals ADD COLUMN IF NOT EXISTS notify_reminder INTEGER DEFAULT 1`);
  await db.query(`ALTER TABLE professionals ADD COLUMN IF NOT EXISTS reminder_hours_before INTEGER DEFAULT 2`);
  await db.query(`ALTER TABLE professionals ADD COLUMN IF NOT EXISTS min_advance_hours INTEGER DEFAULT 0`);
  await db.query(`ALTER TABLE professionals ADD COLUMN IF NOT EXISTS allow_client_cancellations INTEGER DEFAULT 1`);
  await db.query(`ALTER TABLE professionals ADD COLUMN IF NOT EXISTS cancellation_limit_minutes INTEGER DEFAULT 0`);
  await db.query(`ALTER TABLE professionals ADD COLUMN IF NOT EXISTS accepted_payment_methods TEXT DEFAULT 'cash,transfer,online'`);
  await db.query(`ALTER TABLE professionals ADD COLUMN IF NOT EXISTS agenda_view_mode TEXT DEFAULT 'list'`);
  await db.query(`ALTER TABLE professionals ALTER COLUMN min_advance_hours SET DEFAULT 0`).catch(() => {});
}

function normalizePaymentMethods(value) {
  const allowed = ['cash', 'transfer', 'online'];
  const list = Array.isArray(value) ? value : String(value || 'cash,transfer,online').split(',');
  const clean = list
    .map((item) => String(item || '').trim())
    .map((item) => (item === 'card' ? 'online' : item))
    .filter((item) => allowed.includes(item));

  return clean.length > 0 ? Array.from(new Set(clean)) : ['cash'];
}

function setNoStoreHeaders(res) {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
}

function normalizeSettingsRow(row) {
  const methods = normalizePaymentMethods(row.accepted_payment_methods);
  return {
    notify_new_booking: toBoolInt(row.notify_new_booking) === 1,
    notifyNewBooking: toBoolInt(row.notify_new_booking) === 1,
    notify_cancellation: toBoolInt(row.notify_cancellation) === 1,
    notifyCancellation: toBoolInt(row.notify_cancellation) === 1,
    notify_reminder: toBoolInt(row.notify_reminder) === 1,
    notifyReminder: toBoolInt(row.notify_reminder) === 1,
    reminder_hours_before: Number(row.reminder_hours_before || 2),
    reminderHoursBefore: Number(row.reminder_hours_before || 2),
    allow_client_cancellations: toBoolInt(row.allow_client_cancellations) === 1,
    allowClientCancellations: toBoolInt(row.allow_client_cancellations) === 1,
    cancellation_limit_minutes: Number(row.cancellation_limit_minutes || 0),
    cancellationLimitMinutes: Number(row.cancellation_limit_minutes || 0),
    accepted_payment_methods: methods.join(','),
    acceptedPaymentMethods: methods,
  };
}

function parsePositiveInt(v, fallback = null) {
  if (v === null || v === undefined || v === false || v === '' ||
      v === 'false' || v === 'null' || v === 'undefined') {
    return fallback;
  }
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function getServiceDurationFromBody(body, fallback = null) {
  return parsePositiveInt(
    body.duration_minutes !== undefined ? body.duration_minutes :
    body.durationMinutes !== undefined ? body.durationMinutes :
    body.duration !== undefined ? body.duration :
    body.service_duration !== undefined ? body.service_duration :
    body.serviceDuration,
    fallback
  );
}

function normalizeServiceRow(row) {
  if (!row) return row;
  const duration = parsePositiveInt(row.duration_minutes, 30);
  const priceNumber = row.price === null || row.price === undefined ? 0 : Number(row.price);
  return {
    ...row,
    id: row.id,
    serviceId: row.id,
    service_id: row.id,
    professional_service_id: row.id,
    duration_minutes: duration,
    durationMinutes: duration,
    duration,
    price: Number.isFinite(priceNumber) ? priceNumber : 0,
    is_active: toServiceBool(row.is_active, true),
    isActive: toServiceBool(row.is_active, true),
  };
}

async function cleanupDefaultServicesForProfessional(professionalId) {
  // Limpieza segura: NO borrar servicios creados manualmente.
  // Antes esta función borraba nombres como "corte" o "consulta" si duraban 30/45/60 min,
  // y eso hacía que al refrescar desaparecieran servicios reales del profesional.
  // Ahora solo elimina los antiguos servicios de ejemplo exactos y únicamente si no tienen precio.
  const defaultNames = [
    'corte de pelo',
    'coloración',
    'coloracion',
    'tratamiento',
  ];

  await db.query(
    `
      DELETE FROM professional_services
      WHERE professional_id = $1
        AND LOWER(TRIM(name)) = ANY($2::text[])
        AND COALESCE(price, 0) = 0
    `,
    [professionalId, defaultNames]
  ).catch((error) => {
    console.warn('cleanupDefaultServicesForProfessional skipped:', error.message);
  });

  await db.query(
    `
      DELETE FROM services
      WHERE professional_id = $1
        AND LOWER(TRIM(name)) = ANY($2::text[])
        AND COALESCE(price, 0) = 0
    `,
    [professionalId, defaultNames]
  ).catch((error) => {
    console.warn('cleanupDefaultServicesForProfessional legacy skipped:', error.message);
  });
}

// Mantiene compatibilidad con pantallas/rutas viejas que todavía leen la tabla `services`.
// La tabla principal nueva es `professional_services`, pero el link público puede consultar `services`.
async function syncActiveServicesToLegacyTable(professionalId) {
  const activeServices = (await db.query(
    `SELECT id, name, description, duration_minutes, price, is_active
     FROM professional_services
     WHERE professional_id = $1 AND (is_active IS NULL OR is_active::text IN ('1','true','t'))
     ORDER BY id ASC`,
    [professionalId]
  )).rows;

  for (const service of activeServices) {
    const exists = (await db.query(
      `SELECT id FROM services
       WHERE professional_id = $1 AND LOWER(name) = LOWER($2)
       LIMIT 1`,
      [professionalId, service.name]
    )).rows[0];

    if (exists) {
      await db.query(
        `UPDATE services
         SET duration = $1,
             price = $2,
             description = $3,
             active = 1
         WHERE id = $4`,
        [parsePositiveInt(service.duration_minutes, 30), Number(service.price) || 0, service.description || null, exists.id]
      );
    } else {
      await db.query(
        `INSERT INTO services
           (professional_id, name, duration, price, description, active)
         VALUES ($1, $2, $3, $4, $5, 1)`,
        [
          professionalId,
          service.name,
          parsePositiveInt(service.duration_minutes, 30),
          Number(service.price) || 0,
          service.description || null,
        ]
      );
    }
  }
}


// ══════════════════════════════════════════════════════════════
// VISTA DE AGENDA
// ══════════════════════════════════════════════════════════════

router.get('/me/agenda-view', authMiddleware, async (req, res) => {
  try {
    await ensureProfessionalSettingsColumns();
    const professionalId = req.professional.id;
    const row = (await db.query(
      `SELECT agenda_view_mode FROM professionals WHERE id = $1 LIMIT 1`,
      [professionalId]
    )).rows[0];

    const mode = row?.agenda_view_mode === 'calendar' ? 'calendar' : 'list';
    setNoStoreHeaders(res);
    return res.json({ agendaViewMode: mode, agenda_view_mode: mode });
  } catch (err) {
    console.error('GET /me/agenda-view error:', err);
    return res.status(500).json({ error: 'Error obteniendo la vista de agenda' });
  }
});

router.patch('/me/agenda-view', authMiddleware, async (req, res) => {
  try {
    await ensureProfessionalSettingsColumns();
    const professionalId = req.professional.id;
    const requestedMode = req.body.agendaViewMode !== undefined
      ? req.body.agendaViewMode
      : req.body.agenda_view_mode;
    const mode = requestedMode === 'calendar' ? 'calendar' : requestedMode === 'list' ? 'list' : null;

    if (!mode) {
      return res.status(400).json({ error: 'Vista de agenda inválida' });
    }

    await db.query(
      `UPDATE professionals
       SET agenda_view_mode = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [mode, professionalId]
    );

    return res.json({ success: true, agendaViewMode: mode, agenda_view_mode: mode });
  } catch (err) {
    console.error('PATCH /me/agenda-view error:', err);
    return res.status(500).json({ error: 'Error guardando la vista de agenda' });
  }
});

// ══════════════════════════════════════════════════════════════
// AJUSTES DEL NEGOCIO
// ══════════════════════════════════════════════════════════════

router.get('/me/settings', authMiddleware, async (req, res) => {
  try {
    await ensureProfessionalSettingsColumns();
    const profId = req.professional.id;
    const row = (await db.query(
      `SELECT notify_new_booking, notify_cancellation, notify_reminder, reminder_hours_before,
              allow_client_cancellations, cancellation_limit_minutes, accepted_payment_methods
       FROM professionals WHERE id = $1 LIMIT 1`,
      [profId]
    )).rows[0];
    res.json({ settings: normalizeSettingsRow(row || {}) });
  } catch (err) {
    console.error('GET /me/settings error:', err);
    res.status(500).json({ error: 'Error obteniendo ajustes' });
  }
});

router.patch('/me/settings', authMiddleware, async (req, res) => {
  try {
    await ensureProfessionalSettingsColumns();
    const profId = req.professional.id;
    const methods = normalizePaymentMethods(req.body.acceptedPaymentMethods !== undefined ? req.body.acceptedPaymentMethods : req.body.accepted_payment_methods);
    const notifyNewBooking = toBoolInt(req.body.notifyNewBooking !== undefined ? req.body.notifyNewBooking : req.body.notify_new_booking);
    const notifyCancellation = toBoolInt(req.body.notifyCancellation !== undefined ? req.body.notifyCancellation : req.body.notify_cancellation);
    const notifyReminder = toBoolInt(req.body.notifyReminder !== undefined ? req.body.notifyReminder : req.body.notify_reminder);
    const allowClientCancellations = toBoolInt(req.body.allowClientCancellations !== undefined ? req.body.allowClientCancellations : req.body.allow_client_cancellations);
    const cancellationLimitMinutes = Math.max(0, parseInt(req.body.cancellationLimitMinutes !== undefined ? req.body.cancellationLimitMinutes : req.body.cancellation_limit_minutes, 10) || 0);

    const row = (await db.query(
      `UPDATE professionals
       SET notify_new_booking = $1, notify_cancellation = $2, notify_reminder = $3,
           reminder_hours_before = 2, min_advance_hours = 0,
           allow_client_cancellations = $4, cancellation_limit_minutes = $5,
           accepted_payment_methods = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING notify_new_booking, notify_cancellation, notify_reminder, reminder_hours_before,
                 allow_client_cancellations, cancellation_limit_minutes, accepted_payment_methods`,
      [notifyNewBooking, notifyCancellation, notifyReminder, allowClientCancellations, cancellationLimitMinutes, methods.join(','), profId]
    )).rows[0];

    res.json({ success: true, settings: normalizeSettingsRow(row || {}) });
  } catch (err) {
    console.error('PATCH /me/settings error:', err);
    res.status(500).json({ error: 'Error guardando ajustes' });
  }
});

// ══════════════════════════════════════════════════════════════
// DISPONIBILIDAD
// ══════════════════════════════════════════════════════════════

// GET /api/professionals/me/availability
router.get('/me/availability', authMiddleware, async (req, res) => {
  try {
    const profId = req.professional.id;
    const rows = (await db.query(
      `SELECT id, professional_id, day_of_week,
              is_active,
              start_time::text  AS start_time,
              end_time::text    AS end_time,
              break_enabled,
              break_start::text AS break_start,
              break_end::text   AS break_end
       FROM professional_availability
       WHERE professional_id = $1
       ORDER BY day_of_week`,
      [profId]
    )).rows;

    const availability = mergeAvailWithDefaults(rows, profId);
    res.json({ availability });
  } catch (err) {
    console.error('GET /me/availability error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PATCH /api/professionals/me/availability
// Acepta camelCase o snake_case. Nunca falla por tipos incorrectos.
// NO acepta slot_duration_minutes desde el frontend — se guarda siempre como 30.
router.patch('/me/availability', authMiddleware, async (req, res) => {
  const profId = req.professional.id;
  const list   = req.body.availability;

  if (!Array.isArray(list) || list.length === 0) {
    return res.status(400).json({ error: 'Body debe tener { availability: [...] }' });
  }

  try {
    for (const item of list) {
      // ── día de la semana ──────────────────────────────────
      const dow = parseInt(
        item.day_of_week !== undefined ? item.day_of_week : item.dayOfWeek
      );
      if (isNaN(dow) || dow < 0 || dow > 6) continue;

      // ── campos booleanos → INTEGER 0/1 ───────────────────
      const isActive     = toBoolInt(item.is_active     !== undefined ? item.is_active     : item.isActive);
      const breakEnabled = toBoolInt(item.break_enabled !== undefined ? item.break_enabled : item.breakEnabled);

      // ── horarios → "HH:MM" con fallback seguro ───────────
      const startTime  = toTimeOrNull(item.start_time  || item.startTime)  || '09:00';
      const endTime    = toTimeOrNull(item.end_time    || item.endTime)    || '18:00';
      const breakStart = toTimeOrNull(item.break_start || item.breakStart);
      const breakEnd   = toTimeOrNull(item.break_end   || item.breakEnd);

      // No guardamos slot_duration_minutes desde disponibilidad.
      // La duración real del turno se toma desde el servicio.
      const safeBreakStart = breakEnabled ? breakStart : null;
      const safeBreakEnd = breakEnabled ? breakEnd : null;

      await db.query(
        `INSERT INTO professional_availability
           (professional_id, day_of_week, is_active, start_time, end_time,
            break_enabled, break_start, break_end)
         VALUES ($1, $2, $3, $4::time, $5::time, $6, $7::time, $8::time)
         ON CONFLICT (professional_id, day_of_week)
         DO UPDATE SET
           is_active     = EXCLUDED.is_active,
           start_time    = EXCLUDED.start_time,
           end_time      = EXCLUDED.end_time,
           break_enabled = EXCLUDED.break_enabled,
           break_start   = EXCLUDED.break_start,
           break_end     = EXCLUDED.break_end,
           updated_at    = CURRENT_TIMESTAMP`,
        [profId, dow, isActive, startTime, endTime, breakEnabled, safeBreakStart, safeBreakEnd]
      );
    }

    const updated = (await db.query(
      `SELECT id, professional_id, day_of_week,
              is_active,
              start_time::text  AS start_time,
              end_time::text    AS end_time,
              break_enabled,
              break_start::text AS break_start,
              break_end::text   AS break_end
       FROM professional_availability
       WHERE professional_id = $1
       ORDER BY day_of_week`,
      [profId]
    )).rows;

    const availability = mergeAvailWithDefaults(updated, profId);
    res.json({ availability });
  } catch (err) {
    console.error('PATCH /me/availability error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ══════════════════════════════════════════════════════════════
// SERVICIOS
// ══════════════════════════════════════════════════════════════

// GET /api/professionals/me/services
router.get('/me/services', authMiddleware, async (req, res) => {
  try {
    const profId = req.professional.id;

    // Limpia los servicios de ejemplo que se habían generado antes.
    await cleanupDefaultServicesForProfessional(profId);

    const rows = (await db.query(
      `SELECT id, professional_id, name, description, duration_minutes, price, is_active, created_at, updated_at
       FROM professional_services
       WHERE professional_id = $1 AND (is_active IS NULL OR is_active::text IN ('1','true','t'))
       ORDER BY id ASC`,
      [profId]
    )).rows;

    // No se devuelven servicios sugeridos ni creados por defecto.
    // Si no hay servicios, la lista queda vacía y el profesional debe crear el primero.
    await syncActiveServicesToLegacyTable(profId).catch(err => {
      console.warn('syncActiveServicesToLegacyTable skipped:', err.message);
    });

    res.json({ services: rows.map(normalizeServiceRow) });
  } catch (err) {
    console.error('GET /me/services error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/professionals/me/services
router.post('/me/services', authMiddleware, async (req, res) => {
  const profId = req.professional.id;
  const { name, description, price, is_active } = req.body;
  const duration = getServiceDurationFromBody(req.body);

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'El nombre del servicio es requerido' });
  }
  if (!duration) {
    return res.status(400).json({ error: 'La duración debe ser mayor a 0 minutos' });
  }

  try {
    const result = await db.query(
      `INSERT INTO professional_services
         (professional_id, name, description, duration_minutes, price, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        profId,
        name.trim(),
        description ? description.trim() : null,
        duration,
        parseFloat(price) || 0,
        toServiceBool(is_active, true),
      ]
    );

    await syncActiveServicesToLegacyTable(profId).catch(err => {
      console.warn('syncActiveServicesToLegacyTable skipped:', err.message);
    });

    const rows = (await db.query(
      `SELECT id, professional_id, name, description, duration_minutes, price, is_active, created_at, updated_at
       FROM professional_services
       WHERE professional_id = $1 AND (is_active IS NULL OR is_active::text IN ('1','true','t'))
       ORDER BY id ASC`,
      [profId]
    )).rows;

    res.status(201).json({
      service: normalizeServiceRow(result.rows[0]),
      services: rows.map(normalizeServiceRow),
    });
  } catch (err) {
    console.error('POST /me/services error:', err);
    res.status(500).json({ error: 'Error al crear el servicio' });
  }
});

// PATCH /api/professionals/me/services/:id
router.patch('/me/services/:id', authMiddleware, async (req, res) => {
  const profId    = req.professional.id;
  const serviceId = parseInt(req.params.id);

  if (isNaN(serviceId)) {
    return res.status(400).json({ error: 'ID de servicio inválido' });
  }

  try {
    const existing = (await db.query(
      'SELECT * FROM professional_services WHERE id = $1 AND professional_id = $2',
      [serviceId, profId]
    )).rows[0];

    if (!existing) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }

    const { name, description, price, is_active } = req.body;

    const newName     = name        !== undefined ? name.trim() : existing.name;
    const newDesc     = description !== undefined ? (description ? description.trim() : null) : existing.description;
    const newDuration = getServiceDurationFromBody(req.body, existing.duration_minutes);
    const newPrice    = price       !== undefined ? parseFloat(price) || 0 : existing.price;
    const newActive   = is_active   !== undefined ? toServiceBool(is_active, true) : toServiceBool(existing.is_active, true);

    if (!newName) {
      return res.status(400).json({ error: 'El nombre no puede estar vacío' });
    }
    if (newDuration < 1) {
      return res.status(400).json({ error: 'La duración debe ser mayor a 0 minutos' });
    }

    const updated = (await db.query(
      `UPDATE professional_services
       SET name = $1, description = $2, duration_minutes = $3, price = $4,
           is_active = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 AND professional_id = $7
       RETURNING *`,
      [newName, newDesc, newDuration, newPrice, newActive, serviceId, profId]
    )).rows[0];

    await syncActiveServicesToLegacyTable(profId).catch(err => {
      console.warn('syncActiveServicesToLegacyTable skipped:', err.message);
    });

    const rows = (await db.query(
      `SELECT id, professional_id, name, description, duration_minutes, price, is_active, created_at, updated_at
       FROM professional_services
       WHERE professional_id = $1 AND (is_active IS NULL OR is_active::text IN ('1','true','t'))
       ORDER BY id ASC`,
      [profId]
    )).rows;

    res.json({
      service: normalizeServiceRow(updated),
      services: rows.map(normalizeServiceRow),
    });
  } catch (err) {
    console.error('PATCH /me/services/:id error:', err);
    res.status(500).json({ error: 'Error al actualizar el servicio' });
  }
});

// DELETE /api/professionals/me/services/:id
// Soft delete — preserva integridad referencial con reservas existentes
router.delete('/me/services/:id', authMiddleware, async (req, res) => {
  const profId    = req.professional.id;
  const serviceId = parseInt(req.params.id);

  if (isNaN(serviceId)) {
    return res.status(400).json({ error: 'ID de servicio inválido' });
  }

  try {
    const existing = (await db.query(
      'SELECT id FROM professional_services WHERE id = $1 AND professional_id = $2',
      [serviceId, profId]
    )).rows[0];

    if (!existing) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }

    const service = (await db.query(
      `UPDATE professional_services
       SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND professional_id = $2
       RETURNING name`,
      [serviceId, profId]
    )).rows[0];

    if (service && service.name) {
      await db.query(
        `UPDATE services
         SET active = 0
         WHERE professional_id = $1 AND LOWER(name) = LOWER($2)`,
        [profId, service.name]
      ).catch(err => {
        console.warn('Legacy service deactivate skipped:', err.message);
      });
    }

    const rows = (await db.query(
      `SELECT id, professional_id, name, description, duration_minutes, price, is_active, created_at, updated_at
       FROM professional_services
       WHERE professional_id = $1 AND (is_active IS NULL OR is_active::text IN ('1','true','t'))
       ORDER BY id ASC`,
      [profId]
    )).rows;

    res.json({
      success: true,
      message: 'Servicio eliminado',
      services: rows.map(normalizeServiceRow),
    });
  } catch (err) {
    console.error('DELETE /me/services/:id error:', err);
    res.status(500).json({ error: 'Error al eliminar el servicio' });
  }
});



router.get('/public/:slug/settings', async (req, res) => {
  try {
    await ensureProfessionalSettingsColumns();

    const slug = String(req.params.slug || '').trim();
    const row = (await db.query(
      `SELECT notify_new_booking, notify_cancellation, notify_reminder, reminder_hours_before,
              allow_client_cancellations, cancellation_limit_minutes, accepted_payment_methods
       FROM professionals
       WHERE slug = $1 AND (status IS NULL OR status = 'active')
       LIMIT 1`,
      [slug]
    )).rows[0];

    if (!row) {
      return res.status(404).json({ error: 'Profesional no encontrado' });
    }

    res.json({ settings: normalizeSettingsRow(row) });
  } catch (err) {
    console.error('GET /public/:slug/settings error:', err);
    res.status(500).json({ error: 'Error obteniendo ajustes públicos' });
  }
});

// GET público de servicios por slug.
// Sirve para la página pública de reservas si consulta /api/professionals/public/:slug/services.
router.get('/public/:slug/services', async (req, res) => {
  try {
    setNoStoreHeaders(res);

    const slug = String(req.params.slug || '').trim();
    const professional = (await db.query(
      `SELECT *
       FROM professionals
       WHERE slug = $1 AND (status IS NULL OR status = 'active')
       LIMIT 1`,
      [slug]
    )).rows[0];

    if (!professional) {
      return res.status(404).json({ error: 'Profesional no encontrado' });
    }

    const professionalServices = (await db.query(
      `SELECT id, professional_id, name, description, duration_minutes, price, is_active, created_at, updated_at
       FROM professional_services
       WHERE professional_id = $1
         AND (is_active IS NULL OR is_active::text IN ('1','true','t'))
         AND TRIM(COALESCE(name, '')) <> ''
       ORDER BY id ASC`,
      [professional.id]
    ).catch((error) => {
      console.warn('public professional_services read skipped:', error.message);
      return { rows: [] };
    })).rows;

    const legacyServices = (await db.query(
      `SELECT id, professional_id, name, description, duration AS duration_minutes, price, active AS is_active, created_at, updated_at
       FROM services
       WHERE professional_id = $1
         AND (active IS NULL OR active::text IN ('1','true','t'))
         AND TRIM(COALESCE(name, '')) <> ''
       ORDER BY id ASC`,
      [professional.id]
    ).catch((error) => {
      console.warn('public legacy services read skipped:', error.message);
      return { rows: [] };
    })).rows;

    const byName = new Set();
    const services = [...professionalServices, ...legacyServices]
      .filter((service) => {
        const key = String(service.name || '').trim().toLowerCase();
        if (!key || byName.has(key)) return false;
        byName.add(key);
        return true;
      })
      .map(normalizeServiceRow);

    const settings = normalizeSettingsRow(professional || {});
    const acceptedPaymentMethods = normalizePaymentMethods(professional.accepted_payment_methods);

    const publicProfessional = {
      id: professional.id,
      name: professional.name,
      businessName: professional.business_name || professional.businessName || professional.name,
      business_name: professional.business_name || professional.businessName || professional.name,
      profession: professional.profession || '',
      address: professional.address || '',
      slug: professional.slug,
      logoUrl: professional.logo_url || professional.logoUrl || null,
      logo_url: professional.logo_url || professional.logoUrl || null,
      acceptedPaymentMethods,
      accepted_payment_methods: acceptedPaymentMethods,
    };

    return res.json({
      professional: publicProfessional,
      business: publicProfessional,
      settings,
      services,
    });
  } catch (err) {
    console.error('GET /public/:slug/services error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
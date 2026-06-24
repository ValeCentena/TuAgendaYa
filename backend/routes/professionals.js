const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../db');

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  try {
    const decoded = jwt.verify(
      header.slice(7),
      process.env.JWT_SECRET || 'tuagendaya-secret-dev-change-in-prod'
    );
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
  if (v === true  || v === 1 || v === '1' || v === 'true')  return 1;
  if (v === false || v === 0 || v === '0' || v === 'false') return 0;
  return v ? 1 : 0;
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

// ── Helpers servicios ─────────────────────────────────────────

function getDefaultServices(profession) {
  const p = (profession || '').toLowerCase();
  if (p.includes('peluq') || p.includes('barber') || p.includes('cabello') || p.includes('pelo')) {
    return [
      { name: 'Corte de pelo', description: null, duration_minutes: 30, price: 0 },
      { name: 'Coloración',    description: null, duration_minutes: 60, price: 0 },
      { name: 'Tratamiento',   description: null, duration_minutes: 45, price: 0 },
    ];
  }
  if (p.includes('estet') || p.includes('belleza') || p.includes('manicur') || p.includes('uñas')) {
    return [
      { name: 'Manicura',        description: null, duration_minutes: 30, price: 0 },
      { name: 'Pedicura',        description: null, duration_minutes: 45, price: 0 },
      { name: 'Diseño de uñas',  description: null, duration_minutes: 60, price: 0 },
    ];
  }
  if (p.includes('medic') || p.includes('doctor') || p.includes('psicolog') ||
      p.includes('psiquiatr') || p.includes('nutricion') || p.includes('nutrición')) {
    return [
      { name: 'Consulta', description: null, duration_minutes: 30, price: 0 },
      { name: 'Control',  description: null, duration_minutes: 20, price: 0 },
    ];
  }
  if (p.includes('abogad') || p.includes('contador') || p.includes('contad') || p.includes('asesor')) {
    return [
      { name: 'Consulta', description: null, duration_minutes: 60, price: 0 },
      { name: 'Reunión',  description: null, duration_minutes: 90, price: 0 },
    ];
  }
  if (p.includes('kinesiol') || p.includes('fisio') || p.includes('masaj') || p.includes('osteopat')) {
    return [
      { name: 'Sesión',  description: null, duration_minutes: 60, price: 0 },
      { name: 'Masaje',  description: null, duration_minutes: 45, price: 0 },
    ];
  }
  if (p.includes('entrenad') || p.includes('personal trainer') ||
      p.includes('fitness')  || p.includes('gimnasio')) {
    return [
      { name: 'Clase personal', description: null, duration_minutes: 60, price: 0 },
      { name: 'Evaluación',     description: null, duration_minutes: 30, price: 0 },
    ];
  }
  return [
    { name: 'Corte',    description: null, duration_minutes: 30, price: 0 },
    { name: 'Consulta', description: null, duration_minutes: 30, price: 0 },
  ];
}

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

      // slot_duration_minutes se mantiene en 30 (la duración real viene de professional_services)
      await db.query(
        `INSERT INTO professional_availability
           (professional_id, day_of_week, is_active, start_time, end_time,
            slot_duration_minutes, break_enabled, break_start, break_end)
         VALUES ($1, $2, $3, $4::time, $5::time, 30, $6, $7, $8)
         ON CONFLICT (professional_id, day_of_week)
         DO UPDATE SET
           is_active             = EXCLUDED.is_active,
           start_time            = EXCLUDED.start_time,
           end_time              = EXCLUDED.end_time,
           break_enabled         = EXCLUDED.break_enabled,
           break_start           = EXCLUDED.break_start,
           break_end             = EXCLUDED.break_end,
           updated_at            = CURRENT_TIMESTAMP`,
        [profId, dow, isActive, startTime, endTime, breakEnabled, breakStart, breakEnd]
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

    const rows = (await db.query(
      `SELECT id, professional_id, name, description, duration_minutes, price, is_active, created_at, updated_at
       FROM professional_services
       WHERE professional_id = $1
       ORDER BY id ASC`,
      [profId]
    )).rows;

    if (rows.length === 0) {
      const prof = (await db.query(
        'SELECT profession FROM professionals WHERE id = $1',
        [profId]
      )).rows[0];

      const defaults = getDefaultServices(prof ? prof.profession : '').map(s => ({
        id:               null,
        professional_id:  profId,
        name:             s.name,
        description:      s.description,
        duration_minutes: s.duration_minutes,
        price:            s.price,
        is_active:        1,
        created_at:       null,
        updated_at:       null,
        _is_default:      true,
      }));

      return res.json({ services: defaults });
    }

    res.json({ services: rows });
  } catch (err) {
    console.error('GET /me/services error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/professionals/me/services
router.post('/me/services', authMiddleware, async (req, res) => {
  const profId = req.professional.id;
  const { name, description, duration_minutes, price, is_active } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'El nombre del servicio es requerido' });
  }
  if (!duration_minutes || parseInt(duration_minutes) < 1) {
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
        parseInt(duration_minutes),
        parseFloat(price) || 0,
        toBoolInt(is_active !== undefined ? is_active : 1),
      ]
    );
    res.status(201).json({ service: result.rows[0] });
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

    const { name, description, duration_minutes, price, is_active } = req.body;

    const newName     = name             !== undefined ? name.trim()                   : existing.name;
    const newDesc     = description      !== undefined ? (description ? description.trim() : null) : existing.description;
    const newDuration = duration_minutes !== undefined ? parseInt(duration_minutes)    : existing.duration_minutes;
    const newPrice    = price            !== undefined ? parseFloat(price) || 0        : existing.price;
    const newActive   = is_active        !== undefined ? toBoolInt(is_active)          : existing.is_active;

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

    res.json({ service: updated });
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

    await db.query(
      `UPDATE professional_services
       SET is_active = 0, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND professional_id = $2`,
      [serviceId, profId]
    );

    res.json({ success: true, message: 'Servicio desactivado' });
  } catch (err) {
    console.error('DELETE /me/services/:id error:', err);
    res.status(500).json({ error: 'Error al eliminar el servicio' });
  }
});

module.exports = router;
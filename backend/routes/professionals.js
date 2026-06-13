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

function defaultAvailability(professionalId) {
  return [0, 1, 2, 3, 4, 5, 6].map(day => ({
    professional_id: professionalId,
    day_of_week: day,
    is_active: day >= 1 && day <= 5 ? 1 : 0,
    start_time: '09:00',
    end_time: '18:00',
    slot_duration_minutes: 30,
  }));
}

function normTime(t) {
  if (!t) return '09:00';
  return String(t).slice(0, 5);
}

// ── GET /api/professionals/me/availability ────────────────────
router.get('/me/availability', authMiddleware, async (req, res) => {
  try {
    const rows = (await db.query(
      'SELECT * FROM professional_availability WHERE professional_id = $1 ORDER BY day_of_week',
      [req.professional.id]
    )).rows;

    if (rows.length === 0) {
      return res.json({ availability: defaultAvailability(req.professional.id) });
    }

    const availability = rows.map(r => ({
      ...r,
      start_time: normTime(r.start_time),
      end_time: normTime(r.end_time),
    }));

    res.json({ availability });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── PATCH /api/professionals/me/availability ─────────────────
router.patch('/me/availability', authMiddleware, async (req, res) => {
  const { availability } = req.body;

  if (!Array.isArray(availability) || availability.length === 0) {
    return res.status(400).json({ error: 'availability debe ser un array de 7 días' });
  }

  try {
    for (const day of availability) {
      const dow = parseInt(day.day_of_week);
      if (isNaN(dow) || dow < 0 || dow > 6) continue;

      await db.query(
        `INSERT INTO professional_availability
           (professional_id, day_of_week, is_active, start_time, end_time, slot_duration_minutes)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (professional_id, day_of_week)
         DO UPDATE SET
           is_active             = EXCLUDED.is_active,
           start_time            = EXCLUDED.start_time,
           end_time              = EXCLUDED.end_time,
           slot_duration_minutes = EXCLUDED.slot_duration_minutes,
           updated_at            = CURRENT_TIMESTAMP`,
        [
          req.professional.id,
          dow,
          day.is_active ? 1 : 0,
          day.start_time || '09:00',
          day.end_time   || '18:00',
          day.slot_duration_minutes || 30,
        ]
      );
    }

    const updated = (await db.query(
      'SELECT * FROM professional_availability WHERE professional_id = $1 ORDER BY day_of_week',
      [req.professional.id]
    )).rows;

    const availability_out = updated.map(r => ({
      ...r,
      start_time: normTime(r.start_time),
      end_time: normTime(r.end_time),
    }));

    res.json({ availability: availability_out });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
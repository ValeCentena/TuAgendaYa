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

function buildDefault(professionalId) {
  return [0, 1, 2, 3, 4, 5, 6].map(d => ({
    professional_id: professionalId,
    day_of_week: d,
    is_active: d >= 1 && d <= 5 ? 1 : 0,
    start_time: '09:00',
    end_time: '18:00',
    slot_duration_minutes: 30,
  }));
}

function normTime(t) {
  if (!t) return '09:00';
  return String(t).slice(0, 5);
}

function normalizeRow(r) {
  return {
    ...r,
    is_active: r.is_active === true || r.is_active === 1 ? 1 : 0,
    start_time: normTime(r.start_time),
    end_time: normTime(r.end_time),
    slot_duration_minutes: parseInt(r.slot_duration_minutes) || 30,
  };
}

function mergeWithDefaults(rows, professionalId) {
  const defaults = buildDefault(professionalId);
  return [0, 1, 2, 3, 4, 5, 6].map(d => {
    const found = rows.find(r => Number(r.day_of_week) === d);
    return found ? normalizeRow(found) : defaults[d];
  });
}

router.get('/me/availability', authMiddleware, async (req, res) => {
  try {
    const profId = req.professional.id;
    const rows = (await db.query(
      `SELECT id, professional_id, day_of_week,
              is_active,
              start_time::text AS start_time,
              end_time::text   AS end_time,
              slot_duration_minutes
       FROM professional_availability
       WHERE professional_id = $1
       ORDER BY day_of_week`,
      [profId]
    )).rows;
    const availability = mergeWithDefaults(rows, profId);
    res.json({ availability });
  } catch (err) {
    console.error('GET /me/availability error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.patch('/me/availability', authMiddleware, async (req, res) => {
  const profId = req.professional.id;
  let list = req.body.availability;
  if (!Array.isArray(list)) {
    return res.status(400).json({ error: 'Body debe tener { availability: [...] }' });
  }
  if (list.length === 0) {
    return res.status(400).json({ error: 'availability no puede estar vacío' });
  }
  try {
    for (const item of list) {
      const dow = parseInt(
        item.day_of_week !== undefined ? item.day_of_week : item.dayOfWeek
      );
      if (isNaN(dow) || dow < 0 || dow > 6) continue;

      const isActive = (() => {
        const v = item.is_active !== undefined ? item.is_active : item.isActive;
        return (v === true || v === 1) ? 1 : 0;
      })();

      const startTime = item.start_time || item.startTime || '09:00';
      const endTime   = item.end_time   || item.endTime   || '18:00';
      const duration  = parseInt(item.slot_duration_minutes || item.slotDurationMinutes) || 30;

      await db.query(
        `INSERT INTO professional_availability
           (professional_id, day_of_week, is_active, start_time, end_time, slot_duration_minutes)
         VALUES ($1, $2, $3, $4::time, $5::time, $6)
         ON CONFLICT (professional_id, day_of_week)
         DO UPDATE SET
           is_active             = EXCLUDED.is_active,
           start_time            = EXCLUDED.start_time,
           end_time              = EXCLUDED.end_time,
           slot_duration_minutes = EXCLUDED.slot_duration_minutes,
           updated_at            = CURRENT_TIMESTAMP`,
        [profId, dow, isActive, startTime, endTime, duration]
      );
    }
    const updated = (await db.query(
      `SELECT id, professional_id, day_of_week,
              is_active,
              start_time::text AS start_time,
              end_time::text   AS end_time,
              slot_duration_minutes
       FROM professional_availability
       WHERE professional_id = $1
       ORDER BY day_of_week`,
      [profId]
    )).rows;
    const availability = mergeWithDefaults(updated, profId);
    res.json({ availability });
  } catch (err) {
    console.error('PATCH /me/availability error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
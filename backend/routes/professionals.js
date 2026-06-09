const express = require('express');
const { db } = require('../db');
const { authProfessional } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { getAvailableSlotsForDate, getAvailableDatesInMonth } = require('../utils/slots');
const { validateAvailabilitySlots } = require('../utils/validate');
const { AppError } = require('../utils/errors');

const router = express.Router();

function publicProfessional(row) {
  return {
    id: row.id,
    name: row.name,
    specialty: row.specialty,
    slug: row.slug,
    bio: row.bio,
    duration_minutes: row.duration_minutes,
  };
}

router.get('/', (_req, res) => {
  const rows = db.prepare(
    'SELECT id, name, specialty, slug, bio, duration_minutes FROM professionals WHERE active = 1 ORDER BY name',
  ).all();
  res.json(rows);
});

router.get('/slug/:slug', (req, res) => {
  const row = db.prepare(
    'SELECT id, name, specialty, slug, bio, duration_minutes FROM professionals WHERE slug = ? AND active = 1',
  ).get(req.params.slug);

  if (!row) return res.status(404).json({ error: 'Profesional no encontrado' });
  res.json(row);
});

router.get('/slug/:slug/dates', asyncHandler((req, res) => {
  const { month } = req.query;
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    throw new AppError(400, 'Parámetro month requerido (YYYY-MM)');
  }

  const row = db.prepare('SELECT id, duration_minutes FROM professionals WHERE slug = ? AND active = 1').get(req.params.slug);
  if (!row) throw new AppError(404, 'Profesional no encontrado');

  const [year, mon] = month.split('-').map(Number);
  const dates = getAvailableDatesInMonth(db, row.id, year, mon, row.duration_minutes);
  res.json(dates);
}));

router.get('/slug/:slug/slots', asyncHandler((req, res) => {
  const { date } = req.query;
  if (!date) throw new AppError(400, 'Parámetro date requerido (YYYY-MM-DD)');

  const row = db.prepare('SELECT id, duration_minutes FROM professionals WHERE slug = ? AND active = 1').get(req.params.slug);
  if (!row) throw new AppError(404, 'Profesional no encontrado');

  const slots = getAvailableSlotsForDate(db, row.id, date, row.duration_minutes);
  res.json(slots);
}));

router.get('/me', authProfessional, (req, res) => {
  const row = db.prepare(
    'SELECT id, name, email, specialty, slug, phone, bio, duration_minutes FROM professionals WHERE id = ?',
  ).get(req.user.id);

  if (!row) return res.status(404).json({ error: 'Profesional no encontrado' });
  res.json(row);
});

router.put('/me', authProfessional, (req, res) => {
  const { name, specialty, phone, bio, durationMinutes } = req.body;

  db.prepare(`
    UPDATE professionals SET
      name = COALESCE(?, name),
      specialty = COALESCE(?, specialty),
      phone = COALESCE(?, phone),
      bio = COALESCE(?, bio),
      duration_minutes = COALESCE(?, duration_minutes)
    WHERE id = ?
  `).run(name, specialty, phone, bio, durationMinutes, req.user.id);

  const row = db.prepare(
    'SELECT id, name, email, specialty, slug, phone, bio, duration_minutes FROM professionals WHERE id = ?',
  ).get(req.user.id);

  res.json(row);
});

router.get('/me/availability', authProfessional, (req, res) => {
  const rows = db.prepare(
    'SELECT day_of_week, start_time, end_time FROM availability WHERE professional_id = ? ORDER BY day_of_week, start_time',
  ).all(req.user.id);
  res.json(rows);
});

router.put('/me/availability', authProfessional, asyncHandler((req, res) => {
  const slots = validateAvailabilitySlots(req.body.slots || []);

  const deleteStmt = db.prepare('DELETE FROM availability WHERE professional_id = ?');
  const insertStmt = db.prepare(
    'INSERT INTO availability (professional_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)',
  );

  const tx = db.transaction(() => {
    deleteStmt.run(req.user.id);
    for (const slot of slots) {
      if (slot.day_of_week == null || !slot.start_time || !slot.end_time) continue;
      insertStmt.run(req.user.id, slot.day_of_week, slot.start_time, slot.end_time);
    }
  });

  tx();

  const rows = db.prepare(
    'SELECT day_of_week, start_time, end_time FROM availability WHERE professional_id = ? ORDER BY day_of_week, start_time',
  ).all(req.user.id);

  res.json(rows);
}));

router.get('/me/bookings', authProfessional, (req, res) => {
  const rows = db.prepare(`
    SELECT * FROM bookings
    WHERE professional_id = ? AND status = 'confirmed'
    ORDER BY date, time
  `).all(req.user.id);
  res.json(rows);
});

module.exports = router;

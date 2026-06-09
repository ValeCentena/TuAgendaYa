const express = require('express');
const { db } = require('../db');
const { authAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(authAdmin);

router.get('/stats', (_req, res) => {
  const professionals = db.prepare('SELECT COUNT(*) as count FROM professionals').get().count;
  const activeProfessionals = db.prepare('SELECT COUNT(*) as count FROM professionals WHERE active = 1').get().count;
  const bookings = db.prepare("SELECT COUNT(*) as count FROM bookings WHERE status = 'confirmed'").get().count;
  const today = new Date().toISOString().split('T')[0];
  const todayBookings = db.prepare(
    "SELECT COUNT(*) as count FROM bookings WHERE date = ? AND status = 'confirmed'",
  ).get(today).count;

  res.json({ professionals, activeProfessionals, bookings, todayBookings });
});

router.get('/professionals', (_req, res) => {
  const rows = db.prepare(`
    SELECT p.id, p.name, p.email, p.specialty, p.slug, p.active, p.created_at,
      (SELECT COUNT(*) FROM bookings b WHERE b.professional_id = p.id AND b.status = 'confirmed') as booking_count
    FROM professionals p
    ORDER BY p.created_at DESC
  `).all();
  res.json(rows);
});

router.patch('/professionals/:id', (req, res) => {
  const { active } = req.body;
  if (active == null) return res.status(400).json({ error: 'Campo active requerido' });

  const result = db.prepare('UPDATE professionals SET active = ? WHERE id = ?').run(active ? 1 : 0, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Profesional no encontrado' });

  res.json({ ok: true });
});

router.delete('/professionals/:id', (req, res) => {
  const result = db.prepare('DELETE FROM professionals WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Profesional no encontrado' });
  res.json({ ok: true });
});

router.get('/bookings', (_req, res) => {
  const rows = db.prepare(`
    SELECT b.*, p.name as professional_name, p.specialty
    FROM bookings b
    JOIN professionals p ON p.id = b.professional_id
    WHERE b.status = 'confirmed'
    ORDER BY b.date DESC, b.time DESC
    LIMIT 100
  `).all();
  res.json(rows);
});

module.exports = router;

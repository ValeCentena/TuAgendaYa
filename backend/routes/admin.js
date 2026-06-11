const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('../db/database');
const { adminAuthMiddleware, signAdminToken } = require('../middleware/adminAuth');

// ── Comparación segura de strings (evita timing attacks) ──────
function safeCompare(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

// ── POST /api/admin/login ─────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' });

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    return res.status(503).json({ error: 'Panel admin no configurado. Agregá ADMIN_EMAIL y ADMIN_PASSWORD al .env' });
  }

  const emailOk = safeCompare(email.toLowerCase().trim(), adminEmail.toLowerCase().trim());
  const passOk = safeCompare(password, adminPassword);

  if (!emailOk || !passOk) {
    return res.status(401).json({ error: 'Credenciales de administrador incorrectas' });
  }

  const token = signAdminToken({ email: adminEmail });
  res.json({ token, admin: { email: adminEmail, role: 'admin' } });
});

// ── GET /api/admin/stats ──────────────────────────────────────
router.get('/stats', adminAuthMiddleware, (req, res) => {
  const totalProfessionals = db.prepare("SELECT COUNT(*) as count FROM professionals").get().count;
  const activeProfessionals = db.prepare("SELECT COUNT(*) as count FROM professionals WHERE status = 'active' OR status IS NULL").get().count;
  const suspendedProfessionals = db.prepare("SELECT COUNT(*) as count FROM professionals WHERE status = 'suspended'").get().count;
  const totalAppointments = db.prepare("SELECT COUNT(*) as count FROM appointments").get().count;
  const totalClients = db.prepare("SELECT COUNT(*) as count FROM clients").get().count;
  const thisMonth = new Date();
  const monthStart = `${thisMonth.getFullYear()}-${String(thisMonth.getMonth() + 1).padStart(2, '0')}-01`;
  const newThisMonth = db.prepare("SELECT COUNT(*) as count FROM professionals WHERE created_at >= ?").get(monthStart).count;

  const recentProfessionals = db.prepare(`
    SELECT id, name, email, profession, slug, plan,
      COALESCE(status, 'active') as status,
      created_at,
      (SELECT COUNT(*) FROM appointments WHERE professional_id = professionals.id) as appointment_count
    FROM professionals
    ORDER BY created_at DESC
    LIMIT 5
  `).all();

  res.json({
    totals: {
      professionals: totalProfessionals,
      active: activeProfessionals,
      suspended: suspendedProfessionals,
      appointments: totalAppointments,
      clients: totalClients,
      new_this_month: newThisMonth,
    },
    recent_professionals: recentProfessionals,
  });
});

// ── GET /api/admin/professionals ──────────────────────────────
router.get('/professionals', adminAuthMiddleware, (req, res) => {
  const { search = '', status = '', page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let where = 'WHERE 1=1';
  const params = [];

  if (search) {
    where += ' AND (p.name LIKE ? OR p.email LIKE ? OR p.profession LIKE ? OR p.slug LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }
  if (status) {
    if (status === 'active') {
      where += " AND (p.status = 'active' OR p.status IS NULL)";
    } else {
      where += " AND p.status = ?";
      params.push(status);
    }
  }

  const professionals = db.prepare(`
    SELECT p.id, p.name, p.email, p.phone, p.profession, p.slug, p.plan,
      COALESCE(p.status, 'active') as status, p.created_at,
      (SELECT COUNT(*) FROM appointments WHERE professional_id = p.id) as appointment_count,
      (SELECT COUNT(*) FROM clients WHERE professional_id = p.id) as client_count
    FROM professionals p
    ${where}
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset);

  const total = db.prepare(`
    SELECT COUNT(*) as count FROM professionals p ${where}
  `).get(...params).count;

  res.json({ professionals, total, page: parseInt(page), limit: parseInt(limit) });
});

// ── GET /api/admin/professionals/:id ─────────────────────────
router.get('/professionals/:id', adminAuthMiddleware, (req, res) => {
  const id = parseInt(req.params.id);
  const professional = db.prepare(`
    SELECT p.*,
      COALESCE(p.status, 'active') as status,
      (SELECT COUNT(*) FROM appointments WHERE professional_id = p.id) as appointment_count,
      (SELECT COUNT(*) FROM clients WHERE professional_id = p.id) as client_count,
      (SELECT COUNT(*) FROM services WHERE professional_id = p.id AND active = 1) as service_count
    FROM professionals p
    WHERE p.id = ?
  `).get(id);

  if (!professional) return res.status(404).json({ error: 'Profesional no encontrado' });

  // Limpiar datos sensibles
  const { password_hash, google_access_token, google_refresh_token, ...safe } = professional;

  const recentAppointments = db.prepare(`
    SELECT a.id, a.client_name, a.client_email, a.start_time, a.status,
      s.name as service_name, s.price as service_price
    FROM appointments a
    JOIN services s ON a.service_id = s.id
    WHERE a.professional_id = ?
    ORDER BY a.start_time DESC
    LIMIT 10
  `).all(id);

  const clients = db.prepare(`
    SELECT id, name, email, phone, total_visits, no_show_count, created_at
    FROM clients WHERE professional_id = ?
    ORDER BY total_visits DESC
    LIMIT 10
  `).all(id);

  const services = db.prepare(`
    SELECT id, name, duration, price, active FROM services
    WHERE professional_id = ? ORDER BY sort_order, name
  `).all(id);

  res.json({ professional: safe, recent_appointments: recentAppointments, clients, services });
});

// ── PATCH /api/admin/professionals/:id/status ─────────────────
router.patch('/professionals/:id/status', adminAuthMiddleware, (req, res) => {
  const id = parseInt(req.params.id);
  const { status } = req.body;

  if (!['active', 'suspended'].includes(status)) {
    return res.status(400).json({ error: 'Estado inválido. Debe ser "active" o "suspended".' });
  }

  const professional = db.prepare('SELECT id, name, email FROM professionals WHERE id = ?').get(id);
  if (!professional) return res.status(404).json({ error: 'Profesional no encontrado' });

  db.prepare('UPDATE professionals SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id);

  res.json({
    message: `Profesional ${status === 'active' ? 'activado' : 'suspendido'} correctamente`,
    professional: { id, name: professional.name, email: professional.email, status },
  });
});

module.exports = router;
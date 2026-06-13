const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const router = express.Router();
const db = require('../db');
const { signToken, authMiddleware } = require('../middleware/auth');

// ── POST /api/auth/register ───────────────────────────────────
router.post('/register', async (req, res) => {
  const { email, password, name, profession, slug } = req.body;

  if (!email || !password || !name || !slug) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  }

  const slugClean = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');

  try {
    const existing = db.prepare('SELECT id FROM professionals WHERE email = ? OR slug = ?').get(email, slugClean);
    if (existing) {
      return res.status(409).json({ error: 'Email o slug ya en uso' });
    }

    const hash = await bcrypt.hash(password, 12);
    const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

    const result = db.prepare(`
      INSERT INTO professionals (email, password_hash, name, profession, slug, avatar_initials)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(email, hash, name, profession || null, slugClean, initials);

    const insertAvail = db.prepare(`
      INSERT INTO availability (professional_id, day_of_week, start_time, end_time)
      VALUES (?, ?, '09:00', '18:00')
    `);
    db.transaction(() => {
      [1, 2, 3, 4, 5].forEach(day => insertAvail.run(result.lastInsertRowid, day));
    })();

    db.prepare(`
      INSERT INTO cancellation_policies (professional_id) VALUES (?)
    `).run(result.lastInsertRowid);

    const professional = db.prepare('SELECT * FROM professionals WHERE id = ?').get(result.lastInsertRowid);
    const token = signToken({ id: professional.id, email: professional.email, slug: professional.slug });

    res.status(201).json({ token, professional: sanitizeProfessional(professional) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' });

  try {
    const professional = db.prepare('SELECT * FROM professionals WHERE email = ?').get(email);
    if (!professional) return res.status(401).json({ error: 'Credenciales inválidas' });

    const valid = await bcrypt.compare(password, professional.password_hash);
    if (!valid) return res.status(401).json({ error: 'Credenciales inválidas' });

    const token = signToken({ id: professional.id, email: professional.email, slug: professional.slug });
    res.json({ token, professional: sanitizeProfessional(professional) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────
router.get('/me', authMiddleware, (req, res) => {
  const professional = db.prepare('SELECT * FROM professionals WHERE id = ?').get(req.professional.id);
  if (!professional) return res.status(404).json({ error: 'No encontrado' });
  res.json(sanitizeProfessional(professional));
});

// ── PUT /api/auth/me ──────────────────────────────────────────
router.put('/me', authMiddleware, async (req, res) => {
  const { name, profession, phone, bio, slug, timezone, slot_duration, buffer_between,
    max_advance_days, min_advance_hours, notify_new_booking, notify_cancellation,
    notify_reminder, reminder_hours_before } = req.body;

  let slugClean = undefined;
  if (slug !== undefined && slug !== null) {
    slugClean = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    if (slugClean.length < 3) return res.status(400).json({ error: 'El link debe tener al menos 3 caracteres' });
    const existing = db.prepare('SELECT id FROM professionals WHERE slug = ? AND id != ?').get(slugClean, req.professional.id);
    if (existing) return res.status(409).json({ error: 'Ese link ya está en uso por otro profesional' });
  }

  const initials = name
    ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : undefined;

  db.prepare(`
    UPDATE professionals SET
      name = COALESCE(?, name),
      profession = COALESCE(?, profession),
      phone = COALESCE(?, phone),
      bio = COALESCE(?, bio),
      slug = COALESCE(?, slug),
      timezone = COALESCE(?, timezone),
      slot_duration = COALESCE(?, slot_duration),
      buffer_between = COALESCE(?, buffer_between),
      max_advance_days = COALESCE(?, max_advance_days),
      min_advance_hours = COALESCE(?, min_advance_hours),
      notify_new_booking = COALESCE(?, notify_new_booking),
      notify_cancellation = COALESCE(?, notify_cancellation),
      notify_reminder = COALESCE(?, notify_reminder),
      reminder_hours_before = COALESCE(?, reminder_hours_before),
      avatar_initials = COALESCE(?, avatar_initials),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    name, profession, phone, bio, slugClean, timezone,
    slot_duration, buffer_between, max_advance_days, min_advance_hours,
    notify_new_booking, notify_cancellation, notify_reminder, reminder_hours_before,
    initials,
    req.professional.id
  );

  const updated = db.prepare('SELECT * FROM professionals WHERE id = ?').get(req.professional.id);
  res.json(sanitizeProfessional(updated));
});

// ── POST /api/auth/change-password ───────────────────────────
router.post('/change-password', authMiddleware, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) return res.status(400).json({ error: 'Faltan campos' });
  if (new_password.length < 8) return res.status(400).json({ error: 'Mínimo 8 caracteres' });

  const prof = db.prepare('SELECT * FROM professionals WHERE id = ?').get(req.professional.id);
  const valid = await bcrypt.compare(current_password, prof.password_hash);
  if (!valid) return res.status(401).json({ error: 'Contraseña actual incorrecta' });

  const hash = await bcrypt.hash(new_password, 12);
  db.prepare('UPDATE professionals SET password_hash = ? WHERE id = ?').run(hash, req.professional.id);
  res.json({ message: 'Contraseña actualizada' });
});

// ── GET /api/auth/check-slug/:slug ────────────────────────────
router.get('/check-slug/:slug', (req, res) => {
  const slug = req.params.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const exists = db.prepare('SELECT id FROM professionals WHERE slug = ?').get(slug);
  res.json({ available: !exists, slug });
});

// ── POST /api/auth/forgot-password ───────────────────────────
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email requerido' });

  try {
    const professional = db.prepare('SELECT * FROM professionals WHERE email = ?').get(email.toLowerCase().trim());
    if (professional) {
      db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE professional_id = ? AND used = 0').run(professional.id);

      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      db.prepare(`
        INSERT INTO password_reset_tokens (professional_id, token, expires_at)
        VALUES (?, ?, ?)
      `).run(professional.id, token, expiresAt);

      // TODO: enviar email con token cuando esté configurado SMTP
      console.log(`[forgot-password] token para ${email}: ${token}`);
    }
    res.json({ message: 'Si el email existe, recibirás un enlace para restablecer tu contraseña.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── POST /api/auth/reset-password ────────────────────────────
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token y contraseña requeridos' });
  if (password.length < 8) return res.status(400).json({ error: 'Mínimo 8 caracteres' });

  try {
    const resetToken = db.prepare(`
      SELECT * FROM password_reset_tokens
      WHERE token = ? AND used = 0 AND expires_at > datetime('now')
    `).get(token);

    if (!resetToken) return res.status(400).json({ error: 'El enlace es inválido o ya expiró.' });

    const hash = await bcrypt.hash(password, 12);
    db.prepare('UPDATE professionals SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(hash, resetToken.professional_id);
    db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE id = ?').run(resetToken.id);

    res.json({ message: 'Contraseña restablecida correctamente. Ya podés ingresar.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

function sanitizeProfessional(p) {
  const { password_hash, google_access_token, google_refresh_token, ...safe } = p;
  return safe;
}

module.exports = router;
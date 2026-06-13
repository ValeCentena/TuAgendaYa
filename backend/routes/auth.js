const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const router = express.Router();
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'tuagendaya-secret-dev-change-in-prod';

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  try {
    const decoded = jwt.verify(header.slice(7), JWT_SECRET);
    req.professional = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

function sanitizeProfessional(p) {
  const { password_hash, google_access_token, google_refresh_token, ...safe } = p;
  return safe;
}

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
    const existing = (await db.query(
      'SELECT id FROM professionals WHERE email = $1 OR slug = $2',
      [email, slugClean]
    )).rows[0];
    if (existing) {
      return res.status(409).json({ error: 'Email o slug ya en uso' });
    }

    const hash = await bcrypt.hash(password, 12);
    const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

    const result = await db.query(
      `INSERT INTO professionals (email, password_hash, name, profession, slug, avatar_initials)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [email, hash, name, profession || null, slugClean, initials]
    );
    const newId = result.rows[0].id;

    for (const day of [1, 2, 3, 4, 5]) {
      await db.query(
        "INSERT INTO availability (professional_id, day_of_week, start_time, end_time) VALUES ($1, $2, '09:00', '18:00')",
        [newId, day]
      );
    }

    await db.query(
      'INSERT INTO cancellation_policies (professional_id) VALUES ($1)',
      [newId]
    );

    const professional = (await db.query(
      'SELECT * FROM professionals WHERE id = $1',
      [newId]
    )).rows[0];

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
    const professional = (await db.query(
      'SELECT * FROM professionals WHERE email = $1',
      [email]
    )).rows[0];
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
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const professional = (await db.query(
      'SELECT * FROM professionals WHERE id = $1',
      [req.professional.id]
    )).rows[0];
    if (!professional) return res.status(404).json({ error: 'No encontrado' });
    res.json(sanitizeProfessional(professional));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── PUT /api/auth/me ──────────────────────────────────────────
router.put('/me', authMiddleware, async (req, res) => {
  const {
    name, profession, phone, bio, slug, timezone,
    slot_duration, buffer_between, max_advance_days, min_advance_hours,
    notify_new_booking, notify_cancellation, notify_reminder, reminder_hours_before,
  } = req.body;

  let slugClean = null;
  if (slug !== undefined && slug !== null) {
    slugClean = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    if (slugClean.length < 3) return res.status(400).json({ error: 'El link debe tener al menos 3 caracteres' });
    const existing = (await db.query(
      'SELECT id FROM professionals WHERE slug = $1 AND id != $2',
      [slugClean, req.professional.id]
    )).rows[0];
    if (existing) return res.status(409).json({ error: 'Ese link ya está en uso por otro profesional' });
  }

  const initials = name
    ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : null;

  try {
    await db.query(
      `UPDATE professionals SET
        name = COALESCE($1, name),
        profession = COALESCE($2, profession),
        phone = COALESCE($3, phone),
        bio = COALESCE($4, bio),
        slug = COALESCE($5, slug),
        timezone = COALESCE($6, timezone),
        slot_duration = COALESCE($7, slot_duration),
        buffer_between = COALESCE($8, buffer_between),
        max_advance_days = COALESCE($9, max_advance_days),
        min_advance_hours = COALESCE($10, min_advance_hours),
        notify_new_booking = COALESCE($11, notify_new_booking),
        notify_cancellation = COALESCE($12, notify_cancellation),
        notify_reminder = COALESCE($13, notify_reminder),
        reminder_hours_before = COALESCE($14, reminder_hours_before),
        avatar_initials = COALESCE($15, avatar_initials),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $16`,
      [
        name ?? null, profession ?? null, phone ?? null, bio ?? null,
        slugClean, timezone ?? null,
        slot_duration ?? null, buffer_between ?? null,
        max_advance_days ?? null, min_advance_hours ?? null,
        notify_new_booking ?? null, notify_cancellation ?? null,
        notify_reminder ?? null, reminder_hours_before ?? null,
        initials,
        req.professional.id,
      ]
    );

    const updated = (await db.query(
      'SELECT * FROM professionals WHERE id = $1',
      [req.professional.id]
    )).rows[0];
    res.json(sanitizeProfessional(updated));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── POST /api/auth/change-password ───────────────────────────
router.post('/change-password', authMiddleware, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) return res.status(400).json({ error: 'Faltan campos' });
  if (new_password.length < 8) return res.status(400).json({ error: 'Mínimo 8 caracteres' });

  try {
    const prof = (await db.query(
      'SELECT * FROM professionals WHERE id = $1',
      [req.professional.id]
    )).rows[0];
    const valid = await bcrypt.compare(current_password, prof.password_hash);
    if (!valid) return res.status(401).json({ error: 'Contraseña actual incorrecta' });

    const hash = await bcrypt.hash(new_password, 12);
    await db.query(
      'UPDATE professionals SET password_hash = $1 WHERE id = $2',
      [hash, req.professional.id]
    );
    res.json({ message: 'Contraseña actualizada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── GET /api/auth/check-slug/:slug ────────────────────────────
router.get('/check-slug/:slug', async (req, res) => {
  try {
    const slug = req.params.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const exists = (await db.query(
      'SELECT id FROM professionals WHERE slug = $1',
      [slug]
    )).rows[0];
    res.json({ available: !exists, slug });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── POST /api/auth/forgot-password ───────────────────────────
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email requerido' });

  try {
    const professional = (await db.query(
      'SELECT * FROM professionals WHERE email = $1',
      [email.toLowerCase().trim()]
    )).rows[0];

    if (professional) {
      await db.query(
        'UPDATE password_reset_tokens SET used = 1 WHERE professional_id = $1 AND used = 0',
        [professional.id]
      );

      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      await db.query(
        'INSERT INTO password_reset_tokens (professional_id, token, expires_at) VALUES ($1, $2, $3)',
        [professional.id, token, expiresAt]
      );

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
    const resetToken = (await db.query(
      'SELECT * FROM password_reset_tokens WHERE token = $1 AND used = 0 AND expires_at > NOW()',
      [token]
    )).rows[0];

    if (!resetToken) return res.status(400).json({ error: 'El enlace es inválido o ya expiró.' });

    const hash = await bcrypt.hash(password, 12);
    await db.query(
      'UPDATE professionals SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hash, resetToken.professional_id]
    );
    await db.query(
      'UPDATE password_reset_tokens SET used = 1 WHERE id = $1',
      [resetToken.id]
    );

    res.json({ message: 'Contraseña restablecida correctamente. Ya podés ingresar.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
const express = require('express');
const bcrypt = require('bcryptjs');
const { db, uniqueSlug } = require('../db');
const { signToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { authLimiter } = require('../middleware/rateLimit');
const { validateRegisterInput, validateLoginInput } = require('../utils/validate');
const { AppError } = require('../utils/errors');
const logger = require('../utils/logger');

const router = express.Router();

const DEFAULT_AVAILABILITY = [
  [1, '09:00', '18:00'],
  [2, '09:00', '18:00'],
  [3, '09:00', '18:00'],
  [4, '09:00', '18:00'],
  [5, '09:00', '17:00'],
];

router.post('/register', authLimiter, asyncHandler((req, res) => {
  const input = validateRegisterInput(req.body);

  const existing = db.prepare('SELECT id FROM professionals WHERE email = ?').get(input.email);
  if (existing) {
    throw new AppError(409, 'Ya existe una cuenta con ese email');
  }

  const slug = uniqueSlug(input.name);
  const hash = bcrypt.hashSync(input.password, 10);

  const insertProf = db.prepare(`
    INSERT INTO professionals (name, email, password_hash, specialty, slug, phone, bio, duration_minutes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertAvail = db.prepare(
    'INSERT INTO availability (professional_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)',
  );

  const tx = db.transaction(() => {
    const result = insertProf.run(
      input.name,
      input.email,
      hash,
      input.specialty,
      slug,
      input.phone,
      input.bio,
      input.durationMinutes,
    );

    for (const [day, start, end] of DEFAULT_AVAILABILITY) {
      insertAvail.run(result.lastInsertRowid, day, start, end);
    }

    return result.lastInsertRowid;
  });

  const id = tx();
  const professional = db.prepare(
    'SELECT id, name, email, specialty, slug, phone, bio, duration_minutes FROM professionals WHERE id = ?',
  ).get(id);

  const token = signToken({ id: professional.id, email: professional.email, role: 'professional' });
  logger.info('Profesional registrado', { professionalId: professional.id, email: professional.email });

  res.status(201).json({ token, professional });
}));

router.post('/login', authLimiter, asyncHandler((req, res) => {
  const { email, password } = validateLoginInput(req.body);

  const professional = db.prepare('SELECT * FROM professionals WHERE email = ? AND active = 1').get(email);
  if (!professional || !bcrypt.compareSync(password, professional.password_hash)) {
    throw new AppError(401, 'Email o contraseña incorrectos');
  }

  const token = signToken({ id: professional.id, email: professional.email, role: 'professional' });

  res.json({
    token,
    professional: {
      id: professional.id,
      name: professional.name,
      email: professional.email,
      specialty: professional.specialty,
      slug: professional.slug,
      phone: professional.phone,
      bio: professional.bio,
      duration_minutes: professional.duration_minutes,
    },
  });
}));

router.post('/admin/login', authLimiter, asyncHandler((req, res) => {
  const { email, password } = validateLoginInput(req.body);

  const admin = db.prepare('SELECT * FROM admins WHERE email = ?').get(email);
  if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
    throw new AppError(401, 'Credenciales de administrador inválidas');
  }

  const token = signToken({ id: admin.id, email: admin.email, role: 'admin' });

  res.json({
    token,
    admin: { id: admin.id, name: admin.name, email: admin.email },
  });
}));

module.exports = router;

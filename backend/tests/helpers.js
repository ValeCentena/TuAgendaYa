const bcrypt = require('bcryptjs');
const { db, initDb } = require('../db');

function resetDatabase() {
  db.exec(`
    DELETE FROM bookings;
    DELETE FROM availability;
    DELETE FROM professionals;
    DELETE FROM admins;
  `);
}

function seedTestProfessional(overrides = {}) {
  const hash = bcrypt.hashSync('test1234', 10);
  const result = db.prepare(`
    INSERT INTO professionals (name, email, password_hash, specialty, slug, phone, bio, duration_minutes, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
  `).run(
    overrides.name || 'Test Profesional',
    overrides.email || 'test@tuagendaya.com',
    hash,
    overrides.specialty || 'Testing',
    overrides.slug || 'test-pro',
    overrides.phone || '+5491111111111',
    overrides.bio || 'Bio de prueba',
    overrides.duration_minutes || 30,
  );

  const professionalId = result.lastInsertRowid;

  const days = overrides.days || [1, 2, 3, 4, 5];
  const insert = db.prepare(
    'INSERT INTO availability (professional_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)',
  );

  for (const day of days) {
    insert.run(professionalId, day, '09:00', '18:00');
  }

  return {
    id: professionalId,
    slug: overrides.slug || 'test-pro',
    email: overrides.email || 'test@tuagendaya.com',
  };
}

function futureWeekday() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  while (date.getDay() === 0 || date.getDay() === 6) {
    date.setDate(date.getDate() + 1);
  }
  return date.toISOString().split('T')[0];
}

function setupTestDb() {
  process.env.NODE_ENV = 'test';
  initDb();
  resetDatabase();
}

module.exports = { resetDatabase, seedTestProfessional, futureWeekday, setupTestDb };

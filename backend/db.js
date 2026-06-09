const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

function resolveDbPath() {
  if (process.env.NODE_ENV === 'test') {
    return ':memory:';
  }
  if (process.env.DATABASE_PATH) {
    return process.env.DATABASE_PATH;
  }
  return path.join(__dirname, 'tuagendaya.db');
}

const dbPath = resolveDbPath();

if (dbPath !== ':memory:') {
  const dir = path.dirname(dbPath);
  fs.mkdirSync(dir, { recursive: true });
}

const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS professionals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      specialty TEXT DEFAULT '',
      slug TEXT UNIQUE NOT NULL,
      phone TEXT DEFAULT '',
      bio TEXT DEFAULT '',
      duration_minutes INTEGER DEFAULT 30,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS availability (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      professional_id INTEGER NOT NULL,
      day_of_week INTEGER NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      FOREIGN KEY (professional_id) REFERENCES professionals(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      professional_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      client_name TEXT NOT NULL,
      client_phone TEXT NOT NULL,
      client_email TEXT DEFAULT '',
      status TEXT DEFAULT 'confirmed',
      reminder_sent INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (professional_id) REFERENCES professionals(id) ON DELETE CASCADE,
      UNIQUE(professional_id, date, time)
    );

    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date, status);
    CREATE INDEX IF NOT EXISTS idx_availability_prof ON availability(professional_id);
  `);

  seedAdmin();
  seedDemoProfessional();
}

function seedAdmin() {
  if (process.env.NODE_ENV === 'test') return;

  const isProd = process.env.NODE_ENV === 'production';
  const email = process.env.ADMIN_EMAIL || (isProd ? null : 'admin@tuagendaya.com');
  const password = process.env.ADMIN_PASSWORD || (isProd ? null : 'admin123');

  if (!email || !password) return;

  const exists = db.prepare('SELECT id FROM admins WHERE email = ?').get(email);
  if (exists) return;

  const hash = bcrypt.hashSync(password, 10);
  db.prepare('INSERT INTO admins (email, password_hash, name) VALUES (?, ?, ?)').run(
    email,
    hash,
    'Administrador',
  );
}

function seedDemoProfessional() {
  if (process.env.NODE_ENV === 'test') return;
  if (process.env.NODE_ENV === 'production' && process.env.SEED_DEMO !== 'true') return;

  const exists = db.prepare('SELECT id FROM professionals WHERE email = ?').get('maria@tuagendaya.com');
  if (exists) return;

  const hash = bcrypt.hashSync('demo123', 10);
  const result = db.prepare(`
    INSERT INTO professionals (name, email, password_hash, specialty, slug, phone, bio, duration_minutes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'Dra. María López',
    'maria@tuagendaya.com',
    hash,
    'Odontología',
    'maria-lopez',
    '+5491112345678',
    'Especialista en odontología general y estética dental.',
    30,
  );

  const defaultAvailability = [
    [1, '09:00', '18:00'],
    [2, '09:00', '18:00'],
    [3, '09:00', '18:00'],
    [4, '09:00', '18:00'],
    [5, '09:00', '17:00'],
  ];

  const insert = db.prepare(
    'INSERT INTO availability (professional_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)',
  );
  for (const [day, start, end] of defaultAvailability) {
    insert.run(result.lastInsertRowid, day, start, end);
  }
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function uniqueSlug(base) {
  let slug = slugify(base);
  let counter = 1;
  while (db.prepare('SELECT id FROM professionals WHERE slug = ?').get(slug)) {
    slug = `${slugify(base)}-${counter++}`;
  }
  return slug;
}

function checkDbHealth() {
  db.prepare('SELECT 1 AS ok').get();
  return { connected: true, path: dbPath === ':memory:' ? 'memory' : dbPath };
}

module.exports = { db, initDb, uniqueSlug, slugify, checkDbHealth, resolveDbPath };

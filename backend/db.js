const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'tuagendaya.db');

const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS professionals (
    id                        INTEGER PRIMARY KEY AUTOINCREMENT,
    email                     TEXT    UNIQUE NOT NULL,
    password_hash             TEXT    NOT NULL,
    name                      TEXT    NOT NULL,
    profession                TEXT,
    slug                      TEXT    UNIQUE NOT NULL,
    phone                     TEXT,
    bio                       TEXT,
    avatar_initials           TEXT,
    plan                      TEXT    DEFAULT 'free',
    status                    TEXT    DEFAULT 'active',
    google_access_token       TEXT,
    google_refresh_token      TEXT,
    google_token_expiry       INTEGER,
    google_calendar_id        TEXT,
    google_sync_enabled       INTEGER DEFAULT 0,
    timezone                  TEXT    DEFAULT 'America/Argentina/Buenos_Aires',
    slot_duration             INTEGER DEFAULT 30,
    buffer_between            INTEGER DEFAULT 0,
    max_advance_days          INTEGER DEFAULT 60,
    min_advance_hours         INTEGER DEFAULT 2,
    notify_new_booking        INTEGER DEFAULT 1,
    notify_cancellation       INTEGER DEFAULT 1,
    notify_reminder           INTEGER DEFAULT 1,
    reminder_hours_before     INTEGER DEFAULT 24,
    created_at                DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at                DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS services (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    professional_id   INTEGER NOT NULL,
    name              TEXT    NOT NULL,
    duration          INTEGER NOT NULL,
    price             REAL    DEFAULT 0,
    description       TEXT,
    color             TEXT    DEFAULT '#0071e3',
    active            INTEGER DEFAULT 1,
    sort_order        INTEGER DEFAULT 0,
    created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (professional_id) REFERENCES professionals(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS availability (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    professional_id   INTEGER NOT NULL,
    day_of_week       INTEGER NOT NULL,
    start_time        TEXT    NOT NULL,
    end_time          TEXT    NOT NULL,
    active            INTEGER DEFAULT 1,
    FOREIGN KEY (professional_id) REFERENCES professionals(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS availability_exceptions (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    professional_id   INTEGER NOT NULL,
    date              TEXT    NOT NULL,
    start_time        TEXT,
    end_time          TEXT,
    reason            TEXT,
    FOREIGN KEY (professional_id) REFERENCES professionals(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS clients (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    professional_id    INTEGER NOT NULL,
    name               TEXT    NOT NULL,
    email              TEXT,
    phone              TEXT,
    private_notes      TEXT,
    no_show_count      INTEGER DEFAULT 0,
    cancellation_count INTEGER DEFAULT 0,
    total_visits       INTEGER DEFAULT 0,
    total_spent        REAL    DEFAULT 0,
    tags               TEXT,
    created_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (professional_id) REFERENCES professionals(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    professional_id         INTEGER NOT NULL,
    client_id               INTEGER,
    service_id              INTEGER NOT NULL,
    client_name             TEXT    NOT NULL,
    client_email            TEXT,
    client_phone            TEXT,
    client_notes            TEXT,
    start_time              DATETIME NOT NULL,
    end_time                DATETIME NOT NULL,
    status                  TEXT    DEFAULT 'pending',
    cancellation_reason     TEXT,
    cancelled_by            TEXT,
    cancelled_at            DATETIME,
    cancellation_fee_applied INTEGER DEFAULT 0,
    cancellation_fee_amount  REAL DEFAULT 0,
    confirmed_at            DATETIME,
    completed_at            DATETIME,
    no_show_at              DATETIME,
    no_show_notified        INTEGER DEFAULT 0,
    rescheduled_from_id     INTEGER,
    rescheduled_at          DATETIME,
    google_event_id         TEXT,
    google_sync_at          DATETIME,
    payment_status          TEXT    DEFAULT 'unpaid',
    payment_amount          REAL    DEFAULT 0,
    payment_method          TEXT,
    payment_id              TEXT,
    public_token            TEXT    UNIQUE,
    source                  TEXT    DEFAULT 'web',
    created_at              DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at              DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (professional_id) REFERENCES professionals(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id)       REFERENCES clients(id)       ON DELETE SET NULL,
    FOREIGN KEY (service_id)      REFERENCES services(id)      ON DELETE RESTRICT
  );

  CREATE TABLE IF NOT EXISTS cancellation_policies (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    professional_id     INTEGER NOT NULL UNIQUE,
    enabled             INTEGER DEFAULT 0,
    hours_before        INTEGER DEFAULT 24,
    fee_type            TEXT    DEFAULT 'none',
    fee_fixed_amount    REAL    DEFAULT 0,
    fee_percentage      INTEGER DEFAULT 0,
    policy_text         TEXT,
    show_on_booking     INTEGER DEFAULT 1,
    updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (professional_id) REFERENCES professionals(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS appointment_history (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    appointment_id    INTEGER NOT NULL,
    professional_id   INTEGER NOT NULL,
    action            TEXT    NOT NULL,
    old_status        TEXT,
    new_status        TEXT,
    old_start_time    DATETIME,
    new_start_time    DATETIME,
    note              TEXT,
    performed_by      TEXT    DEFAULT 'professional',
    created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    professional_id   INTEGER NOT NULL,
    token             TEXT    UNIQUE NOT NULL,
    expires_at        DATETIME NOT NULL,
    used              INTEGER DEFAULT 0,
    created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (professional_id) REFERENCES professionals(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    professional_id   INTEGER NOT NULL,
    client_name       TEXT    NOT NULL,
    client_phone      TEXT,
    comment           TEXT,
    status            TEXT    DEFAULT 'pending',
    created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (professional_id) REFERENCES professionals(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_appointments_professional_time
    ON appointments(professional_id, start_time);
  CREATE INDEX IF NOT EXISTS idx_appointments_status
    ON appointments(professional_id, status);
  CREATE INDEX IF NOT EXISTS idx_appointments_public_token
    ON appointments(public_token);
  CREATE INDEX IF NOT EXISTS idx_clients_professional
    ON clients(professional_id);
  CREATE INDEX IF NOT EXISTS idx_availability_professional
    ON availability(professional_id, day_of_week);
  CREATE INDEX IF NOT EXISTS idx_bookings_professional
    ON bookings(professional_id);
`);

console.log('✓ Base de datos lista:', DB_PATH);

module.exports = db;
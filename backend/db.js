const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS professionals (
        id                        SERIAL PRIMARY KEY,
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
        created_at                TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at                TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS services (
        id                SERIAL PRIMARY KEY,
        professional_id   INTEGER NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
        name              TEXT    NOT NULL,
        duration          INTEGER NOT NULL,
        price             NUMERIC DEFAULT 0,
        description       TEXT,
        color             TEXT    DEFAULT '#0071e3',
        active            INTEGER DEFAULT 1,
        sort_order        INTEGER DEFAULT 0,
        created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS availability (
        id                SERIAL PRIMARY KEY,
        professional_id   INTEGER NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
        day_of_week       INTEGER NOT NULL,
        start_time        TEXT    NOT NULL,
        end_time          TEXT    NOT NULL,
        active            INTEGER DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS availability_exceptions (
        id                SERIAL PRIMARY KEY,
        professional_id   INTEGER NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
        date              TEXT    NOT NULL,
        start_time        TEXT,
        end_time          TEXT,
        reason            TEXT
      );

      CREATE TABLE IF NOT EXISTS clients (
        id                 SERIAL PRIMARY KEY,
        professional_id    INTEGER NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
        name               TEXT    NOT NULL,
        email              TEXT,
        phone              TEXT,
        private_notes      TEXT,
        no_show_count      INTEGER DEFAULT 0,
        cancellation_count INTEGER DEFAULT 0,
        total_visits       INTEGER DEFAULT 0,
        total_spent        NUMERIC DEFAULT 0,
        tags               TEXT,
        created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS appointments (
        id                       SERIAL PRIMARY KEY,
        professional_id          INTEGER NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
        client_id                INTEGER REFERENCES clients(id) ON DELETE SET NULL,
        service_id               INTEGER NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
        client_name              TEXT    NOT NULL,
        client_email             TEXT,
        client_phone             TEXT,
        client_notes             TEXT,
        start_time               TIMESTAMP NOT NULL,
        end_time                 TIMESTAMP NOT NULL,
        status                   TEXT    DEFAULT 'pending',
        cancellation_reason      TEXT,
        cancelled_by             TEXT,
        cancelled_at             TIMESTAMP,
        cancellation_fee_applied INTEGER DEFAULT 0,
        cancellation_fee_amount  NUMERIC DEFAULT 0,
        confirmed_at             TIMESTAMP,
        completed_at             TIMESTAMP,
        no_show_at               TIMESTAMP,
        no_show_notified         INTEGER DEFAULT 0,
        rescheduled_from_id      INTEGER,
        rescheduled_at           TIMESTAMP,
        google_event_id          TEXT,
        google_sync_at           TIMESTAMP,
        payment_status           TEXT    DEFAULT 'unpaid',
        payment_amount           NUMERIC DEFAULT 0,
        payment_method           TEXT,
        payment_id               TEXT,
        public_token             TEXT    UNIQUE,
        source                   TEXT    DEFAULT 'web',
        created_at               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at               TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS cancellation_policies (
        id                  SERIAL PRIMARY KEY,
        professional_id     INTEGER NOT NULL UNIQUE REFERENCES professionals(id) ON DELETE CASCADE,
        enabled             INTEGER DEFAULT 0,
        hours_before        INTEGER DEFAULT 24,
        fee_type            TEXT    DEFAULT 'none',
        fee_fixed_amount    NUMERIC DEFAULT 0,
        fee_percentage      INTEGER DEFAULT 0,
        policy_text         TEXT,
        show_on_booking     INTEGER DEFAULT 1,
        updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS appointment_history (
        id                SERIAL PRIMARY KEY,
        appointment_id    INTEGER NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
        professional_id   INTEGER NOT NULL,
        action            TEXT    NOT NULL,
        old_status        TEXT,
        new_status        TEXT,
        old_start_time    TIMESTAMP,
        new_start_time    TIMESTAMP,
        note              TEXT,
        performed_by      TEXT    DEFAULT 'professional',
        created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id                SERIAL PRIMARY KEY,
        professional_id   INTEGER NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
        token             TEXT    UNIQUE NOT NULL,
        expires_at        TIMESTAMP NOT NULL,
        used              INTEGER DEFAULT 0,
        created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS bookings (
        id                SERIAL PRIMARY KEY,
        professional_id   INTEGER NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
        client_name       TEXT    NOT NULL,
        client_phone      TEXT,
        comment           TEXT,
        status            TEXT    DEFAULT 'pending',
        booking_date      DATE,
        start_time        TIME,
        end_time          TIME,
        created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

    // Agregar columnas nuevas si la tabla bookings ya existía sin ellas
    await client.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_date DATE;`);
    await client.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS start_time TIME;`);
    await client.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS end_time TIME;`);

    console.log('✓ Base de datos PostgreSQL lista');
  } finally {
    client.release();
  }
}

initDB().catch(err => {
  console.error('Error inicializando la base de datos:', err);
  process.exit(1);
});

module.exports = pool;
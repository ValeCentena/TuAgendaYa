const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

async function initDB() {
  const client = await pool.connect();
  try {

    // ── Tablas principales ────────────────────────────────────────
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
        allow_client_cancellations INTEGER DEFAULT 1,
        cancellation_limit_minutes INTEGER DEFAULT 0,
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

      CREATE TABLE IF NOT EXISTS blocked_times (
        id                SERIAL PRIMARY KEY,
        professional_id   INTEGER NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
        staff_id          INTEGER,
        block_date        DATE    NOT NULL,
        start_time        TIME,
        end_time          TIME,
        is_full_day       BOOLEAN DEFAULT FALSE,
        reason            TEXT,
        created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
        payment_status    TEXT    DEFAULT 'pending',
        payment_method    TEXT    DEFAULT 'cash',
        amount_paid       NUMERIC(10, 2) DEFAULT 0,
        payment_updated_at TIMESTAMP,
        confirmation_token TEXT,
        client_confirmed_at TIMESTAMP,
        client_cancelled_at TIMESTAMP,
        updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        booking_date      DATE,
        start_time        TIME,
        end_time          TIME,
        service_id        INTEGER,
        staff_id          INTEGER,
        reminder_2h_sent_at       TIMESTAMP,
        reminder_2h_attempted_at  TIMESTAMP,
        reminder_2h_error         TEXT,
        created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS professional_availability (
        id                     SERIAL PRIMARY KEY,
        professional_id        INTEGER NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
        day_of_week            INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
        is_active              INTEGER NOT NULL DEFAULT 1,
        start_time             TIME    NOT NULL DEFAULT '09:00',
        end_time               TIME    NOT NULL DEFAULT '18:00',
        slot_duration_minutes  INTEGER NOT NULL DEFAULT 30,
        break_enabled          INTEGER NOT NULL DEFAULT 0,
        break_start            TIME,
        break_end              TIME,
        created_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (professional_id, day_of_week)
      );

      CREATE TABLE IF NOT EXISTS professional_services (
        id                SERIAL PRIMARY KEY,
        professional_id   INTEGER NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
        name              TEXT    NOT NULL,
        description       TEXT,
        duration_minutes  INTEGER NOT NULL DEFAULT 30,
        price             NUMERIC DEFAULT 0,
        is_active         INTEGER NOT NULL DEFAULT 1,
        created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS staff_members (
        id                SERIAL PRIMARY KEY,
        professional_id   INTEGER NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
        name              TEXT    NOT NULL,
        specialty         TEXT,
        avatar_initials   TEXT,
        is_active         INTEGER NOT NULL DEFAULT 1,
        created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );



      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id                SERIAL PRIMARY KEY,
        professional_id   INTEGER NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
        endpoint          TEXT    UNIQUE NOT NULL,
        p256dh            TEXT    NOT NULL,
        auth              TEXT    NOT NULL,
        user_agent        TEXT,
        created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS staff_availability (
        id                    SERIAL PRIMARY KEY,
        staff_id              INTEGER NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
        day_of_week           INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
        is_active             INTEGER NOT NULL DEFAULT 1,
        start_time            TIME    NOT NULL DEFAULT '09:00',
        end_time              TIME    NOT NULL DEFAULT '18:00',
        slot_duration_minutes INTEGER NOT NULL DEFAULT 30,
        created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (staff_id, day_of_week)
      );
    `);

    // ── Índices — cada uno en su propia llamada para que un fallo
    //   no interrumpa el resto del init ────────────────────────────
    const indices = [
      `CREATE INDEX IF NOT EXISTS idx_appointments_professional_time ON appointments(professional_id, start_time)`,
      `CREATE INDEX IF NOT EXISTS idx_appointments_status            ON appointments(professional_id, status)`,
      `CREATE INDEX IF NOT EXISTS idx_appointments_public_token      ON appointments(public_token)`,
      `CREATE INDEX IF NOT EXISTS idx_clients_professional           ON clients(professional_id)`,
      `CREATE INDEX IF NOT EXISTS idx_bookings_professional          ON bookings(professional_id)`,
      `CREATE INDEX IF NOT EXISTS idx_bookings_reminder_2h            ON bookings(reminder_2h_sent_at, booking_date, start_time)`,
      `CREATE INDEX IF NOT EXISTS idx_staff_availability_member      ON staff_availability(staff_id)`,
      `CREATE INDEX IF NOT EXISTS idx_push_subscriptions_professional ON push_subscriptions(professional_id)`,
      `ALTER TABLE professionals ADD COLUMN IF NOT EXISTS allow_client_cancellations INTEGER DEFAULT 1`,
      `ALTER TABLE professionals ADD COLUMN IF NOT EXISTS cancellation_limit_minutes INTEGER DEFAULT 0`,
      `CREATE INDEX IF NOT EXISTS idx_blocked_times_professional_date ON blocked_times(professional_id, block_date)`,
      `CREATE INDEX IF NOT EXISTS idx_plan_payments_mp_payment_id ON plan_payments(mp_payment_id)`,
    ];

    for (const sql of indices) {
      try {
        await client.query(sql);
      } catch (e) {
        console.warn('Index creation skipped (tabla o columna no disponible):', e.message);
      }
    }

    // ── Migraciones seguras — columnas añadidas después del deploy inicial ──

    await client.query(`
      CREATE TABLE IF NOT EXISTS plan_payments (
        id                  SERIAL PRIMARY KEY,
        professional_id     INTEGER NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
        method              TEXT NOT NULL DEFAULT 'transfer',
        status              TEXT NOT NULL DEFAULT 'pending',
        amount              NUMERIC(10, 2) DEFAULT 0,
        currency            TEXT DEFAULT 'UYU',
        plan                TEXT DEFAULT 'base',
        period_days         INTEGER DEFAULT 30,
        mp_preference_id    TEXT,
        mp_payment_id       TEXT,
        checkout_url        TEXT,
        transfer_reference  TEXT,
        transfer_note       TEXT,
        raw_payload         JSONB,
        approved_at         TIMESTAMP,
        expires_at          TIMESTAMP,
        created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const migrations = [
      // bookings
      `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_date DATE`,
      `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS start_time  TIME`,
      `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS end_time    TIME`,
      `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_id  INTEGER`,
      `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS staff_id    INTEGER`,
      `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminder_2h_sent_at TIMESTAMP`,
      `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminder_2h_attempted_at TIMESTAMP`,
      `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminder_2h_error TEXT`,
      `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending'`,
      `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash'`,
      `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(10, 2) DEFAULT 0`,
      `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_updated_at TIMESTAMP`,
      `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS confirmation_token TEXT`,
      `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS client_confirmed_at TIMESTAMP`,
      `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS client_cancelled_at TIMESTAMP`,
      `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
      // professionals
      `ALTER TABLE professionals ADD COLUMN IF NOT EXISTS business_name TEXT`,
      `ALTER TABLE professionals ADD COLUMN IF NOT EXISTS address       TEXT`,
      `ALTER TABLE professionals ADD COLUMN IF NOT EXISTS logo_url      TEXT`,
      // professional_availability — pausas
      `ALTER TABLE professional_availability ADD COLUMN IF NOT EXISTS break_enabled INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE professional_availability ADD COLUMN IF NOT EXISTS break_start   TIME`,
      `ALTER TABLE professional_availability ADD COLUMN IF NOT EXISTS break_end     TIME`,
      // staff_availability — columna oficial usada por el panel y la reserva pública
      `ALTER TABLE staff_availability ADD COLUMN IF NOT EXISTS staff_id INTEGER`,
      `ALTER TABLE staff_availability ADD COLUMN IF NOT EXISTS slot_duration_minutes INTEGER NOT NULL DEFAULT 30`,
      `UPDATE staff_availability SET staff_id = staff_member_id WHERE staff_id IS NULL`,

      // billing / plan payments
      `ALTER TABLE professionals ADD COLUMN IF NOT EXISTS plan_payment_status TEXT DEFAULT 'pending'`,
      `ALTER TABLE professionals ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMP`,
      `ALTER TABLE professionals ADD COLUMN IF NOT EXISTS last_payment_at TIMESTAMP`,
      `ALTER TABLE professionals ADD COLUMN IF NOT EXISTS billing_method TEXT`,
      `ALTER TABLE professionals ADD COLUMN IF NOT EXISTS plan_price NUMERIC(10, 2) DEFAULT 0`,
      `ALTER TABLE professionals ADD COLUMN IF NOT EXISTS plan_currency TEXT DEFAULT 'UYU'`,
      `ALTER TABLE plan_payments ADD COLUMN IF NOT EXISTS seen_by_admin BOOLEAN DEFAULT FALSE`,
      `ALTER TABLE plan_payments ADD COLUMN IF NOT EXISTS notified_at TIMESTAMP`,
      `ALTER TABLE plan_payments ADD COLUMN IF NOT EXISTS mp_status TEXT`,
      `ALTER TABLE plan_payments ADD COLUMN IF NOT EXISTS mp_status_detail TEXT`,
      `ALTER TABLE plan_payments ADD COLUMN IF NOT EXISTS webhook_event_id TEXT`,
      `ALTER TABLE plan_payments ADD COLUMN IF NOT EXISTS webhook_signature_validated BOOLEAN DEFAULT FALSE`,
      // push_subscriptions
      `ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS user_agent TEXT`,
    ];

    for (const sql of migrations) {
      try {
        await client.query(sql);
      } catch (e) {
        console.warn('Migration skipped:', e.message);
      }
    }

    try {
      await client.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_availability_staff_day
        ON staff_availability (staff_id, day_of_week)
        WHERE staff_id IS NOT NULL
      `);
    } catch (e) {
      console.warn('Staff availability index skipped:', e.message);
    }

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
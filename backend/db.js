const { Pool } = require("pg");
require("dotenv").config();

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL no está configurada.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

async function initDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS professionals (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        business_name TEXT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        phone TEXT,
        profession TEXT,
        address TEXT,
        slug TEXT UNIQUE NOT NULL,
        logo_url TEXT,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`ALTER TABLE professionals ADD COLUMN IF NOT EXISTS name TEXT;`);
    await pool.query(`ALTER TABLE professionals ADD COLUMN IF NOT EXISTS business_name TEXT;`);
    await pool.query(`ALTER TABLE professionals ADD COLUMN IF NOT EXISTS email TEXT;`);
    await pool.query(`ALTER TABLE professionals ADD COLUMN IF NOT EXISTS password_hash TEXT;`);
    await pool.query(`ALTER TABLE professionals ADD COLUMN IF NOT EXISTS phone TEXT;`);
    await pool.query(`ALTER TABLE professionals ADD COLUMN IF NOT EXISTS profession TEXT;`);
    await pool.query(`ALTER TABLE professionals ADD COLUMN IF NOT EXISTS address TEXT;`);
    await pool.query(`ALTER TABLE professionals ADD COLUMN IF NOT EXISTS slug TEXT;`);
    await pool.query(`ALTER TABLE professionals ADD COLUMN IF NOT EXISTS logo_url TEXT;`);
    await pool.query(`ALTER TABLE professionals ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';`);
    await pool.query(`ALTER TABLE professionals ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();`);
    await pool.query(`ALTER TABLE professionals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();`);

    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_professionals_email_unique
      ON professionals (email);
    `);

    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_professionals_slug_unique
      ON professionals (slug);
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS professional_services (
        id SERIAL PRIMARY KEY,
        professional_id INTEGER NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        duration_minutes INTEGER NOT NULL DEFAULT 30,
        price NUMERIC(10, 2),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`ALTER TABLE professional_services ADD COLUMN IF NOT EXISTS professional_id INTEGER;`);
    await pool.query(`ALTER TABLE professional_services ADD COLUMN IF NOT EXISTS name TEXT;`);
    await pool.query(`ALTER TABLE professional_services ADD COLUMN IF NOT EXISTS description TEXT;`);
    await pool.query(`ALTER TABLE professional_services ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 30;`);
    await pool.query(`ALTER TABLE professional_services ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2);`);
    await pool.query(`ALTER TABLE professional_services ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;`);
    await pool.query(`ALTER TABLE professional_services ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();`);
    await pool.query(`ALTER TABLE professional_services ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();`);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_professional_services_professional
      ON professional_services (professional_id);
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS professional_availability (
        id SERIAL PRIMARY KEY,
        professional_id INTEGER NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
        day_of_week INTEGER NOT NULL,
        is_active BOOLEAN DEFAULT false,
        start_time TIME DEFAULT '09:00',
        end_time TIME DEFAULT '18:00',
        slot_duration_minutes INTEGER DEFAULT 30,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`ALTER TABLE professional_availability ADD COLUMN IF NOT EXISTS professional_id INTEGER;`);
    await pool.query(`ALTER TABLE professional_availability ADD COLUMN IF NOT EXISTS day_of_week INTEGER;`);
    await pool.query(`ALTER TABLE professional_availability ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;`);
    await pool.query(`ALTER TABLE professional_availability ADD COLUMN IF NOT EXISTS start_time TIME DEFAULT '09:00';`);
    await pool.query(`ALTER TABLE professional_availability ADD COLUMN IF NOT EXISTS end_time TIME DEFAULT '18:00';`);
    await pool.query(`ALTER TABLE professional_availability ADD COLUMN IF NOT EXISTS slot_duration_minutes INTEGER DEFAULT 30;`);
    await pool.query(`ALTER TABLE professional_availability ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();`);
    await pool.query(`ALTER TABLE professional_availability ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();`);

    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_professional_availability_unique
      ON professional_availability (professional_id, day_of_week);
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS staff_members (
        id SERIAL PRIMARY KEY,
        owner_professional_id INTEGER NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        color TEXT DEFAULT '#0071e3',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS owner_professional_id INTEGER;`);
    await pool.query(`ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS name TEXT;`);
    await pool.query(`ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS phone TEXT;`);
    await pool.query(`ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS email TEXT;`);
    await pool.query(`ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#0071e3';`);
    await pool.query(`ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;`);
    await pool.query(`ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();`);
    await pool.query(`ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();`);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_staff_members_owner
      ON staff_members (owner_professional_id);
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS staff_availability (
        id SERIAL PRIMARY KEY,
        staff_id INTEGER NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
        day_of_week INTEGER NOT NULL,
        is_active BOOLEAN DEFAULT false,
        start_time TIME DEFAULT '09:00',
        end_time TIME DEFAULT '18:00',
        slot_duration_minutes INTEGER DEFAULT 30,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`ALTER TABLE staff_availability ADD COLUMN IF NOT EXISTS staff_id INTEGER;`);
    await pool.query(`ALTER TABLE staff_availability ADD COLUMN IF NOT EXISTS day_of_week INTEGER;`);
    await pool.query(`ALTER TABLE staff_availability ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;`);
    await pool.query(`ALTER TABLE staff_availability ADD COLUMN IF NOT EXISTS start_time TIME DEFAULT '09:00';`);
    await pool.query(`ALTER TABLE staff_availability ADD COLUMN IF NOT EXISTS end_time TIME DEFAULT '18:00';`);
    await pool.query(`ALTER TABLE staff_availability ADD COLUMN IF NOT EXISTS slot_duration_minutes INTEGER DEFAULT 30;`);
    await pool.query(`ALTER TABLE staff_availability ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();`);
    await pool.query(`ALTER TABLE staff_availability ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();`);

    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_availability_unique
      ON staff_availability (staff_id, day_of_week);
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        professional_id INTEGER NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
        staff_id INTEGER,
        service_id INTEGER,
        client_name TEXT NOT NULL,
        client_phone TEXT NOT NULL,
        comment TEXT,
        booking_date DATE,
        start_time TIME,
        end_time TIME,
        status TEXT DEFAULT 'pending',
        confirmation_token TEXT,
        client_confirmed_at TIMESTAMP,
        client_cancelled_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS professional_id INTEGER;`);
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS staff_id INTEGER;`);
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_id INTEGER;`);
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS client_name TEXT;`);
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS client_phone TEXT;`);
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS comment TEXT;`);
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_date DATE;`);
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS start_time TIME;`);
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS end_time TIME;`);
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';`);
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS confirmation_token TEXT;`);
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS client_confirmed_at TIMESTAMP;`);
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS client_cancelled_at TIMESTAMP;`);
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();`);
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();`);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_bookings_professional
      ON bookings (professional_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_bookings_staff
      ON bookings (staff_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_bookings_date
      ON bookings (booking_date);
    `);

    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_confirmation_token_unique
      ON bookings (confirmation_token)
      WHERE confirmation_token IS NOT NULL;
    `);

    console.log("✅ Base de datos Postgres inicializada correctamente.");
  } catch (error) {
    console.error("❌ Error inicializando la base de datos:", error);
    process.exit(1);
  }
}

initDb();

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
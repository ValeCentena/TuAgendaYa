const { Pool } = require('pg');
require('dotenv').config();

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL no está configurada.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === 'production'
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
        slug TEXT UNIQUE NOT NULL,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        professional_id INTEGER NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
        service_id INTEGER,
        client_name TEXT NOT NULL,
        client_phone TEXT NOT NULL,
        comment TEXT,
        booking_date DATE,
        start_time TIME,
        end_time TIME,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
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

    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_professional_availability_unique
      ON professional_availability (professional_id, day_of_week);
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

    await pool.query(`
      ALTER TABLE bookings
      ADD COLUMN IF NOT EXISTS service_id INTEGER;
    `);

    await pool.query(`
      ALTER TABLE bookings
      ADD COLUMN IF NOT EXISTS booking_date DATE;
    `);

    await pool.query(`
      ALTER TABLE bookings
      ADD COLUMN IF NOT EXISTS start_time TIME;
    `);

    await pool.query(`
      ALTER TABLE bookings
      ADD COLUMN IF NOT EXISTS end_time TIME;
    `);

    await pool.query(`
      ALTER TABLE bookings
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
    `);

    await pool.query(`
      ALTER TABLE professional_services
      ADD COLUMN IF NOT EXISTS description TEXT;
    `);

    await pool.query(`
      ALTER TABLE professional_services
      ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 30;
    `);

    await pool.query(`
      ALTER TABLE professional_services
      ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2);
    `);

    await pool.query(`
      ALTER TABLE professional_services
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
    `);

    await pool.query(`
      ALTER TABLE professional_services
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
    `);

    console.log('✅ Base de datos Postgres inicializada correctamente.');
  } catch (error) {
    console.error('❌ Error inicializando Postgres:', error);
    process.exit(1);
  }
}

initDb();

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
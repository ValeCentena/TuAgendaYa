const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  console.error("❌ Falta DATABASE_URL.");
  console.error('Ejemplo: DATABASE_URL="postgresql://..." node backend/scripts/resetDatabase.js');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function resetDatabase() {
  try {
    console.log("🧹 Borrando datos de prueba...");

    await pool.query(`
      TRUNCATE TABLE
        bookings,
        staff_availability,
        staff_members,
        professional_availability,
        professional_services,
        professionals
      RESTART IDENTITY CASCADE;
    `);

    console.log("✅ Base limpiada correctamente.");
    console.log("✅ Ya podés crear perfiles nuevos para testear.");
  } catch (error) {
    console.error("❌ Error limpiando la base:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

resetDatabase();
const db = require("../db");
const { sendReminder } = require("./whatsapp");
const { sendPushToProfessional } = require("./push");

const DEFAULT_TIMEZONE = process.env.DEFAULT_TIMEZONE || "America/Montevideo";
const REMINDER_INTERVAL_MS = Number(process.env.REMINDER_WORKER_INTERVAL_MS || 60_000);
const REMINDER_WINDOW_MINUTES = Number(process.env.REMINDER_WINDOW_MINUTES || 120);
const REMINDER_MIN_AHEAD_MINUTES = Number(process.env.REMINDER_MIN_AHEAD_MINUTES || 90);
const REMINDER_BATCH_LIMIT = Number(process.env.REMINDER_BATCH_LIMIT || 25);

let reminderTimer = null;
let reminderRunning = false;

function normalizeDate(value) {
  return String(value || "").slice(0, 10);
}

function normalizeTime(value) {
  return String(value || "").slice(0, 5);
}

function getBookingValue(booking, ...keys) {
  for (const key of keys) {
    if (
      booking &&
      booking[key] !== undefined &&
      booking[key] !== null &&
      booking[key] !== ""
    ) {
      return booking[key];
    }
  }

  return "";
}

async function ensureReminderColumns() {
  await db.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminder_2h_sent_at TIMESTAMP;`);
  await db.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminder_2h_attempted_at TIMESTAMP;`);
  await db.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminder_2h_error TEXT;`);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_bookings_reminder_2h
    ON bookings (reminder_2h_sent_at, booking_date, start_time);
  `);
}

function buildProfessionalFromRow(row) {
  return {
    id: row.professional_id,
    name: row.professional_name,
    business_name: row.business_name,
    businessName: row.business_name,
    phone: row.professional_phone,
    timezone: row.professional_timezone,
  };
}

function buildBookingFromRow(row) {
  return {
    ...row,
    clientName: row.client_name,
    clientPhone: row.client_phone,
    bookingDate: normalizeDate(row.booking_date),
    startTime: normalizeTime(row.start_time),
    endTime: normalizeTime(row.end_time),
    serviceName: row.service_name || "Servicio",
    staffName: row.staff_name || "",
    businessName: row.business_name || row.professional_name || "TuAgendaYa",
  };
}

async function getDueReminderBookings(limit = REMINDER_BATCH_LIMIT) {
  await ensureReminderColumns();

  const result = await db.query(
    `
    SELECT
      b.*,
      ps.name AS service_name,
      ps.duration_minutes AS service_duration_minutes,
      ps.price AS service_price,
      sm.name AS staff_name,
      p.name AS professional_name,
      p.business_name AS business_name,
      p.phone AS professional_phone,
      COALESCE(NULLIF(p.timezone, ''), $1) AS professional_timezone
    FROM bookings b
    INNER JOIN professionals p ON p.id = b.professional_id
    LEFT JOIN professional_services ps ON ps.id = b.service_id
    LEFT JOIN staff_members sm ON sm.id = b.staff_id
    WHERE b.reminder_2h_sent_at IS NULL
      AND b.booking_date IS NOT NULL
      AND b.start_time IS NOT NULL
      AND COALESCE(b.status, 'pending') IN ('pending', 'confirmed')
      AND (b.booking_date + b.start_time) >
        (NOW() AT TIME ZONE COALESCE(NULLIF(p.timezone, ''), $1)) + ($2::text || ' minutes')::interval
      AND (b.booking_date + b.start_time) <=
        (NOW() AT TIME ZONE COALESCE(NULLIF(p.timezone, ''), $1)) + ($3::text || ' minutes')::interval
    ORDER BY b.booking_date ASC, b.start_time ASC, b.id ASC
    LIMIT $4
    `,
    [DEFAULT_TIMEZONE, REMINDER_MIN_AHEAD_MINUTES, REMINDER_WINDOW_MINUTES, limit]
  );

  return result.rows;
}

async function markReminderProcessed(bookingId, errorMessage = null) {
  await db.query(
    `
    UPDATE bookings
    SET
      reminder_2h_sent_at = NOW(),
      reminder_2h_attempted_at = NOW(),
      reminder_2h_error = $2,
      updated_at = NOW()
    WHERE id = $1
      AND reminder_2h_sent_at IS NULL
    `,
    [bookingId, errorMessage ? String(errorMessage).slice(0, 500) : null]
  );
}

async function processBookingReminder(row) {
  const booking = buildBookingFromRow(row);
  const professional = buildProfessionalFromRow(row);

  const results = {
    bookingId: row.id,
    whatsapp: { attempted: false, sent: false },
    push: { attempted: false, sent: 0 },
  };

  const errors = [];

  try {
    results.whatsapp = await sendReminder(booking, professional);
    results.whatsapp.attempted = true;
    results.whatsapp.sent = !results.whatsapp.skipped;
  } catch (error) {
    results.whatsapp = {
      attempted: true,
      sent: false,
      error: error.message || "No se pudo enviar recordatorio por WhatsApp",
    };
    errors.push(`WhatsApp: ${results.whatsapp.error}`);
  }

  try {
    results.push = await sendPushToProfessional(row.professional_id, {
      title: "Recordatorio de turno",
      body: `${getBookingValue(booking, "client_name", "clientName") || "Cliente"} tiene turno a las ${normalizeTime(row.start_time)}`,
      icon: "/tuagendaya-logo.png",
      badge: "/tuagendaya-logo.png",
      url: "/profesional/dashboard",
      bookingId: row.id,
      clientName: getBookingValue(booking, "client_name", "clientName") || "Cliente",
      serviceName: booking.serviceName || "Servicio",
      bookingDate: normalizeDate(row.booking_date),
      startTime: normalizeTime(row.start_time),
      type: "booking_reminder_2h",
    });
  } catch (error) {
    results.push = {
      attempted: true,
      sent: 0,
      error: error.message || "No se pudo enviar push",
    };
    errors.push(`Push: ${results.push.error}`);
  }

  await markReminderProcessed(row.id, errors.length > 0 ? errors.join(" | ") : null);

  return results;
}

async function runBookingReminderCheck() {
  if (reminderRunning) {
    return { skipped: true, reason: "already_running" };
  }

  reminderRunning = true;

  try {
    const rows = await getDueReminderBookings();

    if (rows.length === 0) {
      return { checked: true, processed: 0 };
    }

    const processed = [];

    for (const row of rows) {
      try {
        const result = await processBookingReminder(row);
        processed.push(result);
      } catch (error) {
        console.error("Error procesando recordatorio 2h:", error);
        await markReminderProcessed(row.id, error.message || "Error procesando recordatorio");
        processed.push({
          bookingId: row.id,
          error: error.message || "Error procesando recordatorio",
        });
      }
    }

    console.log(`Recordatorios 2h procesados: ${processed.length}`);
    return { checked: true, processed: processed.length, results: processed };
  } finally {
    reminderRunning = false;
  }
}

function startBookingReminderWorker() {
  if (process.env.DISABLE_REMINDER_WORKER === "true") {
    console.log("Recordatorios 2h desactivados por DISABLE_REMINDER_WORKER=true");
    return null;
  }

  if (reminderTimer) {
    return reminderTimer;
  }

  ensureReminderColumns().catch((error) => {
    console.error("No se pudieron preparar columnas de recordatorio 2h:", error);
  });

  setTimeout(() => {
    runBookingReminderCheck().catch((error) => {
      console.error("Error ejecutando recordatorios 2h:", error);
    });
  }, 10_000);

  reminderTimer = setInterval(() => {
    runBookingReminderCheck().catch((error) => {
      console.error("Error ejecutando recordatorios 2h:", error);
    });
  }, REMINDER_INTERVAL_MS);

  console.log(`Worker recordatorios 2h activo cada ${REMINDER_INTERVAL_MS} ms`);
  return reminderTimer;
}

function stopBookingReminderWorker() {
  if (reminderTimer) {
    clearInterval(reminderTimer);
    reminderTimer = null;
  }
}

module.exports = {
  ensureReminderColumns,
  getDueReminderBookings,
  processBookingReminder,
  runBookingReminderCheck,
  startBookingReminderWorker,
  stopBookingReminderWorker,
};

const db = require("../db");
const {
  sendBookingReminderConfirmationMessage,
  sendReminder,
} = require("./whatsapp");

let reminderWorkerStarted = false;
let reminderWorkerTimer = null;
let reminderWorkerRunning = false;

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const LOOKAHEAD_MINUTES = Number(process.env.REMINDER_LOOKAHEAD_MINUTES || 130);
const LOOKBEHIND_MINUTES = Number(process.env.REMINDER_LOOKBEHIND_MINUTES || 15);
const WORKER_INTERVAL_MS = Number(process.env.REMINDER_WORKER_INTERVAL_MS || 60_000);

function normalizeDate(value) {
  return String(value || "").slice(0, 10);
}

function normalizeTime(value) {
  return String(value || "").slice(0, 5);
}

function getBookingDateTime(booking) {
  const date = normalizeDate(booking.booking_date || booking.bookingDate);
  const time = normalizeTime(booking.start_time || booking.startTime);

  if (!date || !time) return null;

  const parsed = new Date(`${date}T${time}:00`);

  if (Number.isNaN(parsed.getTime())) return null;

  return parsed;
}

async function ensureReminderSchema() {
  await db.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminder_2h_sent_at TIMESTAMP;`);
  await db.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminder_2h_attempted_at TIMESTAMP;`);
  await db.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminder_2h_error TEXT;`);
  await db.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS confirmation_token TEXT;`);
  await db.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS client_confirmed_at TIMESTAMP;`);
  await db.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS client_cancelled_at TIMESTAMP;`);
  await db.query(`ALTER TABLE professionals ADD COLUMN IF NOT EXISTS notify_reminder INTEGER DEFAULT 1;`);
  await db.query(`ALTER TABLE professionals ADD COLUMN IF NOT EXISTS reminder_hours_before INTEGER DEFAULT 2;`);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_bookings_reminder_2h
    ON bookings (booking_date, start_time, status, reminder_2h_sent_at);
  `).catch(() => {});
}

async function loadBookingsNeedingReminder() {
  await ensureReminderSchema();

  const result = await db.query(
    `
      SELECT
        b.*,
        ps.name AS service_name,
        ps.duration_minutes AS service_duration_minutes,
        ps.price AS service_price,
        sm.name AS staff_name,
        p.name AS professional_name,
        p.business_name,
        p.phone AS professional_phone,
        p.notify_reminder,
        p.reminder_hours_before
      FROM bookings b
      INNER JOIN professionals p ON p.id = b.professional_id
      LEFT JOIN professional_services ps ON ps.id = b.service_id
      LEFT JOIN staff_members sm ON sm.id = b.staff_id
      WHERE b.status IN ('pending', 'created')
        AND b.client_phone IS NOT NULL
        AND TRIM(b.client_phone) <> ''
        AND b.booking_date IS NOT NULL
        AND b.start_time IS NOT NULL
        AND b.reminder_2h_sent_at IS NULL
        AND (p.notify_reminder IS NULL OR p.notify_reminder::text IN ('1', 'true', 't'))
        AND (
          (b.booking_date::date + b.start_time::time)
          BETWEEN
            (NOW() + INTERVAL '2 hours' - ($1::int * INTERVAL '1 minute'))
          AND
            (NOW() + INTERVAL '2 hours' + ($2::int * INTERVAL '1 minute'))
        )
      ORDER BY b.booking_date ASC, b.start_time ASC, b.id ASC
      LIMIT 25
    `,
    [LOOKBEHIND_MINUTES, LOOKAHEAD_MINUTES]
  );

  return result.rows;
}

async function markReminderAttempt(bookingId) {
  await db.query(
    `
      UPDATE bookings
      SET reminder_2h_attempted_at = NOW(),
          reminder_2h_error = NULL,
          updated_at = NOW()
      WHERE id = $1
    `,
    [bookingId]
  );
}

async function markReminderSent(bookingId) {
  await db.query(
    `
      UPDATE bookings
      SET reminder_2h_sent_at = NOW(),
          reminder_2h_attempted_at = NOW(),
          reminder_2h_error = NULL,
          updated_at = NOW()
      WHERE id = $1
    `,
    [bookingId]
  );
}

async function markReminderError(bookingId, error) {
  await db.query(
    `
      UPDATE bookings
      SET reminder_2h_attempted_at = NOW(),
          reminder_2h_error = $2,
          updated_at = NOW()
      WHERE id = $1
    `,
    [bookingId, String(error?.message || error || "Error enviando recordatorio").slice(0, 500)]
  );
}

async function sendReminderForBooking(booking) {
  const bookingDateTime = getBookingDateTime(booking);

  if (!bookingDateTime) {
    throw new Error("Reserva sin fecha u hora válida");
  }

  await markReminderAttempt(booking.id);

  const professional = {
    id: booking.professional_id,
    name: booking.professional_name,
    business_name: booking.business_name || booking.professional_name || "TuAgendaYa",
    businessName: booking.business_name || booking.professional_name || "TuAgendaYa",
    phone: booking.professional_phone,
  };

  const payloadBooking = {
    ...booking,
    client_phone: booking.client_phone,
    clientPhone: booking.client_phone,
    client_name: booking.client_name,
    clientName: booking.client_name,
    service_name: booking.service_name || "Servicio",
    serviceName: booking.service_name || "Servicio",
    staff_name: booking.staff_name || null,
    staffName: booking.staff_name || null,
    booking_date: normalizeDate(booking.booking_date),
    bookingDate: normalizeDate(booking.booking_date),
    start_time: normalizeTime(booking.start_time),
    startTime: normalizeTime(booking.start_time),
    confirmation_token: booking.confirmation_token,
    confirmationToken: booking.confirmation_token,
    reminder: true,
  };

  const sender = sendBookingReminderConfirmationMessage || sendReminder;

  await sender(payloadBooking, professional);

  await markReminderSent(booking.id);

  return true;
}

async function runBookingReminderWorkerOnce() {
  if (reminderWorkerRunning) return { skipped: true, reason: "already_running" };

  reminderWorkerRunning = true;

  try {
    const bookings = await loadBookingsNeedingReminder();
    let sent = 0;
    let failed = 0;

    for (const booking of bookings) {
      try {
        await sendReminderForBooking(booking);
        sent += 1;
      } catch (error) {
        failed += 1;
        console.warn(`Reminder 2h failed for booking ${booking.id}:`, error.message);
        await markReminderError(booking.id, error);
      }
    }

    if (sent || failed) {
      console.log(`Reminder worker: sent=${sent}, failed=${failed}`);
    }

    return { sent, failed, checked: bookings.length };
  } finally {
    reminderWorkerRunning = false;
  }
}

function startBookingReminderWorker() {
  if (reminderWorkerStarted) {
    return;
  }

  reminderWorkerStarted = true;

  console.log("Booking reminder worker started");

  runBookingReminderWorkerOnce().catch((error) => {
    console.warn("Initial reminder worker run failed:", error.message);
  });

  reminderWorkerTimer = setInterval(() => {
    runBookingReminderWorkerOnce().catch((error) => {
      console.warn("Reminder worker run failed:", error.message);
    });
  }, WORKER_INTERVAL_MS);

  if (reminderWorkerTimer.unref) {
    reminderWorkerTimer.unref();
  }
}

module.exports = {
  startBookingReminderWorker,
  runBookingReminderWorkerOnce,
  ensureReminderSchema,
};

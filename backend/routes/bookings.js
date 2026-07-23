const express = require("express");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const db = require("../db");
const {
  sendBookingConfirmationMessage,
  sendBusinessBookingNotification,
} = require("../services/whatsapp");
const {
  savePushSubscription,
  sendPushToProfessional,
} = require("../services/push");

const router = express.Router();

function getTokenFromHeader(req) {
  const authHeader = req.headers.authorization || "";

  if (!authHeader.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.slice(7);
}

function getProfessionalIdFromRequest(req) {
  const token = getTokenFromHeader(req);

  if (!token) {
    const error = new Error("Token requerido");
    error.status = 401;
    throw error;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const id =
      decoded.id ||
      decoded.professionalId ||
      decoded.professional_id ||
      decoded.userId ||
      decoded.user_id;

    if (!id) {
      const error = new Error("Token inválido");
      error.status = 401;
      throw error;
    }

    return Number(id);
  } catch (error) {
    error.status = error.status || 401;
    error.message = error.message || "Token inválido";
    throw error;
  }
}

function createConfirmationToken() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return crypto.randomBytes(32).toString("hex");
}

function getFrontendUrl() {
  return process.env.FRONTEND_URL || "https://tuagendaya-web.onrender.com";
}

function normalizeDate(date) {
  return String(date || "").slice(0, 10);
}

function normalizeTime(time) {
  return String(time || "").slice(0, 5);
}

function timeToMinutes(time) {
  const clean = normalizeTime(time);
  const [hours, minutes] = clean.split(":").map(Number);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
}

function minutesToTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;

  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function addMinutesToTime(time, minutesToAdd) {
  const base = timeToMinutes(time);

  if (base === null) {
    return null;
  }

  return minutesToTime(base + Number(minutesToAdd || 30));
}

function getDayOfWeekFromDateString(dateString) {
  const clean = normalizeDate(dateString);
  const [year, month, day] = clean.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  const utcDate = new Date(Date.UTC(year, month - 1, day));
  return utcDate.getUTCDay();
}

function generateSlotsFromConfig(
  startTime,
  endTime,
  stepMinutes,
  serviceDurationMinutes
) {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  const step = Number(stepMinutes || 30);
  const duration = Number(serviceDurationMinutes || step || 30);

  if (
    start === null ||
    end === null ||
    end <= start ||
    step <= 0 ||
    duration <= 0
  ) {
    return [];
  }

  const slots = [];

  for (let current = start; current <= end; current += step) {
    slots.push(minutesToTime(current));
  }

  return slots;
}

function rangesOverlap(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

async function ensurePaymentColumns() {
  await db.query(
    `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';`
  );
  await db.query(
    `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash';`
  );
  await db.query(
    `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(10, 2);`
  );
  await db.query(
    `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_updated_at TIMESTAMP;`
  );
}

async function ensureCancellationSettingsColumns() {
  await db.query(
    `ALTER TABLE professionals ADD COLUMN IF NOT EXISTS allow_client_cancellations INTEGER DEFAULT 1;`
  );
  await db.query(
    `ALTER TABLE professionals ADD COLUMN IF NOT EXISTS cancellation_limit_minutes INTEGER DEFAULT 0;`
  );
}

function isTruthySetting(value, fallback = true) {
  if (value === null || value === undefined) return fallback;
  return value === true || value === 1 || value === "1" || value === "true";
}

function getBookingStartDateTime(bookingDate, startTime) {
  const cleanDate = normalizeDate(bookingDate);
  const cleanTime = normalizeTime(startTime || "00:00");

  if (!cleanDate || !cleanTime) {
    return null;
  }

  const date = new Date(`${cleanDate}T${cleanTime}:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function canClientCancelBooking(booking) {
  const allowClientCancellations = isTruthySetting(
    booking.allow_client_cancellations,
    true
  );

  if (!allowClientCancellations) {
    return {
      allowed: false,
      error: "Este negocio no permite cancelaciones del cliente desde el link.",
    };
  }

  const limitMinutes = Number(booking.cancellation_limit_minutes || 0) || 0;

  if (limitMinutes <= 0) {
    return { allowed: true, error: null };
  }

  const startDateTime = getBookingStartDateTime(
    booking.booking_date,
    booking.start_time
  );

  if (!startDateTime) {
    return { allowed: true, error: null };
  }

  const diffMinutes = Math.floor((startDateTime.getTime() - Date.now()) / 60000);

  if (diffMinutes < limitMinutes) {
    return {
      allowed: false,
      error: `El plazo para cancelar esta reserva ya venció. El límite es ${limitMinutes} minutos antes del turno.`,
    };
  }

  return { allowed: true, error: null };
}


async function ensureBlockedTimesTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS blocked_times (
      id SERIAL PRIMARY KEY,
      professional_id INTEGER NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
      staff_id INTEGER,
      block_date DATE NOT NULL,
      start_time TIME,
      end_time TIME,
      is_full_day BOOLEAN DEFAULT FALSE,
      reason TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await db.query(`ALTER TABLE blocked_times ADD COLUMN IF NOT EXISTS staff_id INTEGER;`);
  await db.query(`ALTER TABLE blocked_times ADD COLUMN IF NOT EXISTS is_full_day BOOLEAN DEFAULT FALSE;`);
  await db.query(`ALTER TABLE blocked_times ADD COLUMN IF NOT EXISTS reason TEXT;`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_blocked_times_professional_date ON blocked_times(professional_id, block_date);`);
}

function normalizeBlockedTime(row) {
  if (!row) return null;

  return {
    id: row.id,
    professionalId: row.professional_id,
    professional_id: row.professional_id,
    staffId: row.staff_id,
    staff_id: row.staff_id,
    blockDate: normalizeDate(row.block_date),
    block_date: normalizeDate(row.block_date),
    startTime: row.start_time ? String(row.start_time).slice(0, 5) : null,
    start_time: row.start_time ? String(row.start_time).slice(0, 5) : null,
    endTime: row.end_time ? String(row.end_time).slice(0, 5) : null,
    end_time: row.end_time ? String(row.end_time).slice(0, 5) : null,
    isFullDay: row.is_full_day === true || row.is_full_day === 1 || row.is_full_day === "1",
    is_full_day: row.is_full_day === true || row.is_full_day === 1 || row.is_full_day === "1",
    reason: row.reason || "",
  };
}

async function listBlockedTimes(professionalId) {
  await ensureBlockedTimesTable();

  const result = await db.query(
    `
    SELECT *
    FROM blocked_times
    WHERE professional_id = $1
      AND block_date >= CURRENT_DATE - INTERVAL '30 days'
    ORDER BY block_date ASC, start_time ASC, id ASC
    `,
    [professionalId]
  );

  return result.rows.map(normalizeBlockedTime);
}

async function getBlockedTimesForDate(professionalId, bookingDate, staffId = null) {
  await ensureBlockedTimesTable();

  const result = await db.query(
    `
    SELECT *
    FROM blocked_times
    WHERE professional_id = $1
      AND block_date = $2
      AND (staff_id IS NULL OR staff_id = $3)
    ORDER BY start_time ASC, id ASC
    `,
    [professionalId, bookingDate, staffId]
  );

  return result.rows;
}

function rangeOverlapsBlockedTime(block, start, end) {
  if (!block) return false;

  if (block.is_full_day === true || block.is_full_day === 1 || block.is_full_day === "1") {
    return true;
  }

  const blockStart = timeToMinutes(block.start_time);
  const blockEnd = timeToMinutes(block.end_time);

  if (blockStart === null || blockEnd === null || blockEnd <= blockStart) {
    return false;
  }

  return rangesOverlap(start, end, blockStart, blockEnd);
}



async function ensureCashClosuresTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS cash_closures (
      id SERIAL PRIMARY KEY,
      professional_id INTEGER NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
      closure_date DATE NOT NULL,
      total_bookings INTEGER DEFAULT 0,
      completed_bookings INTEGER DEFAULT 0,
      pending_bookings INTEGER DEFAULT 0,
      cancelled_bookings INTEGER DEFAULT 0,
      total_generated NUMERIC(10, 2) DEFAULT 0,
      total_collected NUMERIC(10, 2) DEFAULT 0,
      total_pending NUMERIC(10, 2) DEFAULT 0,
      cash_total NUMERIC(10, 2) DEFAULT 0,
      transfer_total NUMERIC(10, 2) DEFAULT 0,
      card_total NUMERIC(10, 2) DEFAULT 0,
      other_total NUMERIC(10, 2) DEFAULT 0,
      services_summary JSONB DEFAULT '[]'::jsonb,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await db.query(
    `ALTER TABLE cash_closures ADD COLUMN IF NOT EXISTS professional_id INTEGER;`
  );
  await db.query(
    `ALTER TABLE cash_closures ADD COLUMN IF NOT EXISTS closure_date DATE;`
  );
  await db.query(
    `ALTER TABLE cash_closures ADD COLUMN IF NOT EXISTS total_bookings INTEGER DEFAULT 0;`
  );
  await db.query(
    `ALTER TABLE cash_closures ADD COLUMN IF NOT EXISTS completed_bookings INTEGER DEFAULT 0;`
  );
  await db.query(
    `ALTER TABLE cash_closures ADD COLUMN IF NOT EXISTS pending_bookings INTEGER DEFAULT 0;`
  );
  await db.query(
    `ALTER TABLE cash_closures ADD COLUMN IF NOT EXISTS cancelled_bookings INTEGER DEFAULT 0;`
  );
  await db.query(
    `ALTER TABLE cash_closures ADD COLUMN IF NOT EXISTS total_generated NUMERIC(10, 2) DEFAULT 0;`
  );
  await db.query(
    `ALTER TABLE cash_closures ADD COLUMN IF NOT EXISTS total_collected NUMERIC(10, 2) DEFAULT 0;`
  );
  await db.query(
    `ALTER TABLE cash_closures ADD COLUMN IF NOT EXISTS total_pending NUMERIC(10, 2) DEFAULT 0;`
  );
  await db.query(
    `ALTER TABLE cash_closures ADD COLUMN IF NOT EXISTS cash_total NUMERIC(10, 2) DEFAULT 0;`
  );
  await db.query(
    `ALTER TABLE cash_closures ADD COLUMN IF NOT EXISTS transfer_total NUMERIC(10, 2) DEFAULT 0;`
  );
  await db.query(
    `ALTER TABLE cash_closures ADD COLUMN IF NOT EXISTS card_total NUMERIC(10, 2) DEFAULT 0;`
  );
  await db.query(
    `ALTER TABLE cash_closures ADD COLUMN IF NOT EXISTS other_total NUMERIC(10, 2) DEFAULT 0;`
  );
  await db.query(
    `ALTER TABLE cash_closures ADD COLUMN IF NOT EXISTS services_summary JSONB DEFAULT '[]'::jsonb;`
  );
  await db.query(`ALTER TABLE cash_closures ADD COLUMN IF NOT EXISTS notes TEXT;`);
  await db.query(
    `ALTER TABLE cash_closures ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();`
  );
  await db.query(
    `ALTER TABLE cash_closures ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();`
  );

  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_cash_closures_professional_date
    ON cash_closures (professional_id, closure_date);
  `);
}

function normalizeCashClosure(row) {
  const servicesSummary = Array.isArray(row.services_summary)
    ? row.services_summary
    : [];

  return {
    id: row.id,
    professional_id: row.professional_id,
    professionalId: row.professional_id,
    closure_date: row.closure_date,
    closureDate: row.closure_date,
    total_bookings: Number(row.total_bookings || 0),
    totalBookings: Number(row.total_bookings || 0),
    completed_bookings: Number(row.completed_bookings || 0),
    completedBookings: Number(row.completed_bookings || 0),
    pending_bookings: Number(row.pending_bookings || 0),
    pendingBookings: Number(row.pending_bookings || 0),
    cancelled_bookings: Number(row.cancelled_bookings || 0),
    cancelledBookings: Number(row.cancelled_bookings || 0),
    total_generated: row.total_generated,
    totalGenerated: row.total_generated,
    total_collected: row.total_collected,
    totalCollected: row.total_collected,
    total_pending: row.total_pending,
    totalPending: row.total_pending,
    cash_total: row.cash_total,
    cashTotal: row.cash_total,
    transfer_total: row.transfer_total,
    transferTotal: row.transfer_total,
    card_total: row.card_total,
    cardTotal: row.card_total,
    other_total: row.other_total,
    otherTotal: row.other_total,
    services_summary: servicesSummary,
    servicesSummary,
    notes: row.notes,
    created_at: row.created_at,
    createdAt: row.created_at,
    updated_at: row.updated_at,
    updatedAt: row.updated_at,
  };
}

async function calculateCashClosure(professionalId, closureDate) {
  await ensurePaymentColumns();
  await ensureCashClosuresTable();

  const bookingsResult = await db.query(
    `
    SELECT
      b.*,
      s.name AS service_name,
      s.duration_minutes AS service_duration_minutes,
      s.price AS service_price,
      sm.name AS staff_name
    FROM bookings b
    LEFT JOIN professional_services s ON s.id = b.service_id
    LEFT JOIN staff_members sm ON sm.id = b.staff_id
    WHERE b.professional_id = $1
      AND b.booking_date = $2
    ORDER BY b.start_time ASC, b.id ASC
    `,
    [professionalId, closureDate]
  );

  const bookings = bookingsResult.rows;
  const activeBookings = bookings.filter(
    (booking) => booking.status !== "cancelled"
  );

  const getPrice = (booking) => Number(booking.service_price || 0) || 0;
  const getPaid = (booking) => Number(booking.amount_paid || 0) || 0;

  const totalBookings = bookings.length;
  const completedBookings = bookings.filter(
    (booking) => booking.status === "completed"
  ).length;
  const cancelledBookings = bookings.filter(
    (booking) => booking.status === "cancelled"
  ).length;
  const pendingBookings = bookings.filter(
    (booking) =>
      booking.status === "pending" || booking.status === "confirmed"
  ).length;

  const totalGenerated = activeBookings.reduce(
    (sum, booking) => sum + getPrice(booking),
    0
  );
  const totalCollected = activeBookings.reduce(
    (sum, booking) => sum + getPaid(booking),
    0
  );
  const totalPending = activeBookings.reduce(
    (sum, booking) => sum + Math.max(getPrice(booking) - getPaid(booking), 0),
    0
  );

  const methodTotal = (method) =>
    activeBookings
      .filter((booking) => (booking.payment_method || "cash") === method)
      .reduce((sum, booking) => sum + getPaid(booking), 0);

  const servicesMap = new Map();

  activeBookings.forEach((booking) => {
    const name =
      String(booking.service_name || "Servicio sin nombre").trim() ||
      "Servicio sin nombre";

    const current = servicesMap.get(name) || {
      name,
      count: 0,
      generated: 0,
      collected: 0,
    };

    current.count += 1;
    current.generated += getPrice(booking);
    current.collected += getPaid(booking);
    servicesMap.set(name, current);
  });

  const servicesSummary = Array.from(servicesMap.values()).sort(
    (a, b) => b.generated - a.generated
  );

  return {
    totalBookings,
    completedBookings,
    pendingBookings,
    cancelledBookings,
    totalGenerated,
    totalCollected,
    totalPending,
    cashTotal: methodTotal("cash"),
    transferTotal: methodTotal("transfer"),
    cardTotal: methodTotal("card"),
    otherTotal: methodTotal("other"),
    servicesSummary,
  };
}

function normalizeBooking(row) {
  return {
    id: row.id,
    professional_id: row.professional_id,
    professionalId: row.professional_id,
    staff_id: row.staff_id,
    staffId: row.staff_id,
    staff_name: row.staff_name,
    staffName: row.staff_name,
    service_id: row.service_id,
    serviceId: row.service_id,
    service_name: row.service_name,
    serviceName: row.service_name,
    service_duration_minutes: row.service_duration_minutes,
    serviceDurationMinutes: row.service_duration_minutes,
    service_price: row.service_price,
    servicePrice: row.service_price,
    client_name: row.client_name,
    clientName: row.client_name,
    client_phone: row.client_phone,
    clientPhone: row.client_phone,
    comment: row.comment,
    booking_date: row.booking_date,
    bookingDate: row.booking_date,
    start_time: row.start_time,
    startTime: row.start_time,
    end_time: row.end_time,
    endTime: row.end_time,
    status: row.status,
    payment_status: row.payment_status || "pending",
    paymentStatus: row.payment_status || "pending",
    payment_method: row.payment_method || "cash",
    paymentMethod: row.payment_method || "cash",
    amount_paid: row.amount_paid,
    amountPaid: row.amount_paid,
    payment_updated_at: row.payment_updated_at,
    paymentUpdatedAt: row.payment_updated_at,
    reminder_2h_sent_at: row.reminder_2h_sent_at,
    reminder2hSentAt: row.reminder_2h_sent_at,
    reminder_2h_attempted_at: row.reminder_2h_attempted_at,
    reminder2hAttemptedAt: row.reminder_2h_attempted_at,
    reminder_2h_error: row.reminder_2h_error,
    reminder2hError: row.reminder_2h_error,
    confirmation_token: row.confirmation_token,
    confirmationToken: row.confirmation_token,
    client_confirmed_at: row.client_confirmed_at,
    clientConfirmedAt: row.client_confirmed_at,
    client_cancelled_at: row.client_cancelled_at,
    clientCancelledAt: row.client_cancelled_at,
    created_at: row.created_at,
    createdAt: row.created_at,
    updated_at: row.updated_at,
    updatedAt: row.updated_at,
  };
}


function setNoStoreHeaders(res) {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
}

function normalizePublicService(row) {
  const duration = Number(row.duration_minutes ?? row.duration ?? row.durationMinutes ?? 30) || 30;
  const price = Number(row.price ?? 0) || 0;

  return {
    id: row.id,
    serviceId: row.id,
    service_id: row.id,
    professional_service_id: row.id,
    name: row.name || '',
    description: row.description || '',
    durationMinutes: duration,
    duration_minutes: duration,
    duration,
    price,
    isActive: isTruthyDatabaseValue(row.is_active ?? row.active ?? true),
    is_active: isTruthyDatabaseValue(row.is_active ?? row.active ?? true),
  };
}

function normalizeAcceptedPaymentMethods(value) {
  const allowed = ['cash', 'transfer', 'card'];
  const list = Array.isArray(value) ? value : String(value || 'cash,transfer,card').split(',');
  const clean = list.map((item) => String(item || '').trim()).filter((item) => allowed.includes(item));
  return clean.length > 0 ? clean : ['cash', 'transfer', 'card'];
}

function normalizePublicSettings(row = {}) {
  const methods = normalizeAcceptedPaymentMethods(row.accepted_payment_methods ?? row.acceptedPaymentMethods);

  return {
    acceptedPaymentMethods: methods,
    accepted_payment_methods: methods,
    allowClientCancellations: row.allow_client_cancellations !== undefined ? isTruthyDatabaseValue(row.allow_client_cancellations) : true,
    allow_client_cancellations: row.allow_client_cancellations !== undefined ? isTruthyDatabaseValue(row.allow_client_cancellations) : true,
    cancellationLimitMinutes: Number(row.cancellation_limit_minutes || 0),
    cancellation_limit_minutes: Number(row.cancellation_limit_minutes || 0),
  };
}

function normalizePublicBooking(row) {
  return {
    id: row.id,
    clientName: row.client_name,
    bookingDate: row.booking_date,
    startTime: row.start_time,
    endTime: row.end_time,
    status: row.status,
    serviceName: row.service_name,
    serviceDurationMinutes: row.service_duration_minutes,
    servicePrice: row.service_price,
    staffName: row.staff_name,
    professionalName: row.professional_name,
    businessName: row.business_name,
  };
}

function normalizePublicStaff(row) {
  return {
    id: row.id,
    name: row.name || "",
    color: row.color || "#0071e3",
    isActive: Boolean(row.is_active),
  };
}

function isTruthyDatabaseValue(value) {
  return (
    value === true ||
    value === 1 ||
    value === "1" ||
    String(value).toLowerCase() === "true"
  );
}

function isAvailabilityActive(availability) {
  if (!availability) return false;

  const value = availability.is_active ?? availability.isActive ?? availability.active;
  return isTruthyDatabaseValue(value);
}

function getAvailabilityBreakStart(availability) {
  return (
    availability?.break_start_time ??
    availability?.break_start ??
    availability?.breakStartTime ??
    availability?.breakStart ??
    null
  );
}

function getAvailabilityBreakEnd(availability) {
  return (
    availability?.break_end_time ??
    availability?.break_end ??
    availability?.breakEndTime ??
    availability?.breakEnd ??
    null
  );
}

async function getProfessionalBySlug(slug) {
  const result = await db.query(
    `
    SELECT *
    FROM professionals
    WHERE slug = $1 AND (status IS NULL OR status = 'active')
    LIMIT 1
    `,
    [slug]
  );

  return result.rows[0] || null;
}

async function getServiceForProfessional(professionalId, serviceId) {
  if (!serviceId) {
    return null;
  }

  const result = await db.query(
    `
    SELECT *
    FROM professional_services
    WHERE id = $1
      AND professional_id = $2
      AND (is_active IS NULL OR is_active::text IN ('1','true','t'))
    LIMIT 1
    `,
    [Number(serviceId), professionalId]
  );

  return result.rows[0] || null;
}

async function getStaffForProfessional(professionalId, staffId) {
  if (!staffId) {
    return null;
  }

  const result = await db.query(
    `
    SELECT *
    FROM staff_members
    WHERE id = $1
      AND owner_professional_id = $2
      AND is_active = true
    LIMIT 1
    `,
    [staffId, professionalId]
  );

  return result.rows[0] || null;
}

async function ensureDefaultStaff(professional) {
  const existing = await db.query(
    `
    SELECT *
    FROM staff_members
    WHERE owner_professional_id = $1
    ORDER BY is_active DESC, id ASC
    `,
    [professional.id]
  );

  if (existing.rows.length > 0) {
    return existing.rows;
  }

  const created = await db.query(
    `
    INSERT INTO staff_members (
      owner_professional_id,
      name,
      phone,
      email,
      color,
      is_active,
      created_at,
      updated_at
    )
    VALUES ($1, $2, $3, $4, '#0071e3', true, NOW(), NOW())
    RETURNING *
    `,
    [
      professional.id,
      professional.name || "Profesional principal",
      professional.phone || null,
      professional.email || null,
    ]
  );

  const staffId = created.rows[0].id;

  for (let dayOfWeek = 0; dayOfWeek <= 6; dayOfWeek += 1) {
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;

    await db.query(
      `
      INSERT INTO staff_availability (
        staff_id,
        day_of_week,
        is_active,
        start_time,
        end_time,
        slot_duration_minutes,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, '09:00', '18:00', 30, NOW(), NOW())
      ON CONFLICT (staff_id, day_of_week)
      DO NOTHING
      `,
      [staffId, dayOfWeek, isWeekday]
    );
  }

  return created.rows;
}

async function getPublicStaffForProfessional(professional) {
  const result = await db.query(
    `
    SELECT *
    FROM staff_members
    WHERE owner_professional_id = $1
      AND is_active = true
    ORDER BY id ASC
    `,
    [professional.id]
  );

  return result.rows;
}

async function getAvailabilityForDate(professionalId, staffId, bookingDate) {
  const dayOfWeek = getDayOfWeekFromDateString(bookingDate);

  if (dayOfWeek === null) {
    return null;
  }

  if (staffId) {
    const staffAvailability = await db.query(
      `
      SELECT *
      FROM staff_availability
      WHERE staff_id = $1
        AND day_of_week = $2
      LIMIT 1
      `,
      [staffId, dayOfWeek]
    );

    if (staffAvailability.rows.length > 0) {
      return staffAvailability.rows[0];
    }

    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;

    return {
      staff_id: staffId,
      day_of_week: dayOfWeek,
      is_active: isWeekday,
      start_time: "09:00",
      end_time: "18:00",
      slot_duration_minutes: 30,
      break_enabled: false,
      break_start: "13:00",
      break_end: "14:00",
    };
  }

  const result = await db.query(
    `
    SELECT *
    FROM professional_availability
    WHERE professional_id = $1
      AND day_of_week = $2
    LIMIT 1
    `,
    [professionalId, dayOfWeek]
  );

  if (result.rows.length > 0) {
    return result.rows[0];
  }

  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;

  return {
    professional_id: professionalId,
    day_of_week: dayOfWeek,
    is_active: isWeekday,
    start_time: "09:00",
    end_time: "18:00",
    slot_duration_minutes: 30,
    break_enabled: false,
    break_start: "13:00",
    break_end: "14:00",
  };
}

async function getBusyBookings(professionalId, bookingDate, staffId) {
  if (staffId) {
    const result = await db.query(
      `
      SELECT id, start_time, end_time
      FROM bookings
      WHERE professional_id = $1
        AND staff_id = $2
        AND booking_date = $3
        AND status <> 'cancelled'
        AND start_time IS NOT NULL
      `,
      [professionalId, staffId, bookingDate]
    );

    return result.rows;
  }

  const result = await db.query(
    `
    SELECT id, start_time, end_time
    FROM bookings
    WHERE professional_id = $1
      AND booking_date = $2
      AND status <> 'cancelled'
      AND start_time IS NOT NULL
    `,
    [professionalId, bookingDate]
  );

  return result.rows;
}

function rangeOverlapsPause() {
  return false;
}

async function isTimeRangeAvailable(
  professionalId,
  staffId,
  bookingDate,
  startTime,
  endTime,
  availability = null
) {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);

  if (start === null || end === null || end <= start) {
    return false;
  }

  const blockedTimes = await getBlockedTimesForDate(professionalId, bookingDate, staffId);

  for (const block of blockedTimes) {
    if (rangeOverlapsBlockedTime(block, start, end)) {
      return false;
    }
  }

  const busy = await getBusyBookings(professionalId, bookingDate, staffId);

  for (const booking of busy) {
    const busyStart = timeToMinutes(booking.start_time);
    const busyEnd = timeToMinutes(booking.end_time) || busyStart + 30;

    if (
      busyStart !== null &&
      busyEnd !== null &&
      rangesOverlap(start, end, busyStart, busyEnd)
    ) {
      return false;
    }
  }

  return true;
}


router.get("/push/public-key", (req, res) => {
  res.json({
    publicKey: process.env.VAPID_PUBLIC_KEY || "",
  });
});

router.post("/push/subscribe", async (req, res) => {
  try {
    const professionalId = getProfessionalIdFromRequest(req);
    const subscription = req.body.subscription || req.body;
    const userAgent = req.headers["user-agent"] || "";

    await savePushSubscription(professionalId, subscription, userAgent);



    let pushNotification = { attempted: false, sent: 0 };

    try {
      pushNotification = await sendPushToProfessional(professional.id, {
        title: "Nueva reserva en TuAgendaYa",
        body: `${clientName} reservó ${service ? service.name : "un servicio"} para el ${normalizeDate(bookingDate)} a las ${normalizeTime(startTime)}`,
        icon: "/tuagendaya-logo.png",
        badge: "/tuagendaya-logo.png",
        url: "/profesional/dashboard",
        bookingId: result.rows[0].id,
        clientName,
        serviceName: service ? service.name : "Servicio",
        bookingDate: normalizeDate(bookingDate),
        startTime: normalizeTime(startTime),
      });
    } catch (pushError) {
      console.warn("Push notification skipped:", pushError.message);

      pushNotification = {
        attempted: true,
        sent: 0,
        error: pushError.message || "No se pudo enviar la notificación push",
      };
    }

    res.status(201).json({
      success: true,
      message: "Notificaciones activadas",
    });
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.message || "Error activando notificaciones",
    });
  }
});


router.get("/blocks", async (req, res) => {
  try {
    const professionalId = getProfessionalIdFromRequest(req);
    const blocks = await listBlockedTimes(professionalId);

    res.json({ blocks });
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.message || "Error obteniendo bloqueos",
    });
  }
});

router.post("/blocks", async (req, res) => {
  try {
    await ensureBlockedTimesTable();

    const professionalId = getProfessionalIdFromRequest(req);
    const blockDate = normalizeDate(req.body.blockDate ?? req.body.block_date ?? req.body.date);
    const isFullDay = req.body.isFullDay === true || req.body.is_full_day === true || req.body.isFullDay === "true" || req.body.is_full_day === "true";
    const startTime = isFullDay ? null : normalizeTime(req.body.startTime ?? req.body.start_time);
    const endTime = isFullDay ? null : normalizeTime(req.body.endTime ?? req.body.end_time);
    const reason = String(req.body.reason || "").trim() || null;
    const staffId = req.body.staffId || req.body.staff_id || null;

    if (!blockDate) {
      return res.status(400).json({ error: "La fecha es obligatoria" });
    }

    if (!isFullDay) {
      const start = timeToMinutes(startTime);
      const end = timeToMinutes(endTime);

      if (start === null || end === null || end <= start) {
        return res.status(400).json({ error: "Revisá el horario bloqueado" });
      }
    }

    await db.query(
      `
      INSERT INTO blocked_times (
        professional_id,
        staff_id,
        block_date,
        start_time,
        end_time,
        is_full_day,
        reason,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4::time, $5::time, $6, $7, NOW(), NOW())
      `,
      [
        professionalId,
        staffId ? Number(staffId) : null,
        blockDate,
        startTime,
        endTime,
        isFullDay,
        reason,
      ]
    );

    const blocks = await listBlockedTimes(professionalId);

    res.status(201).json({
      success: true,
      blocks,
    });
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.message || "Error guardando bloqueo",
    });
  }
});


router.post("/blocks/range", async (req, res) => {
  try {
    await ensureBlockedTimesTable();

    const professionalId = getProfessionalIdFromRequest(req);
    const startDate = normalizeDate(req.body.startDate ?? req.body.start_date);
    const endDate = normalizeDate(req.body.endDate ?? req.body.end_date);
    const reason = String(req.body.reason || "").trim() || null;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: "Las fechas desde y hasta son obligatorias" });
    }

    if (endDate < startDate) {
      return res.status(400).json({ error: "La fecha hasta no puede ser anterior a la fecha desde" });
    }

    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    const days = [];

    for (let current = new Date(start); current <= end; current.setDate(current.getDate() + 1)) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, "0");
      const day = String(current.getDate()).padStart(2, "0");
      days.push(`${year}-${month}-${day}`);
    }

    if (days.length > 90) {
      return res.status(400).json({ error: "El rango máximo permitido es de 90 días" });
    }

    for (const day of days) {
      await db.query(
        `
        INSERT INTO blocked_times (
          professional_id,
          staff_id,
          block_date,
          start_time,
          end_time,
          is_full_day,
          reason,
          created_at,
          updated_at
        )
        VALUES ($1, NULL, $2, NULL, NULL, true, $3, NOW(), NOW())
        `,
        [professionalId, day, reason]
      );
    }

    const blocks = await listBlockedTimes(professionalId);

    res.status(201).json({
      success: true,
      blocks,
    });
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.message || "Error guardando rango bloqueado",
    });
  }
});

router.delete("/blocks/:id", async (req, res) => {
  try {
    await ensureBlockedTimesTable();

    const professionalId = getProfessionalIdFromRequest(req);
    const blockId = Number(req.params.id);

    if (!blockId) {
      return res.status(400).json({ error: "Bloqueo inválido" });
    }

    await db.query(
      `DELETE FROM blocked_times WHERE id = $1 AND professional_id = $2`,
      [blockId, professionalId]
    );

    const blocks = await listBlockedTimes(professionalId);

    res.json({
      success: true,
      blocks,
    });
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.message || "Error eliminando bloqueo",
    });
  }
});


router.get("/public/:slug/services", async (req, res) => {
  try {
    setNoStoreHeaders(res);

    const { slug } = req.params;
    const professional = await getProfessionalBySlug(slug);

    if (!professional) {
      return res.status(404).json({
        error: "Profesional no encontrado",
      });
    }

    const result = await db.query(
      `
      SELECT id, professional_id, name, description, duration_minutes, price, is_active, created_at, updated_at
      FROM professional_services
      WHERE professional_id = $1
        AND (is_active IS NULL OR is_active::text IN ('1','true','t'))
      ORDER BY id ASC
      `,
      [professional.id]
    );

    const services = result.rows.map(normalizePublicService);

    res.json({
      professional: {
        id: professional.id,
        name: professional.name,
        businessName: professional.business_name || professional.name,
        business_name: professional.business_name || professional.name,
        address: professional.address || "",
        slug: professional.slug,
        logoUrl: professional.logo_url || null,
        logo_url: professional.logo_url || null,
        acceptedPaymentMethods: normalizeAcceptedPaymentMethods(professional.accepted_payment_methods),
        accepted_payment_methods: normalizeAcceptedPaymentMethods(professional.accepted_payment_methods),
      },
      business: {
        id: professional.id,
        name: professional.name,
        businessName: professional.business_name || professional.name,
        business_name: professional.business_name || professional.name,
        address: professional.address || "",
        slug: professional.slug,
        logoUrl: professional.logo_url || null,
        logo_url: professional.logo_url || null,
        acceptedPaymentMethods: normalizeAcceptedPaymentMethods(professional.accepted_payment_methods),
        accepted_payment_methods: normalizeAcceptedPaymentMethods(professional.accepted_payment_methods),
      },
      settings: normalizePublicSettings(professional),
      services,
    });
  } catch (error) {
    console.error("GET /public/:slug/services error:", error);
    res.status(500).json({
      error: error.message || "Error obteniendo servicios públicos",
    });
  }
});

router.get("/public/:slug/settings", async (req, res) => {
  try {
    setNoStoreHeaders(res);

    const { slug } = req.params;
    const professional = await getProfessionalBySlug(slug);

    if (!professional) {
      return res.status(404).json({
        error: "Profesional no encontrado",
      });
    }

    res.json({
      settings: normalizePublicSettings(professional),
    });
  } catch (error) {
    console.error("GET /public/:slug/settings error:", error);
    res.status(500).json({
      error: error.message || "Error obteniendo ajustes públicos",
    });
  }
});

router.get("/public/:slug/staff", async (req, res) => {
  try {
    setNoStoreHeaders(res);
    const { slug } = req.params;
    const professional = await getProfessionalBySlug(slug);

    if (!professional) {
      return res.status(404).json({
        error: "Profesional no encontrado",
      });
    }

    const staff = await getPublicStaffForProfessional(professional);

    res.json({
      business: {
        id: professional.id,
        name: professional.name,
        businessName: professional.business_name || professional.name,
        business_name: professional.business_name || professional.name,
        address: professional.address || "",
        slug: professional.slug,
        logoUrl: professional.logo_url || null,
        logo_url: professional.logo_url || null,
        acceptedPaymentMethods: normalizeAcceptedPaymentMethods(professional.accepted_payment_methods),
        accepted_payment_methods: normalizeAcceptedPaymentMethods(professional.accepted_payment_methods),
      },
      staff: staff.map(normalizePublicStaff),
    });
  } catch (error) {
    res.status(500).json({
      error: error.message || "Error obteniendo profesionales",
    });
  }
});

router.get("/public/:slug/slots", async (req, res) => {
  try {
    setNoStoreHeaders(res);
    const { slug } = req.params;
    const bookingDate = normalizeDate(req.query.date);
    const serviceId = req.query.serviceId || req.query.service_id || null;
    const staffId = req.query.staffId || req.query.staff_id || null;

    if (!bookingDate) {
      return res.status(400).json({
        error: "La fecha es obligatoria",
      });
    }

    const professional = await getProfessionalBySlug(slug);

    if (!professional) {
      return res.status(404).json({
        error: "Profesional no encontrado",
      });
    }

    let staff = null;

    if (staffId) {
      staff = await getStaffForProfessional(professional.id, Number(staffId));

      if (!staff) {
        return res.status(404).json({
          error: "Profesional interno no encontrado",
        });
      }
    }

    const availability = await getAvailabilityForDate(
      professional.id,
      staff ? staff.id : null,
      bookingDate
    );

    if (!availability || !isAvailabilityActive(availability)) {
      return res.json({ slots: [] });
    }

    let serviceDuration = Number(availability.slot_duration_minutes || 30);

    if (serviceId) {
      const service = await getServiceForProfessional(
        professional.id,
        serviceId
      );

      if (!service) {
        return res.status(404).json({
          error: "Servicio no encontrado",
        });
      }

      serviceDuration = Number(service.duration_minutes || serviceDuration);
    }

    const baseSlots = generateSlotsFromConfig(
      availability.start_time,
      availability.end_time,
      availability.slot_duration_minutes,
      serviceDuration
    );

    const busyBookings = await getBusyBookings(
      professional.id,
      bookingDate,
      staff ? staff.id : null
    );

    const blockedTimes = await getBlockedTimesForDate(
      professional.id,
      bookingDate,
      staff ? staff.id : null
    );

    const slots = baseSlots.map((slotTime) => {
      const slotStart = timeToMinutes(slotTime);
      const slotEnd = slotStart + serviceDuration;

      let available = true;

      for (const block of blockedTimes) {
        if (rangeOverlapsBlockedTime(block, slotStart, slotEnd)) {
          available = false;
          break;
        }
      }

      for (const booking of busyBookings) {
        const busyStart = timeToMinutes(booking.start_time);
        const busyEnd = timeToMinutes(booking.end_time) || busyStart + 30;

        if (
          busyStart !== null &&
          busyEnd !== null &&
          rangesOverlap(slotStart, slotEnd, busyStart, busyEnd)
        ) {
          available = false;
          break;
        }
      }

      return {
        time: slotTime,
        available,
      };
    });

    res.json({ slots });
  } catch (error) {
    res.status(500).json({
      error: error.message || "Error obteniendo horarios",
    });
  }
});

router.post("/public/:slug/book", async (req, res) => {
  try {
    const { slug } = req.params;

    const {
      clientName,
      clientPhone,
      comment,
      bookingDate,
      startTime,
      endTime,
      serviceId,
      service_id,
      staffId,
      staff_id,
    } = req.body;

    if (!clientName || !clientPhone) {
      return res.status(400).json({
        error: "Nombre y teléfono son obligatorios",
      });
    }

    if (!bookingDate || !startTime) {
      return res.status(400).json({
        error: "Fecha y horario son obligatorios",
      });
    }

    const professional = await getProfessionalBySlug(slug);

    if (!professional) {
      return res.status(404).json({
        error: "Profesional no encontrado",
      });
    }

    const finalServiceId = serviceId || service_id || null;
    const finalStaffId = staffId || staff_id || null;

    let service = null;
    let staff = null;

    if (finalServiceId) {
      service = await getServiceForProfessional(professional.id, finalServiceId);

      if (!service) {
        return res.status(404).json({
          error: "Servicio no encontrado",
        });
      }
    }

    if (finalStaffId) {
      staff = await getStaffForProfessional(
        professional.id,
        Number(finalStaffId)
      );

      if (!staff) {
        return res.status(404).json({
          error: "Profesional interno no encontrado",
        });
      }
    }

    const durationMinutes = service ? Number(service.duration_minutes || 30) : 30;
    const finalEndTime = endTime || addMinutesToTime(startTime, durationMinutes);

    const availability = await getAvailabilityForDate(
      professional.id,
      staff ? staff.id : null,
      normalizeDate(bookingDate)
    );

    if (!availability || !isAvailabilityActive(availability)) {
      return res.status(409).json({
        error: "Este profesional no trabaja en esa fecha",
      });
    }

    const available = await isTimeRangeAvailable(
      professional.id,
      staff ? staff.id : null,
      normalizeDate(bookingDate),
      normalizeTime(startTime),
      normalizeTime(finalEndTime),
      availability
    );

    if (!available) {
      return res.status(409).json({
        error: "Horario no disponible",
      });
    }

    const confirmationToken = createConfirmationToken();

    const result = await db.query(
      `
      INSERT INTO bookings (
        professional_id,
        staff_id,
        service_id,
        client_name,
        client_phone,
        comment,
        booking_date,
        start_time,
        end_time,
        status,
        confirmation_token,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', $10, NOW(), NOW())
      RETURNING *
      `,
      [
        professional.id,
        staff ? staff.id : null,
        finalServiceId ? Number(finalServiceId) : null,
        clientName,
        clientPhone,
        comment || null,
        normalizeDate(bookingDate),
        normalizeTime(startTime),
        normalizeTime(finalEndTime),
        confirmationToken,
      ]
    );

    const confirmationUrl = `${getFrontendUrl()}/confirmar-reserva/${confirmationToken}`;

    const normalizedBooking = normalizeBooking({
      ...result.rows[0],
      staff_name: staff ? staff.name : null,
      service_name: service ? service.name : null,
      service_duration_minutes: service ? service.duration_minutes : null,
      service_price: service ? service.price : null,
    });

    let whatsapp = { attempted: false, sent: false };

    try {
      whatsapp = await sendBookingConfirmationMessage(
        {
          ...normalizedBooking,
          client_phone: clientPhone,
          clientPhone,
          client_name: clientName,
          clientName,
          service_name: service ? service.name : "Servicio",
          serviceName: service ? service.name : "Servicio",
          staff_name: staff ? staff.name : null,
          staffName: staff ? staff.name : null,
          booking_date: normalizeDate(bookingDate),
          bookingDate: normalizeDate(bookingDate),
          start_time: normalizeTime(startTime),
          startTime: normalizeTime(startTime),
          confirmation_token: confirmationToken,
          confirmationToken,
        },
        {
          ...professional,
          business_name:
            professional.business_name || professional.name || "TuAgendaYa",
          businessName:
            professional.business_name || professional.name || "TuAgendaYa",
        }
      );
    } catch (whatsappError) {
      console.warn("WhatsApp confirmation skipped:", whatsappError.message);

      whatsapp = {
        attempted: true,
        sent: false,
        error: whatsappError.message || "No se pudo enviar WhatsApp",
      };
    }

    let businessWhatsapp = { attempted: false, sent: false };

    try {
      businessWhatsapp = await sendBusinessBookingNotification(
        {
          ...normalizedBooking,
          client_phone: clientPhone,
          clientPhone,
          client_name: clientName,
          clientName,
          service_name: service ? service.name : "Servicio",
          serviceName: service ? service.name : "Servicio",
          staff_name: staff ? staff.name : null,
          staffName: staff ? staff.name : null,
          booking_date: normalizeDate(bookingDate),
          bookingDate: normalizeDate(bookingDate),
          start_time: normalizeTime(startTime),
          startTime: normalizeTime(startTime),
        },
        professional
      );
    } catch (businessWhatsappError) {
      console.warn(
        "WhatsApp business notification skipped:",
        businessWhatsappError.message
      );

      businessWhatsapp = {
        attempted: true,
        sent: false,
        error:
          businessWhatsappError.message ||
          "No se pudo enviar WhatsApp al negocio",
      };
    }



    let pushNotification = { attempted: false, sent: 0 };

    try {
      pushNotification = await sendPushToProfessional(professional.id, {
        title: "Nueva reserva en TuAgendaYa",
        body: `${clientName} reservó ${service ? service.name : "un servicio"} para el ${normalizeDate(bookingDate)} a las ${normalizeTime(startTime)}`,
        icon: "/tuagendaya-logo.png",
        badge: "/tuagendaya-logo.png",
        url: "/profesional/dashboard",
        bookingId: result.rows[0].id,
        clientName,
        serviceName: service ? service.name : "Servicio",
        bookingDate: normalizeDate(bookingDate),
        startTime: normalizeTime(startTime),
      });
    } catch (pushError) {
      console.warn("Push notification skipped:", pushError.message);

      pushNotification = {
        attempted: true,
        sent: 0,
        error: pushError.message || "No se pudo enviar la notificación push",
      };
    }

    res.status(201).json({
      success: true,
      bookingId: result.rows[0].id,
      confirmationToken,
      confirmationUrl,
      whatsapp,
      businessWhatsapp,
      pushNotification,
      booking: normalizedBooking,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message || "Error creando reserva",
    });
  }
});

router.get("/public/confirmation/:token", async (req, res) => {
  try {
    const { token } = req.params;

    const result = await db.query(
      `
      SELECT
        b.*,
        s.name AS service_name,
        s.duration_minutes AS service_duration_minutes,
        s.price AS service_price,
        sm.name AS staff_name,
        p.name AS professional_name,
        p.business_name AS business_name
      FROM bookings b
      LEFT JOIN professional_services s ON s.id = b.service_id
      LEFT JOIN staff_members sm ON sm.id = b.staff_id
      INNER JOIN professionals p ON p.id = b.professional_id
      WHERE b.confirmation_token = $1
      LIMIT 1
      `,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Reserva no encontrada",
      });
    }

    res.json({
      booking: normalizePublicBooking(result.rows[0]),
    });
  } catch (error) {
    res.status(500).json({
      error: error.message || "Error obteniendo reserva",
    });
  }
});

router.patch("/public/confirmation/:token/confirm", async (req, res) => {
  try {
    const { token } = req.params;

    const result = await db.query(
      `
      UPDATE bookings
      SET
        status = 'confirmed',
        client_confirmed_at = NOW(),
        client_cancelled_at = NULL,
        updated_at = NOW()
      WHERE confirmation_token = $1
      RETURNING *
      `,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Reserva no encontrada",
      });
    }

    res.json({
      success: true,
      booking: normalizeBooking(result.rows[0]),
    });
  } catch (error) {
    res.status(500).json({
      error: error.message || "Error confirmando reserva",
    });
  }
});

router.patch("/public/confirmation/:token/cancel", async (req, res) => {
  try {
    await ensureCancellationSettingsColumns();

    const { token } = req.params;

    const bookingResult = await db.query(
      `
      SELECT
        b.*,
        p.allow_client_cancellations,
        p.cancellation_limit_minutes
      FROM bookings b
      INNER JOIN professionals p ON p.id = b.professional_id
      WHERE b.confirmation_token = $1
      LIMIT 1
      `,
      [token]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({
        error: "Reserva no encontrada",
      });
    }

    const booking = bookingResult.rows[0];

    if (booking.status === "cancelled") {
      return res.json({
        success: true,
        booking: normalizeBooking(booking),
      });
    }

    if (booking.status === "completed") {
      return res.status(409).json({
        error: "Esta reserva ya fue completada y no se puede cancelar desde el link.",
      });
    }

    const cancellationCheck = canClientCancelBooking(booking);

    if (!cancellationCheck.allowed) {
      return res.status(409).json({
        error: cancellationCheck.error || "Esta reserva ya no se puede cancelar desde el link.",
      });
    }

    const result = await db.query(
      `
      UPDATE bookings
      SET
        status = 'cancelled',
        client_cancelled_at = NOW(),
        updated_at = NOW()
      WHERE confirmation_token = $1
      RETURNING *
      `,
      [token]
    );

    res.json({
      success: true,
      booking: normalizeBooking(result.rows[0]),
    });
  } catch (error) {
    res.status(500).json({
      error: error.message || "Error cancelando reserva",
    });
  }
});

router.get("/me", async (req, res) => {
  try {
    const professionalId = getProfessionalIdFromRequest(req);

    const result = await db.query(
      `
      SELECT
        b.*,
        s.name AS service_name,
        s.duration_minutes AS service_duration_minutes,
        s.price AS service_price,
        sm.name AS staff_name
      FROM bookings b
      LEFT JOIN professional_services s ON s.id = b.service_id
      LEFT JOIN staff_members sm ON sm.id = b.staff_id
      WHERE b.professional_id = $1
      ORDER BY
        b.booking_date ASC NULLS LAST,
        b.start_time ASC NULLS LAST,
        b.created_at DESC
      `,
      [professionalId]
    );

    res.json({
      bookings: result.rows.map(normalizeBooking),
    });
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.message || "Error obteniendo reservas",
    });
  }
});

router.patch("/:id/confirm", async (req, res) => {
  try {
    const professionalId = getProfessionalIdFromRequest(req);
    const bookingId = Number(req.params.id);

    const result = await db.query(
      `
      UPDATE bookings
      SET
        status = 'confirmed',
        updated_at = NOW()
      WHERE id = $1 AND professional_id = $2
      RETURNING *
      `,
      [bookingId, professionalId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Reserva no encontrada",
      });
    }

    res.json({
      success: true,
      booking: normalizeBooking(result.rows[0]),
    });
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.message || "Error confirmando reserva",
    });
  }
});

router.patch("/:id/complete", async (req, res) => {
  try {
    const professionalId = getProfessionalIdFromRequest(req);
    const bookingId = Number(req.params.id);

    const result = await db.query(
      `
      UPDATE bookings
      SET
        status = 'completed',
        updated_at = NOW()
      WHERE id = $1 AND professional_id = $2
      RETURNING *
      `,
      [bookingId, professionalId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Reserva no encontrada",
      });
    }

    res.json({
      success: true,
      booking: normalizeBooking(result.rows[0]),
    });
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.message || "Error completando reserva",
    });
  }
});

router.patch("/:id/cancel", async (req, res) => {
  try {
    const professionalId = getProfessionalIdFromRequest(req);
    const bookingId = Number(req.params.id);

    const result = await db.query(
      `
      UPDATE bookings
      SET
        status = 'cancelled',
        client_cancelled_at = NOW(),
        updated_at = NOW()
      WHERE id = $1 AND professional_id = $2
      RETURNING *
      `,
      [bookingId, professionalId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Reserva no encontrada",
      });
    }

    res.json({
      success: true,
      booking: normalizeBooking(result.rows[0]),
    });
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.message || "Error cancelando reserva",
    });
  }
});

router.patch("/:id/payment", async (req, res) => {
  try {
    await ensurePaymentColumns();

    const professionalId = getProfessionalIdFromRequest(req);
    const bookingId = Number(req.params.id);

    if (!bookingId || Number.isNaN(bookingId)) {
      return res.status(400).json({
        error: "Reserva inválida",
      });
    }

    const allowedPaymentStatuses = ["pending", "paid", "deposit", "cancelled"];
    const allowedPaymentMethods = ["cash", "transfer", "card", "other"];

    const paymentStatus = String(
      req.body.paymentStatus ?? req.body.payment_status ?? "pending"
    ).trim();
    const paymentMethod = String(
      req.body.paymentMethod ?? req.body.payment_method ?? "cash"
    ).trim();
    const amountValue = req.body.amountPaid ?? req.body.amount_paid;

    if (!allowedPaymentStatuses.includes(paymentStatus)) {
      return res.status(400).json({
        error: "Estado de pago inválido",
      });
    }

    if (!allowedPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({
        error: "Método de pago inválido",
      });
    }

    let amountPaid = null;

    if (amountValue !== undefined && amountValue !== null && amountValue !== "") {
      amountPaid = Number(amountValue);

      if (Number.isNaN(amountPaid) || amountPaid < 0) {
        return res.status(400).json({
          error: "Monto cobrado inválido",
        });
      }
    }

    const result = await db.query(
      `
      UPDATE bookings
      SET
        payment_status = $1,
        payment_method = $2,
        amount_paid = $3,
        payment_updated_at = NOW(),
        updated_at = NOW()
      WHERE id = $4 AND professional_id = $5
      RETURNING *
      `,
      [paymentStatus, paymentMethod, amountPaid, bookingId, professionalId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Reserva no encontrada",
      });
    }

    res.json({
      success: true,
      booking: normalizeBooking(result.rows[0]),
    });
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.message || "Error guardando pago",
    });
  }
});

router.get("/cash-closures", async (req, res) => {
  try {
    await ensureCashClosuresTable();

    const professionalId = getProfessionalIdFromRequest(req);
    const from = normalizeDate(req.query.from || "");
    const to = normalizeDate(req.query.to || "");

    const conditions = ["professional_id = $1"];
    const params = [professionalId];

    if (from) {
      params.push(from);
      conditions.push(`closure_date >= $${params.length}`);
    }

    if (to) {
      params.push(to);
      conditions.push(`closure_date <= $${params.length}`);
    }

    const result = await db.query(
      `
      SELECT *
      FROM cash_closures
      WHERE ${conditions.join(" AND ")}
      ORDER BY closure_date DESC, id DESC
      `,
      params
    );

    res.json({
      closures: result.rows.map(normalizeCashClosure),
    });
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.message || "Error obteniendo cierres de caja",
    });
  }
});

router.post("/cash-closures", async (req, res) => {
  try {
    await ensureCashClosuresTable();

    const professionalId = getProfessionalIdFromRequest(req);
    const closureDate = normalizeDate(
      req.body.closureDate ?? req.body.closure_date
    );
    const notes =
      req.body.notes === undefined ? null : String(req.body.notes || "").trim();

    if (!closureDate) {
      return res.status(400).json({
        error: "La fecha del cierre es obligatoria",
      });
    }

    const summary = await calculateCashClosure(professionalId, closureDate);

    const result = await db.query(
      `
      INSERT INTO cash_closures (
        professional_id,
        closure_date,
        total_bookings,
        completed_bookings,
        pending_bookings,
        cancelled_bookings,
        total_generated,
        total_collected,
        total_pending,
        cash_total,
        transfer_total,
        card_total,
        other_total,
        services_summary,
        notes,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, $15, NOW(), NOW())
      ON CONFLICT (professional_id, closure_date)
      DO UPDATE SET
        total_bookings = EXCLUDED.total_bookings,
        completed_bookings = EXCLUDED.completed_bookings,
        pending_bookings = EXCLUDED.pending_bookings,
        cancelled_bookings = EXCLUDED.cancelled_bookings,
        total_generated = EXCLUDED.total_generated,
        total_collected = EXCLUDED.total_collected,
        total_pending = EXCLUDED.total_pending,
        cash_total = EXCLUDED.cash_total,
        transfer_total = EXCLUDED.transfer_total,
        card_total = EXCLUDED.card_total,
        other_total = EXCLUDED.other_total,
        services_summary = EXCLUDED.services_summary,
        notes = COALESCE(EXCLUDED.notes, cash_closures.notes),
        updated_at = NOW()
      RETURNING *
      `,
      [
        professionalId,
        closureDate,
        summary.totalBookings,
        summary.completedBookings,
        summary.pendingBookings,
        summary.cancelledBookings,
        summary.totalGenerated,
        summary.totalCollected,
        summary.totalPending,
        summary.cashTotal,
        summary.transferTotal,
        summary.cardTotal,
        summary.otherTotal,
        JSON.stringify(summary.servicesSummary),
        notes,
      ]
    );



    let pushNotification = { attempted: false, sent: 0 };

    try {
      pushNotification = await sendPushToProfessional(professional.id, {
        title: "Nueva reserva en TuAgendaYa",
        body: `${clientName} reservó ${service ? service.name : "un servicio"} para el ${normalizeDate(bookingDate)} a las ${normalizeTime(startTime)}`,
        icon: "/tuagendaya-logo.png",
        badge: "/tuagendaya-logo.png",
        url: "/profesional/dashboard",
        bookingId: result.rows[0].id,
        clientName,
        serviceName: service ? service.name : "Servicio",
        bookingDate: normalizeDate(bookingDate),
        startTime: normalizeTime(startTime),
      });
    } catch (pushError) {
      console.warn("Push notification skipped:", pushError.message);

      pushNotification = {
        attempted: true,
        sent: 0,
        error: pushError.message || "No se pudo enviar la notificación push",
      };
    }

    res.status(201).json({
      success: true,
      closure: normalizeCashClosure(result.rows[0]),
    });
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.message || "Error cerrando caja",
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const professionalId = getProfessionalIdFromRequest(req);
    const bookingId = Number(req.params.id);

    const result = await db.query(
      `
      SELECT
        b.*,
        s.name AS service_name,
        s.duration_minutes AS service_duration_minutes,
        s.price AS service_price,
        sm.name AS staff_name
      FROM bookings b
      LEFT JOIN professional_services s ON s.id = b.service_id
      LEFT JOIN staff_members sm ON sm.id = b.staff_id
      WHERE b.id = $1
        AND b.professional_id = $2
      LIMIT 1
      `,
      [bookingId, professionalId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Reserva no encontrada",
      });
    }

    res.json({
      booking: normalizeBooking(result.rows[0]),
    });
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.message || "Error obteniendo reserva",
    });
  }
});

module.exports = router;
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

function getMercadoPagoPublicKeyForBookings() {
  return process.env.MERCADOPAGO_PUBLIC_KEY || "";
}

async function getMercadoPagoAccessTokenForBookings(professionalId) {
  const result = await db.query(
    `SELECT access_token
     FROM professional_payment_connections
     WHERE professional_id = $1 AND provider = 'mercadopago'
     LIMIT 1`,
    [professionalId]
  );

  return result.rows[0]?.access_token || "";
}

function createBookingPaymentIdempotencyKey(parts = []) {
  return crypto
    .createHash("sha256")
    .update(parts.filter(Boolean).map(String).join("|"))
    .digest("hex")
    .slice(0, 64);
}

async function createCardPaymentForBooking({ amount, description, paymentData, professional, service, bookingDate, startTime }) {
  const accessToken = await getMercadoPagoAccessTokenForBookings(professional.id);

  if (!accessToken) {
    const error = new Error("Mercado Pago no está configurado");
    error.status = 503;
    throw error;
  }

  const numericAmount = Number(amount || 0);

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    const error = new Error("El servicio no tiene precio válido para pago online");
    error.status = 400;
    throw error;
  }

  const payer = paymentData?.payer || {};
  const payerEmail = String(payer.email || "").trim().toLowerCase();

  if (!payerEmail || !payerEmail.includes("@")) {
    const error = new Error("Ingresá un email válido para pagar con tarjeta");
    error.status = 400;
    throw error;
  }

  const payload = {
    transaction_amount: Number(numericAmount.toFixed(2)),
    token: paymentData.token,
    description,
    installments: Number(paymentData.installments || 1),
    payment_method_id: paymentData.payment_method_id || paymentData.paymentMethodId,
    issuer_id: paymentData.issuer_id || paymentData.issuerId,
    payer: {
      email: payerEmail,
      identification: payer.identification,
    },
    metadata: {
      type: "booking_card_payment",
      professional_id: String(professional.id),
      service_id: String(service.id),
    },
  };

  if (!payload.token) {
    const error = new Error("No se pudo validar la tarjeta");
    error.status = 400;
    throw error;
  }

  const response = await fetch("https://api.mercadopago.com/v1/payments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": createBookingPaymentIdempotencyKey([
        "booking",
        professional.id,
        service.id,
        bookingDate,
        startTime,
        payload.token,
      ]),
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error("Mercado Pago card payment error:", data);
    const error = new Error(data.message || data.error || "No se pudo procesar el pago");
    error.status = 502;
    throw error;
  }

  return data;
}

function getApiPublicUrl() {
  return process.env.API_PUBLIC_URL || "https://tuagendaya-api.onrender.com";
}

function normalizeMercadoPagoAmount(value) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) && amount > 0 ? Number(amount.toFixed(2)) : 0;
}

function getMercadoPagoCheckoutUrl(data = {}) {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN || "";
  const useSandbox = token.startsWith("TEST-") || process.env.MERCADOPAGO_USE_SANDBOX === "1";

  return useSandbox
    ? (data.sandbox_init_point || data.init_point || "")
    : (data.init_point || data.sandbox_init_point || "");
}

async function createBookingMercadoPagoPreference({ booking, professional, service, staff }) {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

  if (!accessToken) {
    const error = new Error("Mercado Pago no está configurado");
    error.status = 503;
    throw error;
  }

  const amount = normalizeMercadoPagoAmount(service?.price);

  if (amount <= 0) {
    const error = new Error("El servicio no tiene precio para pago online");
    error.status = 400;
    throw error;
  }

  const frontendUrl = getFrontendUrl();
  const apiUrl = getApiPublicUrl();
  const bookingId = booking.id;
  const token = booking.confirmation_token || booking.confirmationToken;

  const preferencePayload = {
    items: [
      {
        id: `booking-${bookingId}`,
        title: service?.name || "Reserva TuAgendaYa",
        description: `${professional.business_name || professional.name || "TuAgendaYa"}${staff?.name ? ` · ${staff.name}` : ""}`,
        quantity: 1,
        currency_id: process.env.PLAN_CURRENCY || "UYU",
        unit_price: amount,
      },
    ],
    payer: {
      name: booking.client_name || booking.clientName || "",
    },
    external_reference: `booking:${bookingId}:${token}`,
    metadata: {
      type: "booking",
      booking_id: String(bookingId),
      confirmation_token: token,
      professional_id: String(professional.id),
    },
    notification_url: `${apiUrl}/api/bookings/public/payment/mercadopago/webhook`,
    back_urls: {
      success: `${frontendUrl}/reservar/${professional.slug}?payment=success&booking_id=${bookingId}`,
      pending: `${frontendUrl}/reservar/${professional.slug}?payment=pending&booking_id=${bookingId}`,
      failure: `${frontendUrl}/reservar/${professional.slug}?payment=failure&booking_id=${bookingId}`,
    },
    auto_return: "approved",
  };

  const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(preferencePayload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error("Mercado Pago booking preference error:", data);
    const error = new Error(data.message || data.error || "No se pudo crear el pago online");
    error.status = 502;
    throw error;
  }

  return {
    preferenceId: data.id,
    initPoint: data.init_point,
    sandboxInitPoint: data.sandbox_init_point,
    url: getMercadoPagoCheckoutUrl(data),
    amount,
  };
}

async function verifyMercadoPagoBookingPayment(payment, bookingId) {
  const numericBookingId = Number(bookingId);

  if (!Number.isInteger(numericBookingId) || numericBookingId <= 0) {
    return { valid: false, reason: "invalid_booking_id", booking: null };
  }

  const bookingResult = await db.query(
    `
      SELECT
        b.id,
        b.professional_id,
        b.service_id,
        b.confirmation_token,
        COALESCE(ps.price, legacy.price, 0) AS expected_amount
      FROM bookings b
      LEFT JOIN professional_services ps
        ON ps.id = b.service_id
       AND ps.professional_id = b.professional_id
      LEFT JOIN services legacy
        ON legacy.id = b.service_id
       AND legacy.professional_id = b.professional_id
      WHERE b.id = $1
      LIMIT 1
    `,
    [numericBookingId]
  );

  const booking = bookingResult.rows[0] || null;

  if (!booking) {
    return { valid: false, reason: "booking_not_found", booking: null };
  }

  const expectedReference = `booking:${booking.id}:${booking.confirmation_token}`;
  const externalReference = String(payment?.external_reference || "");

  if (!booking.confirmation_token || externalReference !== expectedReference) {
    return { valid: false, reason: "external_reference_mismatch", booking };
  }

  const metadataBookingId = payment?.metadata?.booking_id;
  if (
    metadataBookingId !== undefined &&
    metadataBookingId !== null &&
    String(metadataBookingId) !== String(booking.id)
  ) {
    return { valid: false, reason: "metadata_booking_mismatch", booking };
  }

  const metadataToken = payment?.metadata?.confirmation_token;
  if (
    metadataToken !== undefined &&
    metadataToken !== null &&
    String(metadataToken) !== String(booking.confirmation_token)
  ) {
    return { valid: false, reason: "metadata_token_mismatch", booking };
  }

  const expectedAmount = normalizeMercadoPagoAmount(booking.expected_amount);
  const paidAmount = normalizeMercadoPagoAmount(payment?.transaction_amount);

  if (expectedAmount <= 0 || Math.abs(expectedAmount - paidAmount) > 0.01) {
    return { valid: false, reason: "amount_mismatch", booking };
  }

  const expectedCurrency = String(process.env.PLAN_CURRENCY || "UYU").trim().toUpperCase();
  const paymentCurrency = String(payment?.currency_id || "").trim().toUpperCase();

  if (paymentCurrency && paymentCurrency !== expectedCurrency) {
    return { valid: false, reason: "currency_mismatch", booking };
  }

  return { valid: true, reason: null, booking };
}

async function markBookingPaidFromMercadoPago({ bookingId, paymentId, paymentStatus, paymentMethodId, paymentTypeId, amountPaid }) {
  await ensurePaymentColumns();

  if (paymentStatus !== "approved") {
    return null;
  }

  const result = await db.query(
    `
      UPDATE bookings
      SET
        status = 'confirmed',
        client_confirmed_at = COALESCE(client_confirmed_at, NOW()),
        payment_status = 'paid',
        payment_method = 'online',
        amount_paid = CASE
          WHEN $2::numeric > 0 THEN $2::numeric
          WHEN COALESCE(amount_paid, 0) > 0 THEN amount_paid
          ELSE amount_paid
        END,
        payment_updated_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [bookingId, normalizeMercadoPagoAmount(amountPaid)]
  );

  if (result.rows[0]) {
    console.log("Booking Mercado Pago approved:", {
      bookingId,
      paymentId,
      paymentMethodId,
      paymentTypeId,
    });
  }

  return result.rows[0] || null;
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

async function ensureTipColumns() {
  await db.query(
    `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS tip_amount NUMERIC(10, 2) DEFAULT 0;`
  );
  await db.query(
    `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS tip_method TEXT;`
  );
  await db.query(
    `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS tip_updated_at TIMESTAMP;`
  );
}



function normalizePaymentMethodForBooking(value) {
  const clean = String(value || "cash").trim();
  const normalized = clean === "card" ? "online" : clean;
  return ["cash", "transfer", "online", "other"].includes(normalized) ? normalized : "cash";
}

function getServicePriceForAutoPayment(service) {
  const amount = Number(service?.price ?? 0);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

async function markBookingAutomaticallyPaid(whereSql, values) {
  await ensurePaymentColumns();
  await ensureTipColumns();

  const result = await db.query(
    `
      UPDATE bookings b
      SET
        status = 'confirmed',
        client_confirmed_at = NOW(),
        client_cancelled_at = NULL,
        payment_status = 'paid',
        payment_method = COALESCE(NULLIF(b.payment_method, ''), 'cash'),
        amount_paid = CASE
          WHEN COALESCE(b.amount_paid, 0) > 0 THEN b.amount_paid
          ELSE COALESCE((
            SELECT ps.price
            FROM professional_services ps
            WHERE ps.id = b.service_id
            LIMIT 1
          ), 0)
        END,
        payment_updated_at = NOW(),
        updated_at = NOW()
      WHERE ${whereSql}
      RETURNING *
    `,
    values
  );

  return result;
}

async function markBookingAutomaticallyCancelled(whereSql, values) {
  await ensurePaymentColumns();

  const result = await db.query(
    `
      UPDATE bookings b
      SET
        status = 'cancelled',
        client_cancelled_at = NOW(),
        client_confirmed_at = NULL,
        payment_status = CASE
          WHEN b.payment_method = 'online' AND b.payment_status = 'paid'
            THEN 'paid'
          ELSE 'cancelled'
        END,
        amount_paid = CASE
          WHEN b.payment_method = 'online' AND b.payment_status = 'paid'
            THEN b.amount_paid
          ELSE 0
        END,
        payment_updated_at = NOW(),
        updated_at = NOW()
      WHERE ${whereSql}
      RETURNING *
    `,
    values
  );

  return result;
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
    total_tips: row.total_tips || 0,
    totalTips: row.total_tips || 0,
    total_collected_with_tips: row.total_collected_with_tips || row.total_collected || 0,
    totalCollectedWithTips: row.total_collected_with_tips || row.total_collected || 0,
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
  await ensureCashClosuresTable();  await ensureTipColumns();


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
    (booking) =>
      booking.status !== "cancelled" ||
      (booking.payment_method === "online" && booking.payment_status === "paid")
  );

  const getPrice = (booking) => Number(booking.service_price || 0) || 0;
  const getPaid = (booking) => Number(booking.amount_paid || 0) || 0;
  const getTip = (booking) => Number(booking.tip_amount || 0) || 0;

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

  const totalTips = activeBookings.reduce(
    (sum, booking) => sum + getTip(booking),
    0
  );

  const totalCollectedWithTips = totalCollected + totalTips;
  const totalPending = activeBookings.reduce(
    (sum, booking) => sum + Math.max(getPrice(booking) - getPaid(booking), 0),
    0
  );

  const methodTotal = (method) =>
    activeBookings
      .filter((booking) => (booking.payment_method || "cash") === method)
      .reduce((sum, booking) => sum + getPaid(booking), 0);

  const tipMethodTotal = (method) =>
    activeBookings
      .filter((booking) => (booking.tip_method || booking.payment_method || "cash") === method)
      .reduce((sum, booking) => sum + getTip(booking), 0);

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
    totalTips,
    totalCollectedWithTips,
    totalPending,
    cashTotal: methodTotal("cash"),
    transferTotal: methodTotal("transfer"),
    cardTotal: methodTotal("card"),
    otherTotal: methodTotal("other"),
    cashTips: tipMethodTotal("cash"),
    transferTips: tipMethodTotal("transfer"),
    cardTips: tipMethodTotal("card"),
    otherTips: tipMethodTotal("other"),
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
    tip_amount: row.tip_amount || 0,
    tipAmount: row.tip_amount || 0,
    tip_method: row.tip_method || row.payment_method || 'cash',
    tipMethod: row.tip_method || row.payment_method || 'cash',
    tip_updated_at: row.tip_updated_at,
    tipUpdatedAt: row.tip_updated_at,
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
  const allowed = ['cash', 'transfer', 'online'];
  const list = Array.isArray(value) ? value : String(value || 'cash,transfer,online').split(',');
  const clean = list
    .map((item) => String(item || '').trim())
    .map((item) => (item === 'card' ? 'online' : item))
    .filter((item) => allowed.includes(item));
  return clean.length > 0 ? Array.from(new Set(clean)) : ['cash', 'transfer', 'online'];
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

async function ensureProfessionalServicesTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS professional_services (
      id SERIAL PRIMARY KEY,
      professional_id INTEGER NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      duration_minutes INTEGER DEFAULT 30,
      price NUMERIC(10, 2) DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `).catch(() => {});

  await db.query(`ALTER TABLE professional_services ADD COLUMN IF NOT EXISTS description TEXT;`).catch(() => {});
  await db.query(`ALTER TABLE professional_services ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 30;`).catch(() => {});
  await db.query(`ALTER TABLE professional_services ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2) DEFAULT 0;`).catch(() => {});
  await db.query(`ALTER TABLE professional_services ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;`).catch(() => {});
  await db.query(`ALTER TABLE professional_services ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`).catch(() => {});
  await db.query(`ALTER TABLE professional_services ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`).catch(() => {});
}


async function syncLegacyServicesToProfessionalTable(professionalId) {
  await ensureProfessionalServicesTable();

  const legacyServices = (await db.query(
    `SELECT id, name, description, duration, price, active
     FROM services
     WHERE professional_id = $1
       AND (active IS NULL OR active::text IN ('1','true','t'))
       AND TRIM(COALESCE(name, '')) <> ''
     ORDER BY id ASC`,
    [professionalId]
  ).catch(() => ({ rows: [] }))).rows;

  for (const service of legacyServices) {
    const exists = (await db.query(
      `SELECT id
       FROM professional_services
       WHERE professional_id = $1
         AND LOWER(TRIM(name)) = LOWER(TRIM($2))
       LIMIT 1`,
      [professionalId, service.name]
    )).rows[0];

    if (!exists) {
      await db.query(
        `INSERT INTO professional_services
           (professional_id, name, description, duration_minutes, price, is_active)
         VALUES ($1, $2, $3, $4, $5, TRUE)`,
        [
          professionalId,
          service.name,
          service.description || null,
          Number(service.duration || 30) || 30,
          Number(service.price) || 0,
        ]
      );
    }
  }
}


async function getPublicServicesForProfessional(professionalId) {
  await ensureProfessionalServicesTable();
  await syncLegacyServicesToProfessionalTable(professionalId).catch((error) => {
    console.warn("syncLegacyServicesToProfessionalTable skipped:", error.message);
  });

  const result = await db.query(
    `
    SELECT id, professional_id, name, description, duration_minutes, price, is_active, created_at, updated_at
    FROM professional_services
    WHERE professional_id = $1
      AND (is_active IS NULL OR is_active::text IN ('1','true','t'))
      AND TRIM(COALESCE(name, '')) <> ''
    ORDER BY id ASC
    `,
    [professionalId]
  );

  return result.rows.map(normalizePublicService);
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

  await ensureProfessionalServicesTable();
  await syncLegacyServicesToProfessionalTable(professionalId).catch((error) => {
    console.warn("syncLegacyServicesToProfessionalTable skipped:", error.message);
  });

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

  if (result.rows[0]) {
    return result.rows[0];
  }

  const legacy = await db.query(
    `
    SELECT
      id,
      professional_id,
      name,
      description,
      duration AS duration_minutes,
      price,
      active AS is_active
    FROM services
    WHERE id = $1
      AND professional_id = $2
      AND (active IS NULL OR active::text IN ('1','true','t'))
    LIMIT 1
    `,
    [Number(serviceId), professionalId]
  ).catch(() => ({ rows: [] }));

  return legacy.rows[0] || null;
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

    if (staffId) {
      const staff = await getStaffForProfessional(professionalId, Number(staffId));

      if (!staff) {
        return res.status(404).json({
          error: "Profesional interno no encontrado",
        });
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

    const professionalServices = (await db.query(
      `
      SELECT id, professional_id, name, description, duration_minutes, price, is_active, created_at, updated_at
      FROM professional_services
      WHERE professional_id = $1
        AND (is_active IS NULL OR is_active::text IN ('1','true','t'))
        AND TRIM(COALESCE(name, '')) <> ''
      ORDER BY id ASC
      `,
      [professional.id]
    ).catch(() => ({ rows: [] }))).rows;

    const legacyServices = (await db.query(
      `
      SELECT id, professional_id, name, description, duration AS duration_minutes, price, active AS is_active, created_at, updated_at
      FROM services
      WHERE professional_id = $1
        AND (active IS NULL OR active::text IN ('1','true','t'))
        AND TRIM(COALESCE(name, '')) <> ''
      ORDER BY id ASC
      `,
      [professional.id]
    ).catch(() => ({ rows: [] }))).rows;

    const byName = new Set();
    const services = [...professionalServices, ...legacyServices]
      .filter((service) => {
        const key = String(service.name || "").trim().toLowerCase();
        if (!key || byName.has(key)) return false;
        byName.add(key);
        return true;
      })
      .map(normalizePublicService);

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

router.get("/public/payment/mercadopago/public-key", async (req, res) => {
  try {
    const publicKey = getMercadoPagoPublicKeyForBookings();

    if (!publicKey) {
      return res.status(503).json({ error: "MERCADOPAGO_PUBLIC_KEY no configurada" });
    }

    res.json({ publicKey });
  } catch (error) {
    res.status(500).json({ error: "Error obteniendo Public Key" });
  }
});

router.post("/public/:slug/book", async (req, res) => {
  try {
    await ensurePaymentColumns();

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
      paymentMethod,
      payment_method,
      paymentData,
      payment_data,
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
    const finalPaymentMethod = normalizePaymentMethodForBooking(paymentMethod ?? payment_method);
    const onlinePaymentData = paymentData || payment_data || null;
    let approvedOnlinePayment = null;

    if (finalPaymentMethod === "online" && !onlinePaymentData) {
      return res.status(400).json({
        error: "Para pagar online es obligatorio completar y validar los datos de pago.",
      });
    }

    if (finalPaymentMethod === "online" && onlinePaymentData) {
      const amount = Number(service ? service.price || 0 : 0);

      approvedOnlinePayment = await createCardPaymentForBooking({
        amount,
        description: `${service ? service.name : "Reserva"} - ${professional.business_name || professional.name || "TuAgendaYa"}`,
        paymentData: onlinePaymentData,
        professional,
        service,
        bookingDate: normalizeDate(bookingDate),
        startTime: normalizeTime(startTime),
      });

      if (approvedOnlinePayment.status !== "approved") {
        return res.status(402).json({
          error: approvedOnlinePayment.status_detail || "El pago no fue aprobado",
          paymentStatus: approvedOnlinePayment.status,
          paymentStatusDetail: approvedOnlinePayment.status_detail,
        });
      }
    }

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
        payment_status,
        payment_method,
        amount_paid,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $12, $10, $13, $11, $14, NOW(), NOW())
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
        finalPaymentMethod,
        approvedOnlinePayment ? "confirmed" : "pending",
        "paid",
        Number(service ? service.price || 0 : 0),
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

    const onlinePayment = null;

    res.status(201).json({
      success: true,
      bookingId: result.rows[0].id,
      confirmationToken,
      confirmationUrl,
      whatsapp,
      businessWhatsapp,
      pushNotification,
      booking: normalizedBooking,
      onlinePayment,
      payment: approvedOnlinePayment ? {
        id: approvedOnlinePayment.id,
        status: approvedOnlinePayment.status,
        statusDetail: approvedOnlinePayment.status_detail,
      } : null,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message || "Error creando reserva",
    });
  }
});


router.post("/public/payment/mercadopago/webhook", async (req, res) => {
  try {
    const topic = req.query.topic || req.query.type || req.body?.type;
    const paymentId =
      req.query.id ||
      req.query["data.id"] ||
      req.body?.data?.id ||
      req.body?.id;

    if (!paymentId || !String(topic || "").includes("payment")) {
      return res.status(200).json({ received: true, ignored: true });
    }

    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

    if (!accessToken) {
      return res.status(200).json({ received: true, ignored: true, reason: "missing_access_token" });
    }

    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const payment = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("Mercado Pago booking payment lookup error:", payment);
      return res.status(200).json({ received: true, lookupError: true });
    }

    const externalReference = String(payment.external_reference || "");
    const match = externalReference.match(/^booking:(\d+):(.+)$/);

    if (!match) {
      return res.status(200).json({ received: true, ignored: true, externalReference });
    }

    const bookingId = Number(match[1]);
    const verification = await verifyMercadoPagoBookingPayment(payment, bookingId);

    if (!verification.valid) {
      console.warn("Mercado Pago booking payment ignored:", {
        bookingId,
        paymentId: payment.id,
        reason: verification.reason,
      });

      return res.status(200).json({
        received: true,
        ignored: true,
        reason: verification.reason,
      });
    }

    await markBookingPaidFromMercadoPago({
      bookingId,
      paymentId: payment.id,
      paymentStatus: payment.status,
      paymentMethodId: payment.payment_method_id,
      paymentTypeId: payment.payment_type_id,
      amountPaid: payment.transaction_amount,
    });

    res.status(200).json({ received: true });
  } catch (error) {
    console.error("Booking Mercado Pago webhook error:", error);
    res.status(200).json({ received: true, error: true });
  }
});

router.post("/public/:slug/book/:bookingId/sync-mercadopago", async (req, res) => {
  try {
    const { bookingId } = req.params;
    const paymentId =
      req.body?.paymentId ||
      req.body?.payment_id ||
      req.query.payment_id ||
      req.query.collection_id;

    if (!paymentId) {
      return res.status(400).json({ error: "payment_id requerido" });
    }

    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

    if (!accessToken) {
      return res.status(503).json({ error: "Mercado Pago no está configurado" });
    }

    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const payment = await response.json().catch(() => ({}));

    if (!response.ok) {
      return res.status(502).json({ error: "No se pudo verificar el pago" });
    }

    const verification = await verifyMercadoPagoBookingPayment(
      payment,
      Number(bookingId)
    );

    if (!verification.valid) {
      return res.status(403).json({
        error: "El pago no corresponde exactamente a esta reserva",
      });
    }

    const updatedBooking = await markBookingPaidFromMercadoPago({
      bookingId: Number(bookingId),
      paymentId: payment.id,
      paymentStatus: payment.status,
      paymentMethodId: payment.payment_method_id,
      paymentTypeId: payment.payment_type_id,
      amountPaid: payment.transaction_amount,
    });

    res.json({
      success: payment.status === "approved",
      status: payment.status,
      booking: updatedBooking ? normalizeBooking(updatedBooking) : null,
    });
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.message || "Error sincronizando pago online",
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

    const result = await markBookingAutomaticallyPaid(
      "b.confirmation_token = $1 AND b.status NOT IN ('cancelled', 'completed')",
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

    const result = await markBookingAutomaticallyCancelled(
      "b.confirmation_token = $1",
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
    await ensureTipColumns();

    const professionalId = getProfessionalIdFromRequest(req);
    const bookingId = Number(req.params.id);

    if (!bookingId || Number.isNaN(bookingId)) {
      return res.status(400).json({
        error: "Reserva inválida",
      });
    }

    const allowedPaymentStatuses = ["pending", "paid", "deposit", "cancelled"];
    const allowedPaymentMethods = ["cash", "transfer", "online", "other"];

    const paymentStatus = String(
      req.body.paymentStatus ?? req.body.payment_status ?? "pending"
    ).trim();
    const rawPaymentMethod = String(
      req.body.paymentMethod ?? req.body.payment_method ?? "cash"
    ).trim();
    const paymentMethod = rawPaymentMethod === "card" ? "online" : rawPaymentMethod;
    const amountValue = req.body.amountPaid ?? req.body.amount_paid;
    const tipValue = req.body.tipAmount ?? req.body.tip_amount;
    let tipMethod = String(req.body.tipMethod ?? req.body.tip_method ?? paymentMethod).trim() || paymentMethod;
    if (tipMethod === "card") tipMethod = "online";

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

    if (!allowedPaymentMethods.includes(tipMethod)) {
      tipMethod = paymentMethod;
    }

    let amountPaid = null;
    let tipAmount = 0;

    if (amountValue !== undefined && amountValue !== null && amountValue !== "") {
      amountPaid = Number(amountValue);

      if (Number.isNaN(amountPaid) || amountPaid < 0) {
        return res.status(400).json({
          error: "Monto cobrado inválido",
        });
      }
    }

    if (tipValue !== undefined && tipValue !== null && tipValue !== "") {
      tipAmount = Number(tipValue);

      if (Number.isNaN(tipAmount) || tipAmount < 0) {
        return res.status(400).json({
          error: "Propina inválida",
        });
      }
    }

    if (paymentStatus === "paid" && (amountPaid === null || amountPaid === undefined)) {
      const priceResult = await db.query(
        `
          SELECT COALESCE(ps.price, 0) AS price
          FROM bookings b
          LEFT JOIN professional_services ps ON ps.id = b.service_id
          WHERE b.id = $1 AND b.professional_id = $2
          LIMIT 1
        `,
        [bookingId, professionalId]
      );

      amountPaid = getServicePriceForAutoPayment(priceResult.rows[0]);
    }

    if (paymentStatus === "cancelled") {
      amountPaid = 0;
      tipAmount = 0;
      tipMethod = paymentMethod || "cash";
    }

    const result = await db.query(
      `
      UPDATE bookings
      SET
        payment_status = $1,
        payment_method = $2,
        amount_paid = $3,
        payment_updated_at = NOW(),
        tip_amount = $4,
        tip_method = $5,
        tip_updated_at = NOW(),
        updated_at = NOW()
      WHERE id = $6 AND professional_id = $7
      RETURNING *
      `,
      [paymentStatus, paymentMethod, amountPaid, tipAmount, tipMethod, bookingId, professionalId]
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
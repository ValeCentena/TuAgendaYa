const express = require("express");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const db = require("../db");

const router = express.Router();

function getTokenFromHeader(req) {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}


function getLaunchPromotionConfig(professional = {}) {
  const freeMonths = Number(professional.promo_free_months ?? process.env.PROMO_FREE_MONTHS ?? 2) || 2;
  const discountMonths = Number(professional.promo_discount_months ?? process.env.PROMO_DISCOUNT_MONTHS ?? 2) || 2;
  const discountPercent = Number(professional.promo_discount_percent ?? process.env.PROMO_DISCOUNT_PERCENT ?? 50) || 50;
  const basePrice = Number(professional.plan_price ?? process.env.PLAN_BASE_PRICE ?? 600) || 600;
  const currency = professional.plan_currency || process.env.PLAN_CURRENCY || "UYU";
  const startedAt = professional.promo_started_at || professional.created_at || new Date().toISOString();

  return {
    freeMonths,
    discountMonths,
    discountPercent,
    basePrice,
    currency,
    startedAt,
  };
}

function addMonthsSafe(date, months) {
  const copy = new Date(date);
  const day = copy.getDate();
  copy.setMonth(copy.getMonth() + months);

  if (copy.getDate() < day) {
    copy.setDate(0);
  }

  return copy;
}

function getPromotionState(professional = {}) {
  const config = getLaunchPromotionConfig(professional);
  const startDate = new Date(config.startedAt);

  if (Number.isNaN(startDate.getTime())) {
    return {
      stage: "normal",
      label: "Precio normal",
      daysLeft: 0,
      amount: config.basePrice,
      baseAmount: config.basePrice,
      discountPercent: 0,
      currency: config.currency,
      startedAt: config.startedAt,
      freeUntil: null,
      discountUntil: null,
    };
  }

  const now = new Date();
  const freeUntilDate = addMonthsSafe(startDate, config.freeMonths);
  const discountUntilDate = addMonthsSafe(freeUntilDate, config.discountMonths);
  const dayMs = 24 * 60 * 60 * 1000;

  if (now < freeUntilDate) {
    return {
      stage: "free",
      label: `${config.freeMonths} meses gratis`,
      daysLeft: Math.max(0, Math.ceil((freeUntilDate.getTime() - now.getTime()) / dayMs)),
      amount: 0,
      baseAmount: config.basePrice,
      discountPercent: 100,
      currency: config.currency,
      startedAt: startDate.toISOString(),
      freeUntil: freeUntilDate.toISOString(),
      discountUntil: discountUntilDate.toISOString(),
    };
  }

  if (now < discountUntilDate) {
    const amount = Math.round(config.basePrice * (100 - config.discountPercent)) / 100;
    return {
      stage: "discount",
      label: `${config.discountPercent}% de descuento`,
      daysLeft: Math.max(0, Math.ceil((discountUntilDate.getTime() - now.getTime()) / dayMs)),
      amount,
      baseAmount: config.basePrice,
      discountPercent: config.discountPercent,
      currency: config.currency,
      startedAt: startDate.toISOString(),
      freeUntil: freeUntilDate.toISOString(),
      discountUntil: discountUntilDate.toISOString(),
    };
  }

  return {
    stage: "normal",
    label: "Precio normal",
    daysLeft: 0,
    amount: config.basePrice,
    baseAmount: config.basePrice,
    discountPercent: 0,
    currency: config.currency,
    startedAt: startDate.toISOString(),
    freeUntil: freeUntilDate.toISOString(),
    discountUntil: discountUntilDate.toISOString(),
  };
}

async function ensureProfessionalPromotion(professionalId) {
  const freeMonths = Number(process.env.PROMO_FREE_MONTHS || 2) || 2;
  const discountMonths = Number(process.env.PROMO_DISCOUNT_MONTHS || 2) || 2;
  const discountPercent = Number(process.env.PROMO_DISCOUNT_PERCENT || 50) || 50;
  const basePrice = Number(process.env.PLAN_BASE_PRICE || 600) || 600;
  const currency = process.env.PLAN_CURRENCY || "UYU";

  await db.query(
    `
      UPDATE professionals
      SET
        promo_started_at = COALESCE(promo_started_at, created_at, NOW()),
        promo_free_months = COALESCE(promo_free_months, $2),
        promo_discount_months = COALESCE(promo_discount_months, $3),
        promo_discount_percent = COALESCE(promo_discount_percent, $4),
        plan_price = COALESCE(plan_price, $5),
        plan_currency = COALESCE(plan_currency, $6),
        monthly_limit = COALESCE(monthly_limit, 1000)
      WHERE id = $1
    `,
    [professionalId, freeMonths, discountMonths, discountPercent, basePrice, currency]
  );
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
    const id = decoded.id || decoded.professionalId || decoded.professional_id || decoded.userId || decoded.user_id;
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

function requireAdmin(req) {
  const token = getTokenFromHeader(req);

  if (!token) {
    const error = new Error("Token admin requerido");
    error.status = 401;
    throw error;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const adminEmail = String(process.env.ADMIN_EMAIL || "").toLowerCase();
    const decodedEmail = String(decoded.email || decoded.adminEmail || "").toLowerCase();

    if (decoded.role === "admin" || decoded.isAdmin || (adminEmail && decodedEmail === adminEmail)) {
      return decoded;
    }

    const error = new Error("Acceso admin requerido");
    error.status = 403;
    throw error;
  } catch (error) {
    error.status = error.status || 401;
    error.message = error.message || "Token admin inválido";
    throw error;
  }
}

function getFrontendUrl() {
  return process.env.FRONTEND_URL || "https://tuagendaya.com";
}

function getApiUrl() {
  return process.env.API_PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || "https://tuagendaya-api.onrender.com";
}

function parseMercadoPagoSignatureHeader(xSignature = "") {
  return String(xSignature)
    .split(",")
    .map((part) => part.trim().split("="))
    .reduce((acc, [key, value]) => {
      if (key && value) acc[key] = value;
      return acc;
    }, {});
}

function validateMercadoPagoSignature(req, paymentId) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;

  if (!secret) {
    return { required: false, valid: null, reason: "secret_not_configured" };
  }

  const xSignature = req.headers["x-signature"] || "";
  const xRequestId = req.headers["x-request-id"] || "";
  const parsed = parseMercadoPagoSignatureHeader(xSignature);
  const ts = parsed.ts;
  const v1 = parsed.v1;

  if (!xSignature || !xRequestId || !ts || !v1 || !paymentId) {
    return { required: true, valid: false, reason: "missing_signature_data" };
  }

  const manifest = `id:${paymentId};request-id:${xRequestId};ts:${ts};`;
  const hash = crypto.createHmac("sha256", secret).update(manifest).digest("hex");

  const expected = Buffer.from(hash, "hex");
  const received = Buffer.from(v1, "hex");

  if (expected.length !== received.length) {
    return { required: true, valid: false, reason: "signature_length_mismatch" };
  }

  const valid = crypto.timingSafeEqual(expected, received);

  return { required: true, valid, reason: valid ? "valid" : "invalid_signature" };
}

function mapMercadoPagoStatus(status) {
  const normalized = String(status || "").trim().toLowerCase();

  if (normalized === "approved") return "approved";
  if (["pending", "in_process", "authorized"].includes(normalized)) return "pending";
  if (["rejected", "cancelled", "canceled"].includes(normalized)) return "failed";
  if (["refunded", "charged_back"].includes(normalized)) return normalized;

  return normalized || "pending";
}

function getPaymentIdFromNotification(req) {
  return (
    req.query["data.id"] ||
    req.query.data_id ||
    req.body?.data?.id ||
    req.body?.id ||
    req.body?.resource ||
    ""
  );
}

function getPaymentTypeFromNotification(req) {
  return String(req.query.type || req.body?.type || req.body?.topic || req.query.topic || "").trim();
}

async function updatePaymentAttemptFromMercadoPago(planPaymentId, paymentId, paymentData, mappedStatus, signatureResult) {
  await db.query(
    `UPDATE plan_payments
     SET mp_payment_id = $2,
         mp_status = $3,
         mp_status_detail = $4,
         webhook_event_id = $5,
         webhook_signature_validated = $6,
         raw_payload = $7,
         updated_at = NOW()
     WHERE id = $1`,
    [
      planPaymentId,
      String(paymentId),
      String(paymentData.status || mappedStatus || ""),
      paymentData.status_detail || null,
      paymentData.id ? String(paymentData.id) : String(paymentId),
      signatureResult.valid === true,
      paymentData,
    ]
  );
}

async function markPaymentAttemptFailed(planPaymentId, paymentId, paymentData, mappedStatus, signatureResult) {
  const updated = await db.query(
    `UPDATE plan_payments
     SET status = $2,
         mp_payment_id = $3,
         mp_status = $4,
         mp_status_detail = $5,
         webhook_event_id = $6,
         webhook_signature_validated = $7,
         raw_payload = $8,
         seen_by_admin = FALSE,
         notified_at = NOW(),
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      planPaymentId,
      mappedStatus,
      String(paymentId),
      String(paymentData.status || mappedStatus || ""),
      paymentData.status_detail || null,
      paymentData.id ? String(paymentData.id) : String(paymentId),
      signatureResult.valid === true,
      paymentData,
    ]
  );

  const payment = updated.rows[0];

  if (payment) {
    await db.query(
      `UPDATE professionals
       SET plan_payment_status = CASE
             WHEN plan_payment_status = 'paid' AND plan_expires_at IS NOT NULL AND plan_expires_at > NOW() THEN plan_payment_status
             ELSE 'pending'
           END,
           billing_method = 'mercadopago',
           updated_at = NOW()
       WHERE id = $1`,
      [payment.professional_id]
    );
  }

  return payment;
}

function getPlanAmount(professional) {
  const professionalPrice = Number(professional?.plan_price || 0);
  const envPrice = Number(process.env.PLAN_BASE_PRICE || 0);

  if (professionalPrice > 0) {
    return professionalPrice;
  }

  return envPrice > 0 ? envPrice : 0;
}

function getPlanCurrency(professional) {
  return professional.plan_currency || process.env.PLAN_CURRENCY || "UYU";
}

function createReference() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return crypto.randomBytes(18).toString("hex");
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + Number(days || 30));
  return result;
}

async function ensureBillingSchema() {

  await db.query(`ALTER TABLE professionals ADD COLUMN IF NOT EXISTS promo_started_at TIMESTAMP`).catch(() => {});
  await db.query(`ALTER TABLE professionals ADD COLUMN IF NOT EXISTS promo_free_months INTEGER DEFAULT 2`).catch(() => {});
  await db.query(`ALTER TABLE professionals ADD COLUMN IF NOT EXISTS promo_discount_months INTEGER DEFAULT 2`).catch(() => {});
  await db.query(`ALTER TABLE professionals ADD COLUMN IF NOT EXISTS promo_discount_percent INTEGER DEFAULT 50`).catch(() => {});

  await db.query(`ALTER TABLE professionals ADD COLUMN IF NOT EXISTS plan_payment_status TEXT DEFAULT 'pending';`);
  await db.query(`ALTER TABLE professionals ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMP;`);
  await db.query(`ALTER TABLE professionals ADD COLUMN IF NOT EXISTS last_payment_at TIMESTAMP;`);
  await db.query(`ALTER TABLE professionals ADD COLUMN IF NOT EXISTS billing_method TEXT;`);
  await db.query(`ALTER TABLE professionals ADD COLUMN IF NOT EXISTS plan_price NUMERIC(10, 2) DEFAULT 0;`);
  await db.query(`ALTER TABLE professionals ADD COLUMN IF NOT EXISTS plan_currency TEXT DEFAULT 'UYU';`);
  await db.query(`ALTER TABLE plan_payments ADD COLUMN IF NOT EXISTS seen_by_admin BOOLEAN DEFAULT FALSE;`).catch(() => {});
  await db.query(`ALTER TABLE plan_payments ADD COLUMN IF NOT EXISTS notified_at TIMESTAMP;`).catch(() => {});
  await db.query(`
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

  await db.query(`ALTER TABLE plan_payments ADD COLUMN IF NOT EXISTS mp_status TEXT;`).catch(() => {});
  await db.query(`ALTER TABLE plan_payments ADD COLUMN IF NOT EXISTS mp_status_detail TEXT;`).catch(() => {});
  await db.query(`ALTER TABLE plan_payments ADD COLUMN IF NOT EXISTS webhook_event_id TEXT;`).catch(() => {});
  await db.query(`ALTER TABLE plan_payments ADD COLUMN IF NOT EXISTS webhook_signature_validated BOOLEAN DEFAULT FALSE;`).catch(() => {});
  await db.query(`CREATE INDEX IF NOT EXISTS idx_plan_payments_mp_payment_id ON plan_payments(mp_payment_id);`).catch(() => {});
}

function bankInfo() {
  return {
    bankName: process.env.BANK_NAME || "",
    accountHolder: process.env.BANK_ACCOUNT_HOLDER || "",
    accountNumber: process.env.BANK_ACCOUNT_NUMBER || "",
    accountType: process.env.BANK_ACCOUNT_TYPE || "Caja de ahorro",
    note: process.env.BANK_TRANSFER_NOTE || "",
  };
}

async function getProfessional(professionalId) {
  const result = await db.query("SELECT * FROM professionals WHERE id = $1", [professionalId]);
  return result.rows[0] || null;
}

async function getLatestPayment(professionalId) {
  const result = await db.query(
    `SELECT * FROM plan_payments WHERE professional_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [professionalId]
  );
  return result.rows[0] || null;
}


function hasFuturePlanExpiration(professional) {
  const raw = professional?.plan_expires_at || professional?.planExpiresAt;

  if (!raw) return false;

  const expires = new Date(raw);

  if (Number.isNaN(expires.getTime())) return false;

  return expires.getTime() > Date.now();
}

async function normalizePaidStatusFromExpiration(professional) {
  if (!professional || !professional.id) return professional;

  const shouldBePaid = hasFuturePlanExpiration(professional);

  if (!shouldBePaid || professional.plan_payment_status === "paid") {
    return professional;
  }

  const result = await db.query(
    `UPDATE professionals
     SET plan_payment_status = 'paid',
         status = 'active',
         billing_method = COALESCE(NULLIF(billing_method, ''), 'mercadopago'),
         last_payment_at = COALESCE(last_payment_at, NOW()),
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [professional.id]
  );

  return result.rows[0] || professional;
}


function serializePlan(professional, latestPayment) {
  const promotion = getPromotionState(professional);
  const isPaidByExpiration = hasFuturePlanExpiration(professional);
  const status = isPaidByExpiration
    ? "paid"
    : professional.plan_payment_status || (latestPayment?.status === "pending" && latestPayment?.method === "transfer" ? "pending_transfer" : "pending");

  return {
    plan: isPaidByExpiration && String(professional.plan || "gratis").toLowerCase() === "gratis" ? "Profesional" : professional.plan || "gratis",
    monthlyLimit: Number(professional.monthly_limit || 1000),
    monthly_limit: Number(professional.monthly_limit || 1000),
    paymentStatus: status,
    payment_status: status,
    expiresAt: professional.plan_expires_at || null,
    expires_at: professional.plan_expires_at || null,
    lastPaymentAt: professional.last_payment_at || latestPayment?.approved_at || null,
    last_payment_at: professional.last_payment_at || latestPayment?.approved_at || null,
    billingMethod: professional.billing_method || latestPayment?.method || null,
    billing_method: professional.billing_method || latestPayment?.method || null,
    amount: promotion.amount,
    baseAmount: promotion.baseAmount,
    base_amount: promotion.baseAmount,
    currency: promotion.currency,
    graceDays: Number(process.env.PLAN_GRACE_DAYS || 5),
    grace_days: Number(process.env.PLAN_GRACE_DAYS || 5),
    promotion,
    transferReference: latestPayment?.transfer_reference || `TuAgendaYa-${professional.id}`,
    transfer_reference: latestPayment?.transfer_reference || `TuAgendaYa-${professional.id}`,
    latestPayment,
    latest_payment: latestPayment,
  };
}

async function approvePayment(paymentId, rawPayload = null) {
  await ensureBillingSchema();

  const paymentResult = await db.query("SELECT * FROM plan_payments WHERE id = $1", [paymentId]);
  const payment = paymentResult.rows[0];

  if (!payment) return null;

  const currentProfessional = await getProfessional(payment.professional_id);
  const currentExpires = currentProfessional?.plan_expires_at ? new Date(currentProfessional.plan_expires_at) : new Date();
  const baseDate = currentExpires > new Date() ? currentExpires : new Date();
  const nextExpires = addDays(baseDate, payment.period_days || 30);

  const updatedPayment = await db.query(
    `UPDATE plan_payments
     SET status = 'approved',
         approved_at = NOW(),
         expires_at = $2,
         raw_payload = COALESCE($3, raw_payload),
         seen_by_admin = FALSE,
         notified_at = NOW(),
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [paymentId, nextExpires, rawPayload]
  );

  await db.query(
    `UPDATE professionals
     SET status = 'active',
         plan_payment_status = 'paid',
         plan_expires_at = $2,
         last_payment_at = NOW(),
         billing_method = $3,
         updated_at = NOW()
     WHERE id = $1`,
    [payment.professional_id, nextExpires, payment.method]
  );

  return updatedPayment.rows[0];
}

router.get("/me/plan", async (req, res, next) => {
  try {
    await ensureBillingSchema();
    const professionalId = getProfessionalIdFromRequest(req);
    const professional = await getProfessional(professionalId);

    if (!professional) {
      return res.status(404).json({ error: "Profesional no encontrado" });
    }

    await ensureProfessionalPromotion(professionalId);

    const normalizedProfessional = await normalizePaidStatusFromExpiration(professional);
    const latestPayment = await getLatestPayment(professionalId);
    res.json({ plan: serializePlan(normalizedProfessional, latestPayment) });
  } catch (error) {
    next(error);
  }
});

router.post("/me/transfer", async (req, res, next) => {
  try {
    await ensureBillingSchema();
    const professionalId = getProfessionalIdFromRequest(req);
    const professional = await getProfessional(professionalId);

    if (!professional) {
      return res.status(404).json({ error: "Profesional no encontrado" });
    }

    const reference = `TY-${professionalId}`;
    const amount = getPlanAmount(professional);
    const currency = getPlanCurrency(professional);

    await db.query(
      `UPDATE professionals
       SET billing_method = 'transfer',
           updated_at = NOW()
       WHERE id = $1`,
      [professionalId]
    );

    res.json({
      ok: true,
      payment: {
        method: "transfer",
        amount,
        currency,
        transferReference: reference,
        transferConcept: `TuAgendaYa plan ${professional.business_name || professional.name || professional.email}`,
      },
      bankInfo: bankInfo(),
    });
  } catch (error) {
    next(error);
  }
});

router.post("/me/transfer-notify", async (req, res, next) => {
  try {
    await ensureBillingSchema();
    const professionalId = getProfessionalIdFromRequest(req);
    const professional = await getProfessional(professionalId);

    if (!professional) {
      return res.status(404).json({ error: "Profesional no encontrado" });
    }

    const reference = `TY-${professionalId}`;
    const amount = getPlanAmount(professional);
    const currency = getPlanCurrency(professional);

    const existing = await db.query(
      `SELECT *
       FROM plan_payments
       WHERE professional_id = $1
         AND method = 'transfer'
         AND status = 'pending'
       ORDER BY created_at DESC
       LIMIT 1`,
      [professionalId]
    );

    let payment;

    if (existing.rows[0]) {
      const updated = await db.query(
        `UPDATE plan_payments
         SET amount = $2,
             currency = $3,
             transfer_reference = $4,
             transfer_note = $5,
             seen_by_admin = FALSE,
             notified_at = NOW(),
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [
          existing.rows[0].id,
          amount,
          currency,
          reference,
          req.body?.note || "El profesional avisó que realizó la transferencia.",
        ]
      );
      payment = updated.rows[0];
    } else {
      const inserted = await db.query(
        `INSERT INTO plan_payments
         (professional_id, method, status, amount, currency, plan, period_days, transfer_reference, transfer_note, seen_by_admin, notified_at)
         VALUES ($1, 'transfer', 'pending', $2, $3, $4, 30, $5, $6, FALSE, NOW())
         RETURNING *`,
        [
          professionalId,
          amount,
          currency,
          professional.plan || "base",
          reference,
          req.body?.note || "El profesional avisó que realizó la transferencia.",
        ]
      );
      payment = inserted.rows[0];
    }

    await db.query(
      `UPDATE professionals
       SET billing_method = 'transfer',
           plan_payment_status = 'pending_transfer',
           updated_at = NOW()
       WHERE id = $1`,
      [professionalId]
    );

    res.json({ ok: true, payment, bankInfo: bankInfo() });
  } catch (error) {
    next(error);
  }
});

router.post("/me/checkout", async (req, res, next) => {
  try {
    await ensureBillingSchema();
    const professionalId = getProfessionalIdFromRequest(req);
    const professional = await getProfessional(professionalId);

    if (!professional) {
      return res.status(404).json({ error: "Profesional no encontrado" });
    }

    await ensureProfessionalPromotion(professionalId);

    const promotion = getPromotionState(professional);

    if (promotion.stage === "free") {
      return res.status(400).json({
        ok: false,
        error: "Tu cuenta todavía está dentro de los meses gratis. No corresponde pagar ahora.",
        promotion,
      });
    }

    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

    if (!accessToken) {
      return res.status(500).json({ error: "Falta configurar MERCADOPAGO_ACCESS_TOKEN en Render." });
    }

    const amount = Number(promotion.amount || 0);

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Falta configurar el precio del plan." });
    }

    const currency = promotion.currency || getPlanCurrency(professional);
    const reference = createReference();

    const paymentInsert = await db.query(
      `INSERT INTO plan_payments
       (professional_id, method, status, amount, currency, plan, period_days, transfer_reference)
       VALUES ($1, 'mercadopago', 'pending', $2, $3, $4, 30, $5)
       RETURNING *`,
      [professionalId, amount, currency, professional.plan || "base", reference]
    );

    const planPayment = paymentInsert.rows[0];
    const externalReference = `plan_payment:${planPayment.id}`;

    const preference = {
      items: [
        {
          title: `TuAgendaYa - Plan ${professional.plan || "Base"}`,
          quantity: 1,
          currency_id: currency,
          unit_price: amount,
        },
      ],
      payer: {
        email: professional.email,
        name: professional.name,
      },
      external_reference: externalReference,
      back_urls: {
        success: `${getFrontendUrl()}/profesional/dashboard?payment=success`,
        failure: `${getFrontendUrl()}/profesional/dashboard?payment=failure`,
        pending: `${getFrontendUrl()}/profesional/dashboard?payment=pending`,
      },
      auto_return: "approved",
      notification_url: `${getApiUrl()}/api/payments/webhook/mercadopago?source_news=webhooks`,
      statement_descriptor: "TUAGENDAYA",
      metadata: {
        professional_id: professionalId,
        plan_payment_id: planPayment.id,
      },
    };

    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preference),
    });

    const mpData = await mpResponse.json().catch(() => ({}));

    if (!mpResponse.ok) {
      await db.query("UPDATE plan_payments SET status = 'failed', raw_payload = $2, updated_at = NOW() WHERE id = $1", [planPayment.id, mpData]);
      return res.status(500).json({ error: mpData.message || "Mercado Pago no pudo crear el checkout." });
    }

    const checkoutUrl = mpData.init_point || mpData.sandbox_init_point || "";

    await db.query(
      `UPDATE plan_payments
       SET mp_preference_id = $2,
           checkout_url = $3,
           raw_payload = $4,
           updated_at = NOW()
       WHERE id = $1`,
      [planPayment.id, mpData.id, checkoutUrl, mpData]
    );

    await db.query(
      `UPDATE professionals
       SET plan_payment_status = 'pending',
           billing_method = 'mercadopago',
           updated_at = NOW()
       WHERE id = $1`,
      [professionalId]
    );

    res.json({ ok: true, checkoutUrl, preferenceId: mpData.id, paymentId: planPayment.id });
  } catch (error) {
    next(error);
  }
});



router.post("/sync-mercadopago-return", async (req, res, next) => {
  try {
    await ensureBillingSchema();

    const paymentId = String(req.body?.paymentId || req.body?.collectionId || req.query.payment_id || req.query.collection_id || "").trim();

    if (!paymentId) {
      return res.status(400).json({
        ok: false,
        error: "Falta payment_id de Mercado Pago.",
      });
    }

    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

    if (!accessToken) {
      return res.status(500).json({
        ok: false,
        error: "Falta configurar MERCADOPAGO_ACCESS_TOKEN en Render.",
      });
    }

    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const paymentData = await paymentResponse.json().catch(() => ({}));

    if (!paymentResponse.ok) {
      return res.status(502).json({
        ok: false,
        error: "Mercado Pago no pudo confirmar el pago.",
        details: paymentData?.message || null,
      });
    }

    const externalReference = String(paymentData.external_reference || "");
    const match = externalReference.match(/^plan_payment:(\d+)$/);

    if (!match) {
      return res.status(400).json({
        ok: false,
        error: "Este pago no pertenece a un plan de TuAgendaYa.",
        externalReference,
      });
    }

    const planPaymentId = Number(match[1]);
    const planPaymentResult = await db.query(
      `SELECT * FROM plan_payments WHERE id = $1`,
      [planPaymentId]
    );

    const planPayment = planPaymentResult.rows[0];

    if (!planPayment) {
      return res.status(404).json({
        ok: false,
        error: "No se encontró el intento de pago en TuAgendaYa.",
        planPaymentId,
      });
    }

    const mappedStatus = mapMercadoPagoStatus(paymentData.status);
    const signatureResult = { required: false, valid: null, reason: "public_return_sync" };

    await updatePaymentAttemptFromMercadoPago(planPaymentId, paymentId, paymentData, mappedStatus, signatureResult);

    let updatedPayment = null;

    if (mappedStatus === "approved") {
      updatedPayment = await approvePayment(planPaymentId, paymentData);
    } else if (["failed", "refunded", "charged_back"].includes(mappedStatus)) {
      updatedPayment = await markPaymentAttemptFailed(planPaymentId, paymentId, paymentData, mappedStatus, signatureResult);
    }

    const professional = await normalizePaidStatusFromExpiration(await getProfessional(planPayment.professional_id));
    const latestPayment = await getLatestPayment(planPayment.professional_id);

    return res.json({
      ok: true,
      synced: true,
      paymentId,
      planPaymentId,
      professionalId: planPayment.professional_id,
      mercadoPagoStatus: paymentData.status || null,
      status: mappedStatus,
      payment: updatedPayment || latestPayment,
      plan: professional ? serializePlan(professional, latestPayment) : null,
    });
  } catch (error) {
    next(error);
  }
});


router.post("/me/sync-mercadopago", async (req, res, next) => {
  try {
    await ensureBillingSchema();

    const professionalId = getProfessionalIdFromRequest(req);
    const paymentId = String(req.body?.paymentId || req.body?.collectionId || req.query.payment_id || req.query.collection_id || "").trim();

    if (!paymentId) {
      return res.status(400).json({
        ok: false,
        error: "Falta payment_id de Mercado Pago.",
      });
    }

    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

    if (!accessToken) {
      return res.status(500).json({
        ok: false,
        error: "Falta configurar MERCADOPAGO_ACCESS_TOKEN en Render.",
      });
    }

    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const paymentData = await paymentResponse.json().catch(() => ({}));

    if (!paymentResponse.ok) {
      return res.status(502).json({
        ok: false,
        error: "Mercado Pago no pudo confirmar el pago.",
        details: paymentData?.message || null,
      });
    }

    const externalReference = String(paymentData.external_reference || "");
    const match = externalReference.match(/^plan_payment:(\d+)$/);

    if (!match) {
      return res.status(400).json({
        ok: false,
        error: "Este pago no pertenece a un plan de TuAgendaYa.",
        externalReference,
      });
    }

    const planPaymentId = Number(match[1]);

    const planPaymentResult = await db.query(
      `SELECT * FROM plan_payments WHERE id = $1 AND professional_id = $2`,
      [planPaymentId, professionalId]
    );

    if (planPaymentResult.rows.length === 0) {
      return res.status(403).json({
        ok: false,
        error: "Este pago no pertenece a esta cuenta profesional.",
      });
    }

    const mappedStatus = mapMercadoPagoStatus(paymentData.status);
    const signatureResult = { required: false, valid: null, reason: "manual_return_sync" };

    await updatePaymentAttemptFromMercadoPago(planPaymentId, paymentId, paymentData, mappedStatus, signatureResult);

    let updatedPayment = null;

    if (mappedStatus === "approved") {
      updatedPayment = await approvePayment(planPaymentId, paymentData);
    } else if (["failed", "refunded", "charged_back"].includes(mappedStatus)) {
      updatedPayment = await markPaymentAttemptFailed(planPaymentId, paymentId, paymentData, mappedStatus, signatureResult);
    }

    const professional = await normalizePaidStatusFromExpiration(await getProfessional(professionalId));
    const latestPayment = await getLatestPayment(professionalId);

    return res.json({
      ok: true,
      synced: true,
      paymentId,
      planPaymentId,
      mercadoPagoStatus: paymentData.status || null,
      status: mappedStatus,
      payment: updatedPayment || latestPayment,
      plan: professional ? serializePlan(professional, latestPayment) : null,
    });
  } catch (error) {
    next(error);
  }
});


router.get("/webhook/mercadopago/health", (req, res) => {
  res.json({
    ok: true,
    service: "tuagendaya-mercadopago-webhook",
    mode: process.env.MERCADOPAGO_WEBHOOK_SECRET ? "signature_enabled" : "signature_optional",
  });
});

router.post("/webhook/mercadopago", async (req, res, next) => {
  try {
    await ensureBillingSchema();

    const type = getPaymentTypeFromNotification(req);
    const paymentId = getPaymentIdFromNotification(req);

    if (type && type !== "payment") {
      return res.json({ ok: true, ignored: true, type });
    }

    if (!paymentId) {
      return res.json({ ok: true, ignored: true, reason: "missing_payment_id" });
    }

    const signatureResult = validateMercadoPagoSignature(req, paymentId);

    if (signatureResult.required && !signatureResult.valid) {
      return res.status(401).json({ ok: false, error: "invalid_mercadopago_signature" });
    }

    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

    if (!accessToken) {
      return res.status(500).json({ ok: false, error: "missing_access_token" });
    }

    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const paymentData = await paymentResponse.json().catch(() => ({}));

    if (!paymentResponse.ok) {
      return res.status(200).json({ ok: false, error: "mercadopago_payment_lookup_failed" });
    }

    const externalReference = String(paymentData.external_reference || "");
    const match = externalReference.match(/^plan_payment:(\d+)$/);

    if (!match) {
      return res.json({ ok: true, ignored: true, reason: "external_reference_not_tuagendaya" });
    }

    const planPaymentId = Number(match[1]);
    const mappedStatus = mapMercadoPagoStatus(paymentData.status);

    await updatePaymentAttemptFromMercadoPago(planPaymentId, paymentId, paymentData, mappedStatus, signatureResult);

    if (mappedStatus === "approved") {
      await approvePayment(planPaymentId, paymentData);
    } else if (["failed", "refunded", "charged_back"].includes(mappedStatus)) {
      await markPaymentAttemptFailed(planPaymentId, paymentId, paymentData, mappedStatus, signatureResult);
    }

    return res.json({
      ok: true,
      paymentId: String(paymentId),
      planPaymentId,
      mercadoPagoStatus: paymentData.status || null,
      status: mappedStatus,
      signature: signatureResult.reason,
    });
  } catch (error) {
    next(error);
  }
});



// TEMPORARY TEST ENDPOINT: disable launch promotion for one professional account.
// Remove after Mercado Pago testing.


module.exports = router;

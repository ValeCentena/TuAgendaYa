const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const db = require("../db");

const router = express.Router();

const PASSWORD_RESET_EXPIRES_IN = "30m";


const EMAIL_VERIFICATION_EXPIRES_IN = "20m";
const EMAIL_VERIFICATION_CODE_TTL_MS = 10 * 60 * 1000;
const EMAIL_VERIFICATION_SEND_COOLDOWN_MS = 60 * 1000;
const EMAIL_VERIFICATION_WINDOW_MS = 15 * 60 * 1000;
const EMAIL_VERIFICATION_MAX_SENDS = 5;
const EMAIL_VERIFICATION_MAX_CHECKS = 8;
const emailVerificationCodes = new Map();
const emailVerificationSendAttempts = new Map();
const emailVerificationCheckAttempts = new Map();

function getEmailVerificationSecret() {
  const jwtSecret = String(process.env.JWT_SECRET || "").trim();

  if (!jwtSecret) {
    throw new Error("JWT_SECRET no configurado");
  }

  return crypto
    .createHash("sha256")
    .update(`tuagendaya-email-verification:${jwtSecret}`)
    .digest("hex");
}

function normalizeRegistrationPhone(value) {
  const raw = String(value || "").trim();
  const digits = raw.replace(/\D/g, "");

  if (!digits) return "";

  if (raw.startsWith("+")) {
    return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : "";
  }

  if (digits.startsWith("598") && digits.length === 11) {
    return `+${digits}`;
  }

  if (digits.startsWith("09") && digits.length === 9) {
    return `+598${digits.slice(1)}`;
  }

  if (digits.startsWith("9") && digits.length === 8) {
    return `+598${digits}`;
  }

  if (digits.length === 8) {
    return `+598${digits}`;
  }

  if (digits.length >= 9 && digits.length <= 15) {
    return `+${digits}`;
  }

  return "";
}

function normalizeRegistrationEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidRegistrationEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function hashEmailVerificationCode(email, code) {
  return crypto
    .createHmac("sha256", getEmailVerificationSecret())
    .update(`${email}:${code}`)
    .digest("hex");
}

async function isEmailAlreadyRegistered(email) {
  const result = await db.query(
    `
    SELECT id
    FROM professionals
    WHERE LOWER(email) = $1
    LIMIT 1
    `,
    [normalizeRegistrationEmail(email)]
  );

  return result.rows.length > 0;
}

function consumeRateLimit(store, key, maxAttempts, windowMs, cooldownMs = 0) {
  const now = Date.now();
  let record = store.get(key);

  if (!record || record.resetAt <= now) {
    record = { count: 0, resetAt: now + windowMs, lastAt: 0 };
  }

  if (cooldownMs > 0 && record.lastAt && now - record.lastAt < cooldownMs) {
    const retryAfter = Math.max(1, Math.ceil((cooldownMs - (now - record.lastAt)) / 1000));
    const error = new Error(`Esperá ${retryAfter} segundos antes de solicitar otro código.`);
    error.statusCode = 429;
    error.retryAfter = retryAfter;
    throw error;
  }

  if (record.count >= maxAttempts) {
    const retryAfter = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
    const error = new Error("Demasiados intentos de verificación. Intentá nuevamente más tarde.");
    error.statusCode = 429;
    error.retryAfter = retryAfter;
    throw error;
  }

  record.count += 1;
  record.lastAt = now;
  store.set(key, record);
  return record;
}

function getPasswordResetSecret() {
  const jwtSecret = String(process.env.JWT_SECRET || "").trim();

  if (!jwtSecret) {
    throw new Error("JWT_SECRET no configurado");
  }

  return crypto
    .createHash("sha256")
    .update(`tuagendaya-password-reset:${jwtSecret}`)
    .digest("hex");
}

function getPasswordFingerprint(passwordHash) {
  return crypto
    .createHash("sha256")
    .update(String(passwordHash || ""))
    .digest("hex");
}

function getFrontendBaseUrl() {
  return String(
    process.env.CORS_ORIGIN ||
      process.env.FRONTEND_URL ||
      "https://tuagendaya.com"
  )
    .trim()
    .replace(/\/+$/, "");
}

function createMailTransport() {
  const host = String(process.env.SMTP_HOST || "").trim();
  const user = String(process.env.SMTP_USER || "").trim();
  const pass = String(process.env.SMTP_PASS || "");
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";

  if (!host || !user || !pass || !Number.isFinite(port)) {
    throw new Error("Configuración SMTP incompleta");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

function createToken(professional) {
  return jwt.sign(
    {
      id: professional.id,
      professionalId: professional.id,
      email: professional.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: "30d" }
  );
}

function getTokenFromHeader(req) {
  const authHeader = req.headers.authorization || "";

  if (!authHeader.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.slice(7);
}

function normalizeSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeProfessional(row) {
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    businessName: row.business_name,
    business_name: row.business_name,
    email: row.email,
    phone: row.phone,
    profession: row.profession,
    address: row.address,
    slug: row.slug,
    status: row.status,
    createdAt: row.created_at,
    created_at: row.created_at,
  };
}

async function authMiddleware(req, res, next) {
  try {
    const token = getTokenFromHeader(req);

    if (!token) {
      return res.status(401).json({ error: "Token requerido" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const professionalId =
      decoded.id ||
      decoded.professionalId ||
      decoded.professional_id ||
      decoded.userId ||
      decoded.user_id;

    if (!professionalId) {
      return res.status(401).json({ error: "Token inválido" });
    }

    const result = await db.query(
      `
      SELECT id, name, business_name, email, phone, profession, address, slug, status, created_at
      FROM professionals
      WHERE id = $1
      LIMIT 1
      `,
      [professionalId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Profesional no encontrado" });
    }

    if (result.rows[0].status !== "active") {
      return res.status(403).json({ error: "Cuenta suspendida" });
    }

    req.professional = result.rows[0];
    next();
  } catch (error) {
    return res.status(401).json({ error: "Token inválido" });
  }
}


router.post("/email-verification/send", async (req, res) => {
  try {
    const email = normalizeRegistrationEmail(req.body?.email);

    if (!email || !isValidRegistrationEmail(email)) {
      return res.status(400).json({ error: "Ingresá un email válido." });
    }

    if (await isEmailAlreadyRegistered(email)) {
      return res.status(409).json({ error: "Ese email ya está registrado." });
    }

    const rateKey = `${req.ip || "unknown"}:${email}`;
    consumeRateLimit(
      emailVerificationSendAttempts,
      rateKey,
      EMAIL_VERIFICATION_MAX_SENDS,
      EMAIL_VERIFICATION_WINDOW_MS,
      EMAIL_VERIFICATION_SEND_COOLDOWN_MS
    );

    const code = String(crypto.randomInt(100000, 1000000));
    emailVerificationCodes.set(email, {
      digest: hashEmailVerificationCode(email, code),
      expiresAt: Date.now() + EMAIL_VERIFICATION_CODE_TTL_MS,
    });

    const transporter = createMailTransport();
    await transporter.sendMail({
      from: process.env.SMTP_FROM || "TuAgendaYa <no-reply@tuagendaya.com>",
      to: email,
      subject: "Código de verificación de TuAgendaYa",
      text: [
        "Verificá tu correo para continuar con el registro en TuAgendaYa.",
        "",
        `Tu código es: ${code}`,
        "",
        "El código vence en 10 minutos.",
        "Si no intentaste crear una cuenta, podés ignorar este correo.",
      ].join("\n"),
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1d1d1f;line-height:1.5;">
          <h2 style="margin:0 0 16px;color:#0071e3;">TuAgendaYa</h2>
          <p>Verificá tu correo para continuar con el registro.</p>
          <div style="margin:24px 0;padding:18px;border-radius:16px;background:#f5f7fa;text-align:center;">
            <div style="font-size:13px;color:#6e6e73;margin-bottom:8px;">Código de verificación</div>
            <div style="font-size:32px;font-weight:800;letter-spacing:8px;color:#111827;">${code}</div>
          </div>
          <p style="font-size:14px;color:#6e6e73;">El código vence en 10 minutos.</p>
          <p style="font-size:14px;color:#6e6e73;">Si no intentaste crear una cuenta, podés ignorar este correo.</p>
        </div>
      `,
    });

    return res.json({
      success: true,
      email,
      resendAfterSeconds: Math.ceil(EMAIL_VERIFICATION_SEND_COOLDOWN_MS / 1000),
    });
  } catch (error) {
    if (error.retryAfter) {
      res.set("Retry-After", String(error.retryAfter));
    }

    console.error("Error email verification send:", error.message);
    return res.status(error.statusCode || 500).json({
      error: error.message || "No se pudo enviar el código de verificación.",
    });
  }
});

router.post("/email-verification/check", async (req, res) => {
  try {
    const email = normalizeRegistrationEmail(req.body?.email);
    const code = String(req.body?.code || "").replace(/\D/g, "").slice(0, 6);

    if (!email || !isValidRegistrationEmail(email)) {
      return res.status(400).json({ error: "Email inválido." });
    }

    if (code.length !== 6) {
      return res.status(400).json({ error: "Ingresá el código de 6 dígitos." });
    }

    const rateKey = `${req.ip || "unknown"}:${email}`;
    consumeRateLimit(
      emailVerificationCheckAttempts,
      rateKey,
      EMAIL_VERIFICATION_MAX_CHECKS,
      EMAIL_VERIFICATION_WINDOW_MS
    );

    const pending = emailVerificationCodes.get(email);
    if (!pending || pending.expiresAt <= Date.now()) {
      emailVerificationCodes.delete(email);
      return res.status(400).json({ error: "El código venció. Solicitá uno nuevo." });
    }

    const receivedDigest = hashEmailVerificationCode(email, code);
    const expectedBuffer = Buffer.from(pending.digest, "hex");
    const receivedBuffer = Buffer.from(receivedDigest, "hex");
    const matches =
      expectedBuffer.length === receivedBuffer.length &&
      crypto.timingSafeEqual(expectedBuffer, receivedBuffer);

    if (!matches) {
      return res.status(400).json({ error: "El código no es correcto." });
    }

    if (await isEmailAlreadyRegistered(email)) {
      emailVerificationCodes.delete(email);
      return res.status(409).json({ error: "Ese email ya está registrado." });
    }

    const verificationToken = jwt.sign(
      {
        purpose: "professional_registration_email_verified",
        email,
      },
      getEmailVerificationSecret(),
      { expiresIn: EMAIL_VERIFICATION_EXPIRES_IN }
    );

    emailVerificationCodes.delete(email);
    emailVerificationCheckAttempts.delete(rateKey);

    return res.json({
      success: true,
      email,
      verificationToken,
    });
  } catch (error) {
    if (error.retryAfter) {
      res.set("Retry-After", String(error.retryAfter));
    }

    console.error("Error email verification check:", error.message);
    return res.status(error.statusCode || 500).json({
      error: error.message || "No se pudo verificar el código.",
    });
  }
});

router.post("/register", async (req, res) => {
  try {
    const {
      name,
      businessName,
      business_name,
      email,
      password,
      phone,
      profession,
      address,
      slug,
      emailVerificationToken,
    } = req.body;

    const cleanName = String(name || "").trim();
    const cleanBusinessName = String(businessName || business_name || "").trim();
    const cleanEmail = normalizeRegistrationEmail(email);
    const cleanPassword = String(password || "");
    const cleanPhone = normalizeRegistrationPhone(phone);
    const cleanProfession = String(profession || "").trim();
    const cleanAddress = String(address || "").trim();
    const cleanSlug = normalizeSlug(slug || cleanBusinessName || cleanName);

    if (!cleanName) {
      return res.status(400).json({ error: "El nombre es obligatorio" });
    }

    if (!cleanBusinessName) {
      return res.status(400).json({ error: "El nombre del negocio es obligatorio" });
    }

    if (!cleanPhone) {
      return res.status(400).json({ error: "El teléfono es obligatorio y debe ser válido" });
    }

    if (!cleanEmail || !isValidRegistrationEmail(cleanEmail)) {
      return res.status(400).json({ error: "El email es obligatorio y debe ser válido" });
    }

    let verifiedEmailPayload;
    try {
      verifiedEmailPayload = jwt.verify(
        String(emailVerificationToken || ""),
        getEmailVerificationSecret()
      );
    } catch {
      return res.status(403).json({ error: "Primero verificá tu correo para crear la cuenta" });
    }

    if (
      verifiedEmailPayload?.purpose !== "professional_registration_email_verified" ||
      verifiedEmailPayload?.email !== cleanEmail
    ) {
      return res.status(403).json({ error: "La verificación no corresponde al correo ingresado" });
    }

    if (!cleanPassword || cleanPassword.length < 8) {
      return res.status(400).json({ error: "La contraseña debe tener mínimo 8 caracteres" });
    }

    if (!cleanProfession) {
      return res.status(400).json({ error: "El rubro o profesión es obligatorio" });
    }

    if (!cleanAddress) {
      return res.status(400).json({ error: "La dirección es obligatoria" });
    }

    if (!cleanSlug || cleanSlug.length < 3) {
      return res.status(400).json({ error: "El link público debe tener mínimo 3 caracteres" });
    }

    const existingEmail = await db.query(
      `
      SELECT id
      FROM professionals
      WHERE email = $1
      LIMIT 1
      `,
      [cleanEmail]
    );

    if (existingEmail.rows.length > 0) {
      return res.status(409).json({ error: "Ese email ya está registrado" });
    }

    const existingSlug = await db.query(
      `
      SELECT id
      FROM professionals
      WHERE slug = $1
      LIMIT 1
      `,
      [cleanSlug]
    );

    if (existingSlug.rows.length > 0) {
      return res.status(409).json({ error: "Ese link público ya está en uso" });
    }

    const passwordHash = await bcrypt.hash(cleanPassword, 12);

    const result = await db.query(
      `
      INSERT INTO professionals (
        name,
        business_name,
        email,
        password_hash,
        phone,
        profession,
        address,
        slug,
        status,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', NOW(), NOW())
      RETURNING id, name, business_name, email, phone, profession, address, slug, status, created_at
      `,
      [
        cleanName,
        cleanBusinessName,
        cleanEmail,
        passwordHash,
        cleanPhone || null,
        cleanProfession,
        cleanAddress,
        cleanSlug,
      ]
    );

    const professional = normalizeProfessional(result.rows[0]);
    const token = createToken(result.rows[0]);

    res.status(201).json({
      success: true,
      token,
      professional,
    });
  } catch (error) {
    console.error("Error register:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({ error: "Email y contraseña son obligatorios" });
    }

    const result = await db.query(
      `
      SELECT *
      FROM professionals
      WHERE email = $1
      LIMIT 1
      `,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const professionalRow = result.rows[0];

    if (professionalRow.status !== "active") {
      return res.status(403).json({ error: "Cuenta inactiva" });
    }

    const validPassword = await bcrypt.compare(password, professionalRow.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const token = createToken(professionalRow);

    res.json({
      success: true,
      token,
      professional: normalizeProfessional(professionalRow),
    });
  } catch (error) {
    console.error("Error login:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.get("/me", authMiddleware, async (req, res) => {
  res.json({
    professional: normalizeProfessional(req.professional),
  });
});

router.post("/change-password", authMiddleware, async (req, res) => {
  try {
    const currentPassword = req.body.currentPassword || req.body.current_password;
    const newPassword = req.body.newPassword || req.body.new_password;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Faltan campos" });
    }

    if (String(newPassword).length < 8) {
      return res.status(400).json({ error: "La nueva contraseña debe tener mínimo 8 caracteres" });
    }

    const result = await db.query(
      `
      SELECT *
      FROM professionals
      WHERE id = $1
      LIMIT 1
      `,
      [req.professional.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Profesional no encontrado" });
    }

    const validPassword = await bcrypt.compare(currentPassword, result.rows[0].password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: "Contraseña actual incorrecta" });
    }

    const hash = await bcrypt.hash(newPassword, 12);

    await db.query(
      `
      UPDATE professionals
      SET password_hash = $1, updated_at = NOW()
      WHERE id = $2
      `,
      [hash, req.professional.id]
    );

    res.json({ success: true, message: "Contraseña actualizada" });
  } catch (error) {
    console.error("Error change-password:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.get("/check-slug/:slug", async (req, res) => {
  try {
    const slug = normalizeSlug(req.params.slug);

    const result = await db.query(
      `
      SELECT id
      FROM professionals
      WHERE slug = $1
      LIMIT 1
      `,
      [slug]
    );

    res.json({
      available: result.rows.length === 0,
      slug,
    });
  } catch (error) {
    console.error("Error check-slug:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.post("/forgot-password", async (req, res) => {
  const genericMessage =
    "Si el email existe, se enviarán instrucciones para recuperar la contraseña.";

  try {
    const email = String(req.body.email || "").trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ error: "El email es obligatorio" });
    }

    const result = await db.query(
      `
      SELECT id, email, password_hash, status
      FROM professionals
      WHERE email = $1
      LIMIT 1
      `,
      [email]
    );

    if (result.rows.length === 0 || result.rows[0].status !== "active") {
      return res.json({
        success: true,
        message: genericMessage,
      });
    }

    const professional = result.rows[0];
    const resetToken = jwt.sign(
      {
        purpose: "password-reset",
        professionalId: professional.id,
        passwordFingerprint: getPasswordFingerprint(professional.password_hash),
      },
      getPasswordResetSecret(),
      { expiresIn: PASSWORD_RESET_EXPIRES_IN }
    );

    const resetUrl = `${getFrontendBaseUrl()}/reset-password?token=${encodeURIComponent(
      resetToken
    )}`;

    const transporter = createMailTransport();

    await transporter.sendMail({
      from: process.env.SMTP_FROM || "TuAgendaYa <no-reply@tuagendaya.com>",
      to: professional.email,
      subject: "Recuperá tu contraseña de TuAgendaYa",
      text: [
        "Recibimos una solicitud para cambiar la contraseña de tu cuenta de TuAgendaYa.",
        "",
        `Abrí este enlace para elegir una contraseña nueva: ${resetUrl}`,
        "",
        "El enlace vence en 30 minutos y deja de funcionar después de cambiar la contraseña.",
        "Si no pediste este cambio, podés ignorar este correo.",
      ].join("\n"),
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1d1d1f;line-height:1.5;">
          <h2 style="margin:0 0 16px;color:#0071e3;">TuAgendaYa</h2>
          <p>Recibimos una solicitud para cambiar la contraseña de tu cuenta.</p>
          <p style="margin:24px 0;">
            <a href="${resetUrl}" style="display:inline-block;background:#0071e3;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;">
              Crear nueva contraseña
            </a>
          </p>
          <p style="font-size:14px;color:#6e6e73;">El enlace vence en 30 minutos y deja de funcionar después de cambiar la contraseña.</p>
          <p style="font-size:14px;color:#6e6e73;">Si no pediste este cambio, podés ignorar este correo.</p>
        </div>
      `,
    });

    return res.json({
      success: true,
      message: genericMessage,
    });
  } catch (error) {
    console.error("Error forgot-password:", error);

    return res.json({
      success: true,
      message: genericMessage,
    });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const token = String(req.body.token || "").trim();
    const newPassword = String(
      req.body.newPassword || req.body.new_password || ""
    );

    if (!token || !newPassword) {
      return res.status(400).json({ error: "Faltan datos para cambiar la contraseña" });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        error: "La nueva contraseña debe tener mínimo 8 caracteres",
      });
    }

    let decoded;

    try {
      decoded = jwt.verify(token, getPasswordResetSecret());
    } catch {
      return res.status(400).json({ error: "El enlace es inválido o venció" });
    }

    if (decoded?.purpose !== "password-reset" || !decoded?.professionalId) {
      return res.status(400).json({ error: "El enlace es inválido o venció" });
    }

    const result = await db.query(
      `
      SELECT id, password_hash, status
      FROM professionals
      WHERE id = $1
      LIMIT 1
      `,
      [decoded.professionalId]
    );

    if (result.rows.length === 0 || result.rows[0].status !== "active") {
      return res.status(400).json({ error: "El enlace es inválido o venció" });
    }

    const professional = result.rows[0];
    const currentFingerprint = getPasswordFingerprint(professional.password_hash);

    if (currentFingerprint !== decoded.passwordFingerprint) {
      return res.status(400).json({ error: "El enlace ya fue utilizado o dejó de ser válido" });
    }

    const newHash = await bcrypt.hash(newPassword, 12);

    const updateResult = await db.query(
      `
      UPDATE professionals
      SET password_hash = $1, updated_at = NOW()
      WHERE id = $2 AND password_hash = $3
      RETURNING id
      `,
      [newHash, professional.id, professional.password_hash]
    );

    if (updateResult.rows.length === 0) {
      return res.status(400).json({ error: "El enlace ya fue utilizado o dejó de ser válido" });
    }

    return res.json({
      success: true,
      message: "Contraseña actualizada correctamente",
    });
  } catch (error) {
    console.error("Error reset-password:", error);
    return res.status(500).json({ error: "No se pudo cambiar la contraseña" });
  }
});

module.exports = router;
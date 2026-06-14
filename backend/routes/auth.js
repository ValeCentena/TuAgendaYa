const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");

const router = express.Router();

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

    req.professional = result.rows[0];
    next();
  } catch (error) {
    return res.status(401).json({ error: "Token inválido" });
  }
}

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
    } = req.body;

    const cleanName = String(name || "").trim();
    const cleanBusinessName = String(businessName || business_name || "").trim();
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanPassword = String(password || "");
    const cleanPhone = String(phone || "").trim();
    const cleanProfession = String(profession || "").trim();
    const cleanAddress = String(address || "").trim();
    const cleanSlug = normalizeSlug(slug || cleanBusinessName || cleanName);

    if (!cleanName) {
      return res.status(400).json({ error: "El nombre es obligatorio" });
    }

    if (!cleanBusinessName) {
      return res.status(400).json({ error: "El nombre del negocio es obligatorio" });
    }

    if (!cleanEmail) {
      return res.status(400).json({ error: "El email es obligatorio" });
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
  res.json({
    success: true,
    message: "Si el email existe, se enviarán instrucciones para recuperar la contraseña.",
  });
});

module.exports = router;
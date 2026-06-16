const express = require("express");
const jwt = require("jsonwebtoken");
const db = require("../db");

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

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeProfessionalProfile(row) {
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
    logoUrl: row.logo_url,
    logo_url: row.logo_url,
    status: row.status,
    createdAt: row.created_at,
    created_at: row.created_at,
    updatedAt: row.updated_at,
    updated_at: row.updated_at,
  };
}

function getDefaultServicesByProfession(profession) {
  const p = normalizeText(profession);

  if (
    p.includes("barber") ||
    p.includes("peluquer") ||
    p.includes("estilista") ||
    p.includes("salon")
  ) {
    return [
      { name: "Corte", description: "Corte de pelo", duration_minutes: 30, price: 500 },
      { name: "Barba", description: "Arreglo de barba", duration_minutes: 20, price: 300 },
      { name: "Corte + barba", description: "Corte de pelo y arreglo de barba", duration_minutes: 60, price: 800 },
      { name: "Color", description: "Servicio de coloración", duration_minutes: 90, price: 1200 },
    ];
  }

  if (p.includes("dent") || p.includes("odont")) {
    return [
      { name: "Consulta inicial", description: "Evaluación general", duration_minutes: 30, price: 1500 },
      { name: "Limpieza dental", description: "Profilaxis y limpieza", duration_minutes: 45, price: 2500 },
      { name: "Control", description: "Control odontológico", duration_minutes: 20, price: 1000 },
      { name: "Urgencia dental", description: "Atención por dolor o urgencia", duration_minutes: 30, price: 2000 },
    ];
  }

  if (p.includes("psic") || p.includes("terap")) {
    return [
      { name: "Primera entrevista", description: "Primera consulta de evaluación", duration_minutes: 60, price: 1800 },
      { name: "Consulta individual", description: "Sesión individual", duration_minutes: 50, price: 1600 },
      { name: "Consulta online", description: "Sesión por videollamada", duration_minutes: 50, price: 1500 },
    ];
  }

  if (
    p.includes("una") ||
    p.includes("uñas") ||
    p.includes("manicur") ||
    p.includes("nail")
  ) {
    return [
      { name: "Manicura", description: "Servicio de manicura", duration_minutes: 45, price: 900 },
      { name: "Kapping", description: "Kapping gel", duration_minutes: 60, price: 1200 },
      { name: "Esmaltado semipermanente", description: "Esmaltado semi", duration_minutes: 60, price: 1000 },
      { name: "Esculpidas", description: "Uñas esculpidas", duration_minutes: 90, price: 1800 },
    ];
  }

  if (p.includes("veterin")) {
    return [
      { name: "Consulta general", description: "Consulta veterinaria", duration_minutes: 30, price: 1200 },
      { name: "Vacunación", description: "Aplicación de vacuna", duration_minutes: 20, price: 900 },
      { name: "Control", description: "Control post tratamiento", duration_minutes: 20, price: 800 },
      { name: "Baño y corte", description: "Higiene y estética", duration_minutes: 60, price: 1800 },
    ];
  }

  if (
    p.includes("medic") ||
    p.includes("doctor") ||
    p.includes("clinica") ||
    p.includes("salud")
  ) {
    return [
      { name: "Consulta médica", description: "Consulta general", duration_minutes: 30, price: 1500 },
      { name: "Control", description: "Control médico", duration_minutes: 20, price: 1000 },
      { name: "Primera consulta", description: "Primera evaluación", duration_minutes: 40, price: 1800 },
    ];
  }

  if (
    p.includes("fisi") ||
    p.includes("kines") ||
    p.includes("masaj")
  ) {
    return [
      { name: "Evaluación inicial", description: "Primera evaluación", duration_minutes: 45, price: 1500 },
      { name: "Sesión de fisioterapia", description: "Tratamiento fisioterapéutico", duration_minutes: 45, price: 1400 },
      { name: "Masaje terapéutico", description: "Masaje o descarga muscular", duration_minutes: 60, price: 1800 },
    ];
  }

  if (
    p.includes("entren") ||
    p.includes("personal trainer") ||
    p.includes("gym") ||
    p.includes("fitness")
  ) {
    return [
      { name: "Clase personal", description: "Entrenamiento personalizado", duration_minutes: 60, price: 1200 },
      { name: "Evaluación física", description: "Evaluación inicial", duration_minutes: 45, price: 1000 },
      { name: "Planificación", description: "Armado de rutina", duration_minutes: 30, price: 800 },
    ];
  }

  if (p.includes("maquill") || p.includes("makeup")) {
    return [
      { name: "Maquillaje social", description: "Maquillaje para evento", duration_minutes: 60, price: 1800 },
      { name: "Maquillaje novia", description: "Servicio especial novia", duration_minutes: 120, price: 4500 },
      { name: "Prueba de maquillaje", description: "Prueba previa", duration_minutes: 60, price: 1500 },
    ];
  }

  if (p.includes("fotograf") || p.includes("foto")) {
    return [
      { name: "Sesión básica", description: "Sesión fotográfica corta", duration_minutes: 60, price: 2500 },
      { name: "Sesión completa", description: "Sesión fotográfica completa", duration_minutes: 120, price: 5000 },
      { name: "Reunión previa", description: "Coordinación de sesión", duration_minutes: 30, price: 0 },
    ];
  }

  return [
    { name: "Consulta", description: "Servicio general", duration_minutes: 30, price: 1000 },
    { name: "Servicio estándar", description: "Servicio principal", duration_minutes: 30, price: 1000 },
    { name: "Servicio extendido", description: "Servicio de mayor duración", duration_minutes: 60, price: 1800 },
  ];
}

function defaultAvailability(professionalId) {
  return [
    {
      professional_id: professionalId,
      day_of_week: 0,
      is_active: false,
      start_time: "09:00",
      end_time: "18:00",
      slot_duration_minutes: 30,
    },
    {
      professional_id: professionalId,
      day_of_week: 1,
      is_active: true,
      start_time: "09:00",
      end_time: "18:00",
      slot_duration_minutes: 30,
    },
    {
      professional_id: professionalId,
      day_of_week: 2,
      is_active: true,
      start_time: "09:00",
      end_time: "18:00",
      slot_duration_minutes: 30,
    },
    {
      professional_id: professionalId,
      day_of_week: 3,
      is_active: true,
      start_time: "09:00",
      end_time: "18:00",
      slot_duration_minutes: 30,
    },
    {
      professional_id: professionalId,
      day_of_week: 4,
      is_active: true,
      start_time: "09:00",
      end_time: "18:00",
      slot_duration_minutes: 30,
    },
    {
      professional_id: professionalId,
      day_of_week: 5,
      is_active: true,
      start_time: "09:00",
      end_time: "18:00",
      slot_duration_minutes: 30,
    },
    {
      professional_id: professionalId,
      day_of_week: 6,
      is_active: false,
      start_time: "09:00",
      end_time: "18:00",
      slot_duration_minutes: 30,
    },
  ];
}

function normalizeAvailabilityRow(row) {
  return {
    id: row.id,
    professionalId: row.professional_id,
    professional_id: row.professional_id,
    dayOfWeek: row.day_of_week,
    day_of_week: row.day_of_week,
    isActive: row.is_active,
    is_active: row.is_active,
    startTime: String(row.start_time || "09:00").slice(0, 5),
    start_time: String(row.start_time || "09:00").slice(0, 5),
    endTime: String(row.end_time || "18:00").slice(0, 5),
    end_time: String(row.end_time || "18:00").slice(0, 5),
    slotDurationMinutes: row.slot_duration_minutes || 30,
    slot_duration_minutes: row.slot_duration_minutes || 30,
  };
}

function normalizeService(row) {
  return {
    id: row.id,
    professionalId: row.professional_id,
    professional_id: row.professional_id,
    name: row.name,
    description: row.description,
    durationMinutes: row.duration_minutes,
    duration_minutes: row.duration_minutes,
    price: row.price === null || row.price === undefined ? null : Number(row.price),
    isActive: row.is_active,
    is_active: row.is_active,
    createdAt: row.created_at,
    created_at: row.created_at,
    updatedAt: row.updated_at,
    updated_at: row.updated_at,
  };
}

async function ensureDefaultAvailability(professionalId) {
  const existing = await db.query(
    `
    SELECT *
    FROM professional_availability
    WHERE professional_id = $1
    ORDER BY day_of_week ASC
    `,
    [professionalId]
  );

  if (existing.rows.length === 7) {
    return existing.rows.map(normalizeAvailabilityRow);
  }

  const defaults = defaultAvailability(professionalId);

  for (const day of defaults) {
    await db.query(
      `
      INSERT INTO professional_availability (
        professional_id,
        day_of_week,
        is_active,
        start_time,
        end_time,
        slot_duration_minutes,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      ON CONFLICT (professional_id, day_of_week)
      DO NOTHING
      `,
      [
        day.professional_id,
        day.day_of_week,
        day.is_active,
        day.start_time,
        day.end_time,
        day.slot_duration_minutes,
      ]
    );
  }

  const result = await db.query(
    `
    SELECT *
    FROM professional_availability
    WHERE professional_id = $1
    ORDER BY day_of_week ASC
    `,
    [professionalId]
  );

  return result.rows.map(normalizeAvailabilityRow);
}

async function ensureDefaultServices(professionalId) {
  const existing = await db.query(
    `
    SELECT *
    FROM professional_services
    WHERE professional_id = $1
    ORDER BY id ASC
    `,
    [professionalId]
  );

  if (existing.rows.length > 0) {
    return existing.rows;
  }

  const professionalResult = await db.query(
    `
    SELECT profession
    FROM professionals
    WHERE id = $1
    LIMIT 1
    `,
    [professionalId]
  );

  const profession = professionalResult.rows[0]?.profession || "";
  const defaults = getDefaultServicesByProfession(profession);

  for (const service of defaults) {
    await db.query(
      `
      INSERT INTO professional_services (
        professional_id,
        name,
        description,
        duration_minutes,
        price,
        is_active,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
      `,
      [
        professionalId,
        service.name,
        service.description,
        service.duration_minutes,
        service.price,
      ]
    );
  }

  const result = await db.query(
    `
    SELECT *
    FROM professional_services
    WHERE professional_id = $1
    ORDER BY id ASC
    `,
    [professionalId]
  );

  return result.rows;
}

router.get("/me/profile", async (req, res) => {
  try {
    const professionalId = getProfessionalIdFromRequest(req);

    const result = await db.query(
      `
      SELECT
        id,
        name,
        business_name,
        email,
        phone,
        profession,
        address,
        slug,
        logo_url,
        status,
        created_at,
        updated_at
      FROM professionals
      WHERE id = $1
      LIMIT 1
      `,
      [professionalId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Profesional no encontrado",
      });
    }

    res.json({
      professional: normalizeProfessionalProfile(result.rows[0]),
    });
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.message || "Error obteniendo perfil",
    });
  }
});

router.patch("/me/profile", async (req, res) => {
  try {
    const professionalId = getProfessionalIdFromRequest(req);

    const currentResult = await db.query(
      `
      SELECT *
      FROM professionals
      WHERE id = $1
      LIMIT 1
      `,
      [professionalId]
    );

    if (currentResult.rows.length === 0) {
      return res.status(404).json({
        error: "Profesional no encontrado",
      });
    }

    const current = currentResult.rows[0];

    const businessName =
      req.body.businessName === undefined && req.body.business_name === undefined
        ? current.business_name
        : String(req.body.businessName ?? req.body.business_name ?? "").trim();

    const phone =
      req.body.phone === undefined
        ? current.phone
        : String(req.body.phone || "").trim();

    const address =
      req.body.address === undefined
        ? current.address
        : String(req.body.address || "").trim();

    const logoUrl =
      req.body.logoUrl === undefined && req.body.logo_url === undefined
        ? current.logo_url
        : String(req.body.logoUrl ?? req.body.logo_url ?? "").trim();

    if (!businessName) {
      return res.status(400).json({
        error: "El nombre del negocio es obligatorio",
      });
    }

    const isValidLogo =
      !logoUrl ||
      logoUrl.startsWith("http://") ||
      logoUrl.startsWith("https://") ||
      logoUrl.startsWith("data:image/png;base64,") ||
      logoUrl.startsWith("data:image/jpeg;base64,") ||
      logoUrl.startsWith("data:image/webp;base64,");

    if (!isValidLogo) {
      return res.status(400).json({
        error: "El logo debe ser una URL válida o una imagen cargada desde archivo",
      });
    }

    if (logoUrl && logoUrl.length > 1500000) {
      return res.status(400).json({
        error: "El logo es demasiado pesado. Usá una imagen menor a 1 MB.",
      });
    }

    const result = await db.query(
      `
      UPDATE professionals
      SET
        business_name = $1,
        phone = $2,
        address = $3,
        logo_url = $4,
        updated_at = NOW()
      WHERE id = $5
      RETURNING
        id,
        name,
        business_name,
        email,
        phone,
        profession,
        address,
        slug,
        logo_url,
        status,
        created_at,
        updated_at
      `,
      [
        businessName,
        phone || null,
        address || null,
        logoUrl || null,
        professionalId,
      ]
    );

    res.json({
      success: true,
      professional: normalizeProfessionalProfile(result.rows[0]),
    });
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.message || "Error actualizando perfil",
    });
  }
});

router.get("/me/availability", async (req, res) => {
  try {
    const professionalId = getProfessionalIdFromRequest(req);
    const availability = await ensureDefaultAvailability(professionalId);

    res.json({ availability });
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.message || "Error obteniendo disponibilidad",
    });
  }
});

router.patch("/me/availability", async (req, res) => {
  try {
    const professionalId = getProfessionalIdFromRequest(req);
    const incoming = Array.isArray(req.body) ? req.body : req.body.availability;

    if (!Array.isArray(incoming)) {
      return res.status(400).json({
        error: "Disponibilidad inválida",
      });
    }

    for (const item of incoming) {
      const dayOfWeek = Number(item.dayOfWeek ?? item.day_of_week);
      const isActive = Boolean(item.isActive ?? item.is_active);
      const startTime = String(item.startTime ?? item.start_time ?? "09:00").slice(0, 5);
      const endTime = String(item.endTime ?? item.end_time ?? "18:00").slice(0, 5);
      const slotDurationMinutes = Number(
        item.slotDurationMinutes ?? item.slot_duration_minutes ?? 30
      );

      if (Number.isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
        continue;
      }

      await db.query(
        `
        INSERT INTO professional_availability (
          professional_id,
          day_of_week,
          is_active,
          start_time,
          end_time,
          slot_duration_minutes,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        ON CONFLICT (professional_id, day_of_week)
        DO UPDATE SET
          is_active = EXCLUDED.is_active,
          start_time = EXCLUDED.start_time,
          end_time = EXCLUDED.end_time,
          slot_duration_minutes = EXCLUDED.slot_duration_minutes,
          updated_at = NOW()
        `,
        [
          professionalId,
          dayOfWeek,
          isActive,
          startTime,
          endTime,
          slotDurationMinutes,
        ]
      );
    }

    const result = await db.query(
      `
      SELECT *
      FROM professional_availability
      WHERE professional_id = $1
      ORDER BY day_of_week ASC
      `,
      [professionalId]
    );

    res.json({
      success: true,
      availability: result.rows.map(normalizeAvailabilityRow),
    });
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.message || "Error guardando disponibilidad",
    });
  }
});

router.get("/me/services", async (req, res) => {
  try {
    const professionalId = getProfessionalIdFromRequest(req);
    const services = await ensureDefaultServices(professionalId);

    res.json({
      services: services.map(normalizeService),
    });
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.message || "Error obteniendo servicios",
    });
  }
});

router.post("/me/services", async (req, res) => {
  try {
    const professionalId = getProfessionalIdFromRequest(req);

    const serviceName = String(req.body.name || "").trim();
    const description = req.body.description || null;
    const duration = Number(req.body.durationMinutes ?? req.body.duration_minutes ?? 30);
    const price =
      req.body.price === undefined || req.body.price === "" ? null : Number(req.body.price);

    if (!serviceName) {
      return res.status(400).json({
        error: "El nombre del servicio es obligatorio",
      });
    }

    if (!duration || duration <= 0) {
      return res.status(400).json({
        error: "La duración del servicio es inválida",
      });
    }

    const result = await db.query(
      `
      INSERT INTO professional_services (
        professional_id,
        name,
        description,
        duration_minutes,
        price,
        is_active,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
      RETURNING *
      `,
      [professionalId, serviceName, description, duration, price]
    );

    res.status(201).json({
      success: true,
      service: normalizeService(result.rows[0]),
    });
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.message || "Error creando servicio",
    });
  }
});

router.patch("/me/services/:id", async (req, res) => {
  try {
    const professionalId = getProfessionalIdFromRequest(req);
    const serviceId = Number(req.params.id);

    const current = await db.query(
      `
      SELECT *
      FROM professional_services
      WHERE id = $1 AND professional_id = $2
      `,
      [serviceId, professionalId]
    );

    if (current.rows.length === 0) {
      return res.status(404).json({
        error: "Servicio no encontrado",
      });
    }

    const existing = current.rows[0];

    const name = req.body.name ?? existing.name;
    const description = req.body.description ?? existing.description;
    const durationMinutes = Number(
      req.body.durationMinutes ?? req.body.duration_minutes ?? existing.duration_minutes
    );
    const price =
      req.body.price === undefined || req.body.price === ""
        ? existing.price
        : Number(req.body.price);
    const isActive =
      req.body.isActive === undefined && req.body.is_active === undefined
        ? existing.is_active
        : Boolean(req.body.isActive ?? req.body.is_active);

    const result = await db.query(
      `
      UPDATE professional_services
      SET
        name = $1,
        description = $2,
        duration_minutes = $3,
        price = $4,
        is_active = $5,
        updated_at = NOW()
      WHERE id = $6 AND professional_id = $7
      RETURNING *
      `,
      [
        name,
        description || null,
        durationMinutes,
        price,
        isActive,
        serviceId,
        professionalId,
      ]
    );

    res.json({
      success: true,
      service: normalizeService(result.rows[0]),
    });
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.message || "Error actualizando servicio",
    });
  }
});

router.router.delete("/me/services/:id", async (req, res) => {
  try {
    const professionalId = getProfessionalIdFromRequest(req);
    const serviceId = Number(req.params.id);

    if (!serviceId || Number.isNaN(serviceId)) {
      return res.status(400).json({
        error: "Servicio inválido",
      });
    }

    const result = await db.query(
      `
      DELETE FROM professional_services
      WHERE id = $1 AND professional_id = $2
      RETURNING *
      `,
      [serviceId, professionalId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Servicio no encontrado",
      });
    }

    res.json({
      success: true,
      message: "Servicio eliminado correctamente",
      service: normalizeService(result.rows[0]),
    });
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.message || "Error eliminando servicio",
    });
  }
});
  try {
    const professionalId = getProfessionalIdFromRequest(req);
    const serviceId = Number(req.params.id);

    const result = await db.query(
      `
      UPDATE professional_services
      SET is_active = false, updated_at = NOW()
      WHERE id = $1 AND professional_id = $2
      RETURNING *
      `,
      [serviceId, professionalId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Servicio no encontrado",
      });
    }

    res.json({
      success: true,
      service: normalizeService(result.rows[0]),
    });
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.message || "Error eliminando servicio",
    });
  }
});

router.get("/public/:slug/services", async (req, res) => {
  try {
    const { slug } = req.params;

    const professionalResult = await db.query(
      `
      SELECT id
      FROM professionals
      WHERE slug = $1 AND status = 'active'
      `,
      [slug]
    );

    if (professionalResult.rows.length === 0) {
      return res.status(404).json({
        error: "Profesional no encontrado",
      });
    }

    const professionalId = professionalResult.rows[0].id;
    const services = await ensureDefaultServices(professionalId);

    res.json({
      services: services.filter((service) => service.is_active).map(normalizeService),
    });
  } catch (error) {
    res.status(500).json({
      error: error.message || "Error obteniendo servicios públicos",
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT
        id,
        name,
        business_name,
        email,
        phone,
        profession,
        address,
        slug,
        logo_url,
        status,
        created_at,
        updated_at
      FROM professionals
      ORDER BY created_at DESC
      `
    );

    res.json({
      professionals: result.rows.map(normalizeProfessionalProfile),
    });
  } catch (error) {
    res.status(500).json({
      error: "Error obteniendo profesionales",
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT
        id,
        name,
        business_name,
        email,
        phone,
        profession,
        address,
        slug,
        logo_url,
        status,
        created_at,
        updated_at
      FROM professionals
      WHERE id = $1
      `,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Profesional no encontrado",
      });
    }

    res.json({
      professional: normalizeProfessionalProfile(result.rows[0]),
    });
  } catch (error) {
    res.status(500).json({
      error: "Error obteniendo profesional",
    });
  }
});

module.exports = router;
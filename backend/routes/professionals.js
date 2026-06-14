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
    dayOfWeek: row.day_of_week,
    isActive: row.is_active,
    startTime: String(row.start_time || "09:00").slice(0, 5),
    endTime: String(row.end_time || "18:00").slice(0, 5),
    slotDurationMinutes: row.slot_duration_minutes || 30,
  };
}

function normalizeService(row) {
  return {
    id: row.id,
    professionalId: row.professional_id,
    name: row.name,
    description: row.description,
    durationMinutes: row.duration_minutes,
    price: row.price === null || row.price === undefined ? null : Number(row.price),
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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

  const defaults = [
    {
      name: "Corte",
      description: "Servicio estándar",
      duration_minutes: 30,
      price: null,
    },
    {
      name: "Consulta",
      description: "Servicio general",
      duration_minutes: 30,
      price: null,
    },
  ];

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

router.delete("/me/services/:id", async (req, res) => {
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
      SELECT id, name, business_name, email, phone, profession, slug, status, created_at
      FROM professionals
      ORDER BY created_at DESC
      `
    );

    res.json({
      professionals: result.rows,
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
      SELECT id, name, business_name, email, phone, profession, slug, status, created_at
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
      professional: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({
      error: "Error obteniendo profesional",
    });
  }
});

module.exports = router;
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

function normalizeStaff(row) {
  return {
    id: row.id,
    ownerProfessionalId: row.owner_professional_id,
    owner_professional_id: row.owner_professional_id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    color: row.color,
    isActive: row.is_active,
    is_active: row.is_active,
    createdAt: row.created_at,
    created_at: row.created_at,
    updatedAt: row.updated_at,
    updated_at: row.updated_at,
  };
}

function normalizeAvailabilityRow(row) {
  const resolvedStaffId = row.staff_id ?? row.staff_member_id;

  return {
    id: row.id,
    staffId: resolvedStaffId,
    staff_id: resolvedStaffId,
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

function defaultStaffAvailability(staffId) {
  return [
    {
      staff_id: staffId,
      day_of_week: 0,
      is_active: false,
      start_time: "09:00",
      end_time: "18:00",
      slot_duration_minutes: 30,
    },
    {
      staff_id: staffId,
      day_of_week: 1,
      is_active: true,
      start_time: "09:00",
      end_time: "18:00",
      slot_duration_minutes: 30,
    },
    {
      staff_id: staffId,
      day_of_week: 2,
      is_active: true,
      start_time: "09:00",
      end_time: "18:00",
      slot_duration_minutes: 30,
    },
    {
      staff_id: staffId,
      day_of_week: 3,
      is_active: true,
      start_time: "09:00",
      end_time: "18:00",
      slot_duration_minutes: 30,
    },
    {
      staff_id: staffId,
      day_of_week: 4,
      is_active: true,
      start_time: "09:00",
      end_time: "18:00",
      slot_duration_minutes: 30,
    },
    {
      staff_id: staffId,
      day_of_week: 5,
      is_active: true,
      start_time: "09:00",
      end_time: "18:00",
      slot_duration_minutes: 30,
    },
    {
      staff_id: staffId,
      day_of_week: 6,
      is_active: false,
      start_time: "09:00",
      end_time: "18:00",
      slot_duration_minutes: 30,
    },
  ];
}

async function ensureDefaultAvailability(staffId) {
  const existing = await db.query(
    `
    SELECT *
    FROM staff_availability
    WHERE COALESCE(staff_id, staff_member_id) = $1
    ORDER BY day_of_week ASC
    `,
    [staffId]
  );

  if (existing.rows.length === 7) {
    return existing.rows.map(normalizeAvailabilityRow);
  }

  const defaults = defaultStaffAvailability(staffId);

  for (const day of defaults) {
    await db.query(
      `
      INSERT INTO staff_availability (
        staff_id,
        staff_member_id,
        day_of_week,
        is_active,
        start_time,
        end_time,
        slot_duration_minutes,
        created_at,
        updated_at
      )
      VALUES ($1, $1, $2, $3, $4, $5, $6, NOW(), NOW())
      ON CONFLICT (staff_member_id, day_of_week)
      DO NOTHING
      `,
      [
        day.staff_id,
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
    FROM staff_availability
    WHERE COALESCE(staff_id, staff_member_id) = $1
    ORDER BY day_of_week ASC
    `,
    [staffId]
  );

  return result.rows.map(normalizeAvailabilityRow);
}

async function ensureDefaultStaff(ownerProfessionalId) {
  const existing = await db.query(
    `
    SELECT *
    FROM staff_members
    WHERE owner_professional_id = $1
    ORDER BY id ASC
    `,
    [ownerProfessionalId]
  );

  if (existing.rows.length > 0) {
    return existing.rows;
  }

  const professionalResult = await db.query(
    `
    SELECT name, phone, email
    FROM professionals
    WHERE id = $1
    LIMIT 1
    `,
    [ownerProfessionalId]
  );

  const professional = professionalResult.rows[0] || {};

  const created = await db.query(
    `
    INSERT INTO staff_members (
      professional_id,
      owner_professional_id,
      name,
      phone,
      email,
      color,
      is_active,
      created_at,
      updated_at
    )
    VALUES ($1, $1, $2, $3, $4, $5, true, NOW(), NOW())
    RETURNING *
    `,
    [
      ownerProfessionalId,
      professional.name || "Profesional principal",
      professional.phone || null,
      professional.email || null,
      "#0071e3",
    ]
  );

  await ensureDefaultAvailability(created.rows[0].id);

  return created.rows;
}

async function getStaffOwnedByProfessional(staffId, ownerProfessionalId) {
  const result = await db.query(
    `
    SELECT *
    FROM staff_members
    WHERE id = $1
      AND owner_professional_id = $2
    LIMIT 1
    `,
    [staffId, ownerProfessionalId]
  );

  return result.rows[0] || null;
}

router.get("/", async (req, res) => {
  try {
    const ownerProfessionalId = getProfessionalIdFromRequest(req);

    await ensureDefaultStaff(ownerProfessionalId);

    const result = await db.query(
      `
      SELECT *
      FROM staff_members
      WHERE owner_professional_id = $1
      ORDER BY is_active DESC, id ASC
      `,
      [ownerProfessionalId]
    );

    res.json({
      staff: result.rows.map(normalizeStaff),
    });
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.message || "Error obteniendo profesionales internos",
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const ownerProfessionalId = getProfessionalIdFromRequest(req);

    const name = String(req.body.name || "").trim();
    const phone = String(req.body.phone || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const color = String(req.body.color || "#0071e3").trim();

    if (!name) {
      return res.status(400).json({
        error: "El nombre del profesional es obligatorio",
      });
    }

    const result = await db.query(
      `
      INSERT INTO staff_members (
        professional_id,
        owner_professional_id,
        name,
        phone,
        email,
        color,
        is_active,
        created_at,
        updated_at
      )
      VALUES ($1, $1, $2, $3, $4, $5, true, NOW(), NOW())
      RETURNING *
      `,
      [
        ownerProfessionalId,
        name,
        phone || null,
        email || null,
        color || "#0071e3",
      ]
    );

    await ensureDefaultAvailability(result.rows[0].id);

    res.status(201).json({
      success: true,
      staffMember: normalizeStaff(result.rows[0]),
      staff_member: normalizeStaff(result.rows[0]),
    });
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.message || "Error creando profesional interno",
    });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const ownerProfessionalId = getProfessionalIdFromRequest(req);
    const staffId = Number(req.params.id);

    const existing = await getStaffOwnedByProfessional(staffId, ownerProfessionalId);

    if (!existing) {
      return res.status(404).json({
        error: "Profesional interno no encontrado",
      });
    }

    const name = req.body.name === undefined ? existing.name : String(req.body.name || "").trim();
    const phone = req.body.phone === undefined ? existing.phone : String(req.body.phone || "").trim();
    const email = req.body.email === undefined ? existing.email : String(req.body.email || "").trim().toLowerCase();
    const color = req.body.color === undefined ? existing.color : String(req.body.color || "#0071e3").trim();
    const isActive =
      req.body.isActive === undefined && req.body.is_active === undefined
        ? existing.is_active
        : Boolean(req.body.isActive ?? req.body.is_active);

    if (!name) {
      return res.status(400).json({
        error: "El nombre del profesional es obligatorio",
      });
    }

    const result = await db.query(
      `
      UPDATE staff_members
      SET
        name = $1,
        phone = $2,
        email = $3,
        color = $4,
        is_active = $5,
        updated_at = NOW()
      WHERE id = $6
        AND owner_professional_id = $7
      RETURNING *
      `,
      [
        name,
        phone || null,
        email || null,
        color || "#0071e3",
        isActive,
        staffId,
        ownerProfessionalId,
      ]
    );

    res.json({
      success: true,
      staffMember: normalizeStaff(result.rows[0]),
      staff_member: normalizeStaff(result.rows[0]),
    });
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.message || "Error actualizando profesional interno",
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const ownerProfessionalId = getProfessionalIdFromRequest(req);
    const staffId = Number(req.params.id);

    const result = await db.query(
      `
      UPDATE staff_members
      SET is_active = false, updated_at = NOW()
      WHERE id = $1
        AND owner_professional_id = $2
      RETURNING *
      `,
      [staffId, ownerProfessionalId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Profesional interno no encontrado",
      });
    }

    res.json({
      success: true,
      staffMember: normalizeStaff(result.rows[0]),
      staff_member: normalizeStaff(result.rows[0]),
    });
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.message || "Error desactivando profesional interno",
    });
  }
});

router.get("/:id/availability", async (req, res) => {
  try {
    const ownerProfessionalId = getProfessionalIdFromRequest(req);
    const staffId = Number(req.params.id);

    const staff = await getStaffOwnedByProfessional(staffId, ownerProfessionalId);

    if (!staff) {
      return res.status(404).json({
        error: "Profesional interno no encontrado",
      });
    }

    const availability = await ensureDefaultAvailability(staffId);

    res.json({
      staffMember: normalizeStaff(staff),
      staff_member: normalizeStaff(staff),
      availability,
    });
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.message || "Error obteniendo disponibilidad del profesional",
    });
  }
});

router.patch("/:id/availability", async (req, res) => {
  try {
    const ownerProfessionalId = getProfessionalIdFromRequest(req);
    const staffId = Number(req.params.id);

    const staff = await getStaffOwnedByProfessional(staffId, ownerProfessionalId);

    if (!staff) {
      return res.status(404).json({
        error: "Profesional interno no encontrado",
      });
    }

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
        INSERT INTO staff_availability (
          staff_id,
          staff_member_id,
          day_of_week,
          is_active,
          start_time,
          end_time,
          slot_duration_minutes,
          created_at,
          updated_at
        )
        VALUES ($1, $1, $2, $3, $4, $5, $6, NOW(), NOW())
        ON CONFLICT (staff_member_id, day_of_week)
        DO UPDATE SET
          is_active = EXCLUDED.is_active,
          start_time = EXCLUDED.start_time,
          end_time = EXCLUDED.end_time,
          slot_duration_minutes = EXCLUDED.slot_duration_minutes,
          updated_at = NOW()
        `,
        [
          staffId,
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
      FROM staff_availability
      WHERE COALESCE(staff_id, staff_member_id) = $1
      ORDER BY day_of_week ASC
      `,
      [staffId]
    );

    res.json({
      success: true,
      staffMember: normalizeStaff(staff),
      staff_member: normalizeStaff(staff),
      availability: result.rows.map(normalizeAvailabilityRow),
    });
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.message || "Error guardando disponibilidad del profesional",
    });
  }
});

module.exports = router;
const express = require("express");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
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

function generateSlotsFromConfig(startTime, endTime, stepMinutes, serviceDurationMinutes) {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  const step = Number(stepMinutes || 30);
  const duration = Number(serviceDurationMinutes || step || 30);

  if (start === null || end === null || end <= start) {
    return [];
  }

  const slots = [];

  for (let current = start; current + duration <= end; current += step) {
    slots.push(minutesToTime(current));
  }

  return slots;
}

function rangesOverlap(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

function normalizeBooking(row) {
  return {
    id: row.id,

    professional_id: row.professional_id,
    professionalId: row.professional_id,

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
    professionalName: row.professional_name,
    businessName: row.business_name,
  };
}

async function getProfessionalBySlug(slug) {
  const result = await db.query(
    `
    SELECT *
    FROM professionals
    WHERE slug = $1 AND status = 'active'
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
      AND is_active = true
    `,
    [serviceId, professionalId]
  );

  return result.rows[0] || null;
}

async function getAvailabilityForDate(professionalId, bookingDate) {
  const dayOfWeek = getDayOfWeekFromDateString(bookingDate);

  if (dayOfWeek === null) {
    return null;
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
  };
}

async function getBusyBookings(professionalId, bookingDate) {
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

async function isTimeRangeAvailable(professionalId, bookingDate, startTime, endTime) {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);

  if (start === null || end === null || end <= start) {
    return false;
  }

  const busy = await getBusyBookings(professionalId, bookingDate);

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

router.get("/public/:slug/slots", async (req, res) => {
  try {
    const { slug } = req.params;
    const bookingDate = normalizeDate(req.query.date);
    const serviceId = req.query.serviceId || req.query.service_id || null;

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

    const availability = await getAvailabilityForDate(professional.id, bookingDate);

    if (!availability || availability.is_active === false) {
      return res.json({ slots: [] });
    }

    let serviceDuration = Number(availability.slot_duration_minutes || 30);

    if (serviceId) {
      const service = await getServiceForProfessional(professional.id, serviceId);

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

    const busyBookings = await getBusyBookings(professional.id, bookingDate);

    const slots = baseSlots.map((slotTime) => {
      const slotStart = timeToMinutes(slotTime);
      const slotEnd = slotStart + serviceDuration;

      let available = true;

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
    let service = null;

    if (finalServiceId) {
      service = await getServiceForProfessional(professional.id, finalServiceId);

      if (!service) {
        return res.status(404).json({
          error: "Servicio no encontrado",
        });
      }
    }

    const durationMinutes = service ? Number(service.duration_minutes || 30) : 30;
    const finalEndTime = endTime || addMinutesToTime(startTime, durationMinutes);

    const available = await isTimeRangeAvailable(
      professional.id,
      normalizeDate(bookingDate),
      normalizeTime(startTime),
      normalizeTime(finalEndTime)
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
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9, NOW(), NOW())
      RETURNING *
      `,
      [
        professional.id,
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

    res.status(201).json({
      success: true,
      bookingId: result.rows[0].id,
      confirmationToken,
      confirmationUrl,
      booking: normalizeBooking(result.rows[0]),
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
        p.name AS professional_name,
        p.business_name AS business_name
      FROM bookings b
      LEFT JOIN professional_services s ON s.id = b.service_id
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
    const { token } = req.params;

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
        s.price AS service_price
      FROM bookings b
      LEFT JOIN professional_services s ON s.id = b.service_id
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
        s.price AS service_price
      FROM bookings b
      LEFT JOIN professional_services s ON s.id = b.service_id
      WHERE b.id = $1 AND b.professional_id = $2
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
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
    error.message = "Token inválido";
    throw error;
  }
}

function getFrontendUrl() {
  return process.env.FRONTEND_URL || "https://tuagendaya-web.onrender.com";
}

function createConfirmationToken() {
  return crypto.randomBytes(32).toString("hex");
}

function normalizeDate(value) {
  if (!value) return null;

  return String(value).slice(0, 10);
}

function normalizeTime(value) {
  if (!value) return null;

  return String(value).slice(0, 5);
}

function timeToMinutes(value) {
  const clean = normalizeTime(value);

  if (!clean) return 0;

  const [hours, minutes] = clean.split(":").map(Number);

  return hours * 60 + minutes;
}

function minutesToTime(value) {
  const hours = String(Math.floor(value / 60)).padStart(2, "0");
  const minutes = String(value % 60).padStart(2, "0");

  return `${hours}:${minutes}`;
}

function addMinutesToTime(value, minutesToAdd) {
  return minutesToTime(timeToMinutes(value) + Number(minutesToAdd || 30));
}

function rangesOverlap(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

function normalizeBooking(row) {
  if (!row) return null;

  return {
    id: row.id,

    professionalId: row.professional_id,
    professional_id: row.professional_id,

    staffId: row.staff_id,
    staff_id: row.staff_id,
    staffName: row.staff_name,
    staff_name: row.staff_name,
    staffColor: row.staff_color,
    staff_color: row.staff_color,

    serviceId: row.service_id,
    service_id: row.service_id,
    serviceName: row.service_name,
    service_name: row.service_name,
    serviceDurationMinutes: row.service_duration_minutes,
    service_duration_minutes: row.service_duration_minutes,
    servicePrice: row.service_price,
    service_price: row.service_price,

    clientName: row.client_name,
    client_name: row.client_name,
    clientPhone: row.client_phone,
    client_phone: row.client_phone,

    comment: row.comment,
    bookingDate: normalizeDate(row.booking_date),
    booking_date: normalizeDate(row.booking_date),
    startTime: normalizeTime(row.start_time),
    start_time: normalizeTime(row.start_time),
    endTime: normalizeTime(row.end_time),
    end_time: normalizeTime(row.end_time),

    status: row.status,

    confirmationToken: row.confirmation_token,
    confirmation_token: row.confirmation_token,

    clientConfirmedAt: row.client_confirmed_at,
    client_confirmed_at: row.client_confirmed_at,
    clientCancelledAt: row.client_cancelled_at,
    client_cancelled_at: row.client_cancelled_at,

    createdAt: row.created_at,
    created_at: row.created_at,
    updatedAt: row.updated_at,
    updated_at: row.updated_at,
  };
}

async function getBusinessBySlug(slug) {
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
      status
    FROM professionals
    WHERE slug = $1
    LIMIT 1
    `,
    [slug]
  );

  return result.rows[0] || null;
}

async function getServiceForBusiness(serviceId, professionalId) {
  const result = await db.query(
    `
    SELECT
      id,
      professional_id,
      name,
      description,
      duration_minutes,
      price,
      is_active
    FROM professional_services
    WHERE id = $1
      AND professional_id = $2
      AND is_active = true
    LIMIT 1
    `,
    [serviceId, professionalId]
  );

  return result.rows[0] || null;
}

async function getStaffForBusiness(staffId, professionalId) {
  const result = await db.query(
    `
    SELECT
      id,
      owner_professional_id,
      name,
      phone,
      email,
      color,
      is_active
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

async function getStaffAvailabilityForDate(staffId, bookingDate) {
  const date = new Date(`${bookingDate}T12:00:00`);
  const dayOfWeek = date.getDay();

  const result = await db.query(
    `
    SELECT
      id,
      staff_id,
      day_of_week,
      is_active,
      start_time,
      end_time,
      slot_duration_minutes
    FROM staff_availability
    WHERE staff_id = $1
      AND day_of_week = $2
    LIMIT 1
    `,
    [staffId, dayOfWeek]
  );

  return result.rows[0] || null;
}

async function getOccupiedBookings({ professionalId, staffId, bookingDate }) {
  const result = await db.query(
    `
    SELECT
      id,
      start_time,
      end_time,
      status
    FROM bookings
    WHERE professional_id = $1
      AND staff_id = $2
      AND booking_date = $3
      AND status != 'cancelled'
    ORDER BY start_time ASC
    `,
    [professionalId, staffId, bookingDate]
  );

  return result.rows;
}

async function checkSlotAvailable({
  professionalId,
  staffId,
  bookingDate,
  startTime,
  endTime,
}) {
  const occupied = await getOccupiedBookings({
    professionalId,
    staffId,
    bookingDate,
  });

  const requestedStart = timeToMinutes(startTime);
  const requestedEnd = timeToMinutes(endTime);

  return !occupied.some((booking) => {
    const bookingStart = timeToMinutes(booking.start_time);
    const bookingEnd = timeToMinutes(booking.end_time);

    return rangesOverlap(requestedStart, requestedEnd, bookingStart, bookingEnd);
  });
}

router.get("/public/:slug/staff", async (req, res) => {
  try {
    const slug = String(req.params.slug || "").trim().toLowerCase();

    const business = await getBusinessBySlug(slug);

    if (!business) {
      return res.status(404).json({ error: "Negocio no encontrado" });
    }

    if (business.status !== "active") {
      return res.status(403).json({ error: "Negocio no disponible" });
    }

    const staffResult = await db.query(
      `
      SELECT
        id,
        name,
        phone,
        email,
        color,
        is_active
      FROM staff_members
      WHERE owner_professional_id = $1
        AND is_active = true
      ORDER BY name ASC, id ASC
      `,
      [business.id]
    );

    res.json({
      business: {
        id: business.id,
        name: business.name,
        businessName: business.business_name,
        business_name: business.business_name,
        email: business.email,
        phone: business.phone,
        profession: business.profession,
        address: business.address,
        slug: business.slug,
        logoUrl: business.logo_url,
        logo_url: business.logo_url,
      },
      staff: staffResult.rows.map((member) => ({
        id: member.id,
        name: member.name,
        phone: member.phone,
        email: member.email,
        color: member.color || "#0071e3",
        isActive: member.is_active,
        is_active: member.is_active,
      })),
    });
  } catch (error) {
    console.error("Error public staff:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.get("/public/:slug/slots", async (req, res) => {
  try {
    const slug = String(req.params.slug || "").trim().toLowerCase();
    const bookingDate = String(req.query.date || "").slice(0, 10);
    const serviceId = Number(req.query.serviceId || req.query.service_id);
    const staffId = Number(req.query.staffId || req.query.staff_id);

    if (!bookingDate) {
      return res.status(400).json({ error: "La fecha es obligatoria" });
    }

    if (!serviceId) {
      return res.status(400).json({ error: "El servicio es obligatorio" });
    }

    if (!staffId) {
      return res.status(400).json({ error: "El profesional es obligatorio" });
    }

    const business = await getBusinessBySlug(slug);

    if (!business) {
      return res.status(404).json({ error: "Negocio no encontrado" });
    }

    if (business.status !== "active") {
      return res.status(403).json({ error: "Negocio no disponible" });
    }

    const service = await getServiceForBusiness(serviceId, business.id);

    if (!service) {
      return res.status(404).json({ error: "Servicio no encontrado" });
    }

    const staff = await getStaffForBusiness(staffId, business.id);

    if (!staff) {
      return res.status(404).json({ error: "Profesional no encontrado" });
    }

    const availability = await getStaffAvailabilityForDate(staff.id, bookingDate);

    if (!availability || !availability.is_active) {
      return res.json({
        slots: [],
        business: {
          id: business.id,
          businessName: business.business_name,
          business_name: business.business_name,
          address: business.address,
          slug: business.slug,
          logoUrl: business.logo_url,
          logo_url: business.logo_url,
        },
        staff: {
          id: staff.id,
          name: staff.name,
          color: staff.color || "#0071e3",
        },
        service: {
          id: service.id,
          name: service.name,
          durationMinutes: service.duration_minutes,
          duration_minutes: service.duration_minutes,
        },
      });
    }

    const durationMinutes = Number(service.duration_minutes || 30);
    const intervalMinutes = Number(
      availability.slot_duration_minutes || durationMinutes || 30
    );

    const startMinutes = timeToMinutes(availability.start_time);
    const endMinutes = timeToMinutes(availability.end_time);

    const occupied = await getOccupiedBookings({
      professionalId: business.id,
      staffId: staff.id,
      bookingDate,
    });

    const slots = [];

    for (
      let current = startMinutes;
      current + durationMinutes <= endMinutes;
      current += intervalMinutes
    ) {
      const slotStart = current;
      const slotEnd = current + durationMinutes;

      const isOccupied = occupied.some((booking) => {
        const bookingStart = timeToMinutes(booking.start_time);
        const bookingEnd = timeToMinutes(booking.end_time);

        return rangesOverlap(slotStart, slotEnd, bookingStart, bookingEnd);
      });

      slots.push({
        time: minutesToTime(slotStart),
        startTime: minutesToTime(slotStart),
        start_time: minutesToTime(slotStart),
        endTime: minutesToTime(slotEnd),
        end_time: minutesToTime(slotEnd),
        available: !isOccupied,
      });
    }

    res.json({
      slots,
      business: {
        id: business.id,
        businessName: business.business_name,
        business_name: business.business_name,
        address: business.address,
        slug: business.slug,
        logoUrl: business.logo_url,
        logo_url: business.logo_url,
      },
      staff: {
        id: staff.id,
        name: staff.name,
        color: staff.color || "#0071e3",
      },
      service: {
        id: service.id,
        name: service.name,
        durationMinutes: service.duration_minutes,
        duration_minutes: service.duration_minutes,
      },
    });
  } catch (error) {
    console.error("Error public slots:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.post("/public/:slug/book", async (req, res) => {
  try {
    const slug = String(req.params.slug || "").trim().toLowerCase();

    const clientName = String(req.body.clientName || req.body.client_name || "").trim();
    const clientPhone = String(req.body.clientPhone || req.body.client_phone || "").trim();
    const comment = String(req.body.comment || "").trim();

    const bookingDate = String(req.body.bookingDate || req.body.booking_date || "").slice(0, 10);
    const startTime = normalizeTime(req.body.startTime || req.body.start_time);

    const serviceId = Number(req.body.serviceId || req.body.service_id);
    const staffId = Number(req.body.staffId || req.body.staff_id);

    if (!clientName) {
      return res.status(400).json({ error: "El nombre es obligatorio" });
    }

    if (!clientPhone) {
      return res.status(400).json({ error: "El teléfono es obligatorio" });
    }

    if (!bookingDate) {
      return res.status(400).json({ error: "La fecha es obligatoria" });
    }

    if (!startTime) {
      return res.status(400).json({ error: "El horario es obligatorio" });
    }

    if (!serviceId) {
      return res.status(400).json({ error: "El servicio es obligatorio" });
    }

    if (!staffId) {
      return res.status(400).json({ error: "El profesional es obligatorio" });
    }

    const business = await getBusinessBySlug(slug);

    if (!business) {
      return res.status(404).json({ error: "Negocio no encontrado" });
    }

    if (business.status !== "active") {
      return res.status(403).json({ error: "Negocio no disponible" });
    }

    const service = await getServiceForBusiness(serviceId, business.id);

    if (!service) {
      return res.status(404).json({ error: "Servicio no encontrado" });
    }

    const staff = await getStaffForBusiness(staffId, business.id);

    if (!staff) {
      return res.status(404).json({ error: "Profesional no encontrado" });
    }

    const availability = await getStaffAvailabilityForDate(staff.id, bookingDate);

    if (!availability || !availability.is_active) {
      return res.status(409).json({
        error: "El profesional no atiende en esa fecha",
      });
    }

    const durationMinutes = Number(service.duration_minutes || 30);
    const endTime = addMinutesToTime(startTime, durationMinutes);

    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    const availableStart = timeToMinutes(availability.start_time);
    const availableEnd = timeToMinutes(availability.end_time);

    if (startMinutes < availableStart || endMinutes > availableEnd) {
      return res.status(409).json({
        error: "Ese horario está fuera de la disponibilidad del profesional",
      });
    }

    const isAvailable = await checkSlotAvailable({
      professionalId: business.id,
      staffId: staff.id,
      bookingDate,
      startTime,
      endTime,
    });

    if (!isAvailable) {
      return res.status(409).json({
        error: "Ese horario ya no está disponible",
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
        business.id,
        staff.id,
        service.id,
        clientName,
        clientPhone,
        comment || null,
        bookingDate,
        startTime,
        endTime,
        confirmationToken,
      ]
    );

    const booking = result.rows[0];

    res.status(201).json({
      success: true,
      booking: normalizeBooking({
        ...booking,
        staff_name: staff.name,
        staff_color: staff.color,
        service_name: service.name,
        service_duration_minutes: service.duration_minutes,
        service_price: service.price,
      }),
      confirmationUrl: `${getFrontendUrl()}/confirmar-reserva/${confirmationToken}`,
      confirmation_url: `${getFrontendUrl()}/confirmar-reserva/${confirmationToken}`,
    });
  } catch (error) {
    console.error("Error public book:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.get("/me", async (req, res) => {
  try {
    const professionalId = getProfessionalIdFromRequest(req);

    const result = await db.query(
      `
      SELECT
        b.*,
        s.name AS staff_name,
        s.color AS staff_color,
        ps.name AS service_name,
        ps.duration_minutes AS service_duration_minutes,
        ps.price AS service_price
      FROM bookings b
      LEFT JOIN staff_members s ON s.id = b.staff_id
      LEFT JOIN professional_services ps ON ps.id = b.service_id
      WHERE b.professional_id = $1
      ORDER BY b.booking_date DESC NULLS LAST, b.start_time DESC NULLS LAST, b.created_at DESC
      `,
      [professionalId]
    );

    res.json({
      bookings: result.rows.map(normalizeBooking),
    });
  } catch (error) {
    console.error("Error bookings me:", error);
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
      SET status = 'confirmed', updated_at = NOW()
      WHERE id = $1
        AND professional_id = $2
      RETURNING *
      `,
      [bookingId, professionalId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Reserva no encontrada" });
    }

    res.json({
      success: true,
      booking: normalizeBooking(result.rows[0]),
    });
  } catch (error) {
    console.error("Error confirm booking:", error);
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
      SET status = 'cancelled', updated_at = NOW()
      WHERE id = $1
        AND professional_id = $2
      RETURNING *
      `,
      [bookingId, professionalId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Reserva no encontrada" });
    }

    res.json({
      success: true,
      booking: normalizeBooking(result.rows[0]),
    });
  } catch (error) {
    console.error("Error cancel booking:", error);
    res.status(error.status || 500).json({
      error: error.message || "Error cancelando reserva",
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
      SET status = 'completed', updated_at = NOW()
      WHERE id = $1
        AND professional_id = $2
      RETURNING *
      `,
      [bookingId, professionalId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Reserva no encontrada" });
    }

    res.json({
      success: true,
      booking: normalizeBooking(result.rows[0]),
    });
  } catch (error) {
    console.error("Error complete booking:", error);
    res.status(error.status || 500).json({
      error: error.message || "Error completando reserva",
    });
  }
});

router.patch("/:id/no-show", async (req, res) => {
  try {
    const professionalId = getProfessionalIdFromRequest(req);
    const bookingId = Number(req.params.id);

    const result = await db.query(
      `
      UPDATE bookings
      SET status = 'no_show', updated_at = NOW()
      WHERE id = $1
        AND professional_id = $2
      RETURNING *
      `,
      [bookingId, professionalId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Reserva no encontrada" });
    }

    res.json({
      success: true,
      booking: normalizeBooking(result.rows[0]),
    });
  } catch (error) {
    console.error("Error no-show booking:", error);
    res.status(error.status || 500).json({
      error: error.message || "Error marcando inasistencia",
    });
  }
});

router.patch("/:id/reschedule", async (req, res) => {
  try {
    const professionalId = getProfessionalIdFromRequest(req);
    const bookingId = Number(req.params.id);

    const bookingDate = String(req.body.bookingDate || req.body.booking_date || "").slice(0, 10);
    const startTime = normalizeTime(req.body.startTime || req.body.start_time);

    if (!bookingDate || !startTime) {
      return res.status(400).json({ error: "Fecha y horario son obligatorios" });
    }

    const existingResult = await db.query(
      `
      SELECT
        b.*,
        ps.duration_minutes
      FROM bookings b
      LEFT JOIN professional_services ps ON ps.id = b.service_id
      WHERE b.id = $1
        AND b.professional_id = $2
      LIMIT 1
      `,
      [bookingId, professionalId]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: "Reserva no encontrada" });
    }

    const existing = existingResult.rows[0];
    const durationMinutes = Number(existing.duration_minutes || 30);
    const endTime = addMinutesToTime(startTime, durationMinutes);

    if (existing.staff_id) {
      const isAvailable = await checkSlotAvailable({
        professionalId,
        staffId: existing.staff_id,
        bookingDate,
        startTime,
        endTime,
      });

      if (!isAvailable) {
        return res.status(409).json({ error: "Ese horario ya no está disponible" });
      }
    }

    const result = await db.query(
      `
      UPDATE bookings
      SET
        booking_date = $1,
        start_time = $2,
        end_time = $3,
        updated_at = NOW()
      WHERE id = $4
        AND professional_id = $5
      RETURNING *
      `,
      [bookingDate, startTime, endTime, bookingId, professionalId]
    );

    res.json({
      success: true,
      booking: normalizeBooking(result.rows[0]),
    });
  } catch (error) {
    console.error("Error reschedule booking:", error);
    res.status(error.status || 500).json({
      error: error.message || "Error reprogramando reserva",
    });
  }
});

router.get("/public/confirmation/:token", async (req, res) => {
  try {
    const token = String(req.params.token || "").trim();

    const result = await db.query(
      `
      SELECT
        b.*,
        p.business_name,
        p.address,
        p.slug,
        p.logo_url,
        s.name AS staff_name,
        s.color AS staff_color,
        ps.name AS service_name,
        ps.duration_minutes AS service_duration_minutes,
        ps.price AS service_price
      FROM bookings b
      LEFT JOIN professionals p ON p.id = b.professional_id
      LEFT JOIN staff_members s ON s.id = b.staff_id
      LEFT JOIN professional_services ps ON ps.id = b.service_id
      WHERE b.confirmation_token = $1
      LIMIT 1
      `,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Reserva no encontrada" });
    }

    const row = result.rows[0];

    res.json({
      booking: normalizeBooking(row),
      business: {
        businessName: row.business_name,
        business_name: row.business_name,
        address: row.address,
        slug: row.slug,
        logoUrl: row.logo_url,
        logo_url: row.logo_url,
      },
    });
  } catch (error) {
    console.error("Error confirmation booking:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.patch("/public/confirmation/:token/confirm", async (req, res) => {
  try {
    const token = String(req.params.token || "").trim();

    const result = await db.query(
      `
      UPDATE bookings
      SET
        status = 'confirmed',
        client_confirmed_at = NOW(),
        updated_at = NOW()
      WHERE confirmation_token = $1
        AND status != 'cancelled'
      RETURNING *
      `,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Reserva no encontrada" });
    }

    res.json({
      success: true,
      booking: normalizeBooking(result.rows[0]),
    });
  } catch (error) {
    console.error("Error public confirmation confirm:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.patch("/public/confirmation/:token/cancel", async (req, res) => {
  try {
    const token = String(req.params.token || "").trim();

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
      return res.status(404).json({ error: "Reserva no encontrada" });
    }

    res.json({
      success: true,
      booking: normalizeBooking(result.rows[0]),
    });
  } catch (error) {
    console.error("Error public confirmation cancel:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

module.exports = router;
const { db } = require('../db');
const { AppError } = require('../utils/errors');
const { getAvailableSlotsForDate } = require('../utils/slots');
const { sendBookingConfirmation } = require('./whatsapp');
const logger = require('../utils/logger');

function createBookingAtomic({ professional, date, time, clientName, clientPhone, clientEmail }) {
  const createTx = db.transaction(() => {
    const conflict = db.prepare(`
      SELECT id FROM bookings
      WHERE professional_id = ? AND date = ? AND time = ? AND status = 'confirmed'
    `).get(professional.id, date, time);

    if (conflict) {
      throw new AppError(409, 'Ese horario ya está ocupado');
    }

    const available = getAvailableSlotsForDate(
      db,
      professional.id,
      date,
      professional.duration_minutes,
    );

    if (!available.includes(time)) {
      throw new AppError(409, 'Ese horario ya no está disponible');
    }

    const result = db.prepare(`
      INSERT INTO bookings (professional_id, date, time, client_name, client_phone, client_email)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(professional.id, date, time, clientName, clientPhone, clientEmail || '');

    return db.prepare('SELECT * FROM bookings WHERE id = ?').get(result.lastInsertRowid);
  });

  return createTx();
}

async function createBookingWithNotification(input) {
  const professional = db.prepare(
    'SELECT * FROM professionals WHERE slug = ? AND active = 1',
  ).get(input.slug);

  if (!professional) {
    throw new AppError(404, 'Profesional no encontrado');
  }

  const booking = createBookingAtomic({
    professional,
    date: input.date,
    time: input.time,
    clientName: input.clientName,
    clientPhone: input.clientPhone,
    clientEmail: input.clientEmail,
  });

  let whatsappSent = false;
  try {
    const result = await sendBookingConfirmation(booking, professional);
    whatsappSent = Boolean(result && !result.simulated);
  } catch (err) {
    logger.error('Error enviando confirmación WhatsApp', { err: err.message, bookingId: booking.id });
  }

  logger.info('Reserva creada', {
    bookingId: booking.id,
    professionalId: professional.id,
    date: booking.date,
    time: booking.time,
  });

  return {
    id: booking.id,
    date: booking.date,
    time: booking.time,
    clientName: booking.client_name,
    clientPhone: booking.client_phone,
    whatsappSent,
    professional: {
      name: professional.name,
      specialty: professional.specialty,
      duration_minutes: professional.duration_minutes,
    },
  };
}

module.exports = { createBookingAtomic, createBookingWithNotification };

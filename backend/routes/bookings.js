const express = require('express');
const { db } = require('../db');
const { authProfessional } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { bookingLimiter } = require('../middleware/rateLimit');
const { validateBookingInput } = require('../utils/validate');
const { AppError } = require('../utils/errors');
const { createBookingWithNotification } = require('../services/bookingService');
const logger = require('../utils/logger');

const router = express.Router();

router.post('/', bookingLimiter, asyncHandler(async (req, res) => {
  const input = validateBookingInput(req.body);
  const result = await createBookingWithNotification(input);
  res.status(201).json(result);
}));

router.get('/:id/confirmation', asyncHandler((req, res) => {
  const booking = db.prepare(`
    SELECT b.id, b.date, b.time, b.client_name, b.status,
           p.name as professional_name, p.specialty, p.duration_minutes
    FROM bookings b
    JOIN professionals p ON p.id = b.professional_id
    WHERE b.id = ?
  `).get(req.params.id);

  if (!booking) {
    throw new AppError(404, 'Reserva no encontrada');
  }

  if (booking.status !== 'confirmed') {
    throw new AppError(410, 'Esta reserva fue cancelada');
  }

  res.json({
    id: booking.id,
    date: booking.date,
    time: booking.time,
    clientName: booking.client_name,
    professional: {
      name: booking.professional_name,
      specialty: booking.specialty,
      duration_minutes: booking.duration_minutes,
    },
  });
}));

router.delete('/:id', authProfessional, asyncHandler((req, res) => {
  const booking = db.prepare(
    'SELECT * FROM bookings WHERE id = ? AND professional_id = ?',
  ).get(req.params.id, req.user.id);

  if (!booking) {
    throw new AppError(404, 'Turno no encontrado');
  }

  db.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").run(req.params.id);
  logger.info('Reserva cancelada', { bookingId: booking.id, professionalId: req.user.id });
  res.json({ ok: true });
}));

module.exports = router;

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const db = require('../db');

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  try {
    const decoded = jwt.verify(
      header.slice(7),
      process.env.JWT_SECRET || 'tuagendaya-secret-dev-change-in-prod'
    );
    req.professional = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

function generateSlots() {
  const slots = [];
  for (let h = 9; h < 18; h++) {
    for (let m = 0; m < 60; m += 30) {
      slots.push(
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      );
    }
  }
  return slots; // 09:00 … 17:30
}

// ══════════════════════════════════════════════════════════════
// RUTAS PÚBLICAS
// ══════════════════════════════════════════════════════════════

router.get('/public/:slug', async (req, res) => {
  try {
    const prof = (await db.query(
      `SELECT id, name, profession, slug, bio, avatar_initials, plan, status
       FROM professionals WHERE slug = $1`,
      [req.params.slug]
    )).rows[0];

    if (!prof) return res.status(404).json({ error: 'Profesional no encontrado' });
    if (prof.status === 'suspended') {
      return res.status(403).json({ error: 'Este profesional no está disponible.', suspended: true });
    }

    const services = (await db.query(
      `SELECT id, name, duration, price, description, color
       FROM services WHERE professional_id = $1 AND active = 1
       ORDER BY sort_order, id`,
      [prof.id]
    )).rows;

    const policy = (await db.query(
      `SELECT enabled, hours_before, fee_type, fee_fixed_amount, fee_percentage, policy_text, show_on_booking
       FROM cancellation_policies WHERE professional_id = $1`,
      [prof.id]
    )).rows[0];

    res.json({ professional: prof, services, cancellation_policy: policy });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/bookings/public/:slug/slots?date=YYYY-MM-DD
router.get('/public/:slug/slots', async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'date requerido (YYYY-MM-DD)' });

  try {
    const prof = (await db.query(
      'SELECT id, status FROM professionals WHERE slug = $1',
      [req.params.slug]
    )).rows[0];
    if (!prof) return res.status(404).json({ error: 'Profesional no encontrado' });
    if (prof.status === 'suspended') {
      return res.status(403).json({ error: 'Este profesional no está disponible.', suspended: true });
    }

    // Horarios ya reservados para ese profesional y fecha (excluyendo cancelados)
    const booked = (await db.query(
      `SELECT start_time FROM bookings
       WHERE professional_id = $1 AND booking_date = $2 AND status != 'cancelled'`,
      [prof.id, date]
    )).rows;

    // pg devuelve TIME como "09:00:00" — normalizamos a "HH:MM"
    const bookedSet = new Set(booked.map(r => String(r.start_time).slice(0, 5)));

    const slots = generateSlots().map(time => ({
      time,
      available: !bookedSet.has(time),
    }));

    res.json({ date, slots });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/public/:slug/available-days', async (req, res) => {
  try {
    const prof = (await db.query(
      'SELECT id, status FROM professionals WHERE slug = $1',
      [req.params.slug]
    )).rows[0];
    if (!prof) return res.status(404).json({ error: 'No encontrado' });
    if (prof.status === 'suspended') {
      return res.status(403).json({ error: 'Este profesional no está disponible.', suspended: true });
    }

    res.json({ available_days: [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/public/:slug/book', async (req, res) => {
  const { clientName, clientPhone, comment, bookingDate, startTime, endTime } = req.body;

  if (!clientName) return res.status(400).json({ error: 'El nombre es requerido' });
  if (!clientPhone) return res.status(400).json({ error: 'El teléfono es requerido' });
  if (!bookingDate) return res.status(400).json({ error: 'La fecha es requerida' });
  if (!startTime) return res.status(400).json({ error: 'El horario de inicio es requerido' });

  try {
    const prof = (await db.query(
      'SELECT id, status FROM professionals WHERE slug = $1',
      [req.params.slug]
    )).rows[0];
    if (!prof) return res.status(404).json({ error: 'Profesional no encontrado' });
    if (prof.status === 'suspended') {
      return res.status(403).json({ error: 'Este profesional no está disponible.', suspended: true });
    }

    // Verificar que el horario sigue disponible al momento de confirmar
    const conflict = (await db.query(
      `SELECT id FROM bookings
       WHERE professional_id = $1 AND booking_date = $2 AND start_time = $3 AND status != 'cancelled'`,
      [prof.id, bookingDate, startTime]
    )).rows[0];
    if (conflict) {
      return res.status(409).json({ error: 'Ese horario ya fue reservado. Por favor elegí otro.' });
    }

    const result = await db.query(
      `INSERT INTO bookings (professional_id, client_name, client_phone, comment, status, booking_date, start_time, end_time)
       VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7) RETURNING id`,
      [prof.id, clientName, clientPhone, comment || null, bookingDate, startTime, endTime || null]
    );

    res.status(201).json({ success: true, bookingId: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear la reserva' });
  }
});

router.get('/token/:token', async (req, res) => {
  try {
    const appointment = (await db.query(
      `SELECT a.*, s.name as service_name, s.duration as service_duration, s.price as service_price,
              p.name as professional_name, p.profession, p.slug
       FROM appointments a
       JOIN services s ON a.service_id = s.id
       JOIN professionals p ON a.professional_id = p.id
       WHERE a.public_token = $1`,
      [req.params.token]
    )).rows[0];

    if (!appointment) return res.status(404).json({ error: 'Turno no encontrado' });

    const policy = (await db.query(
      'SELECT * FROM cancellation_policies WHERE professional_id = $1',
      [appointment.professional_id]
    )).rows[0];

    res.json({ appointment, cancellation_policy: policy });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/token/:token/confirm', async (req, res) => {
  try {
    const appointment = (await db.query(
      'SELECT * FROM appointments WHERE public_token = $1',
      [req.params.token]
    )).rows[0];
    if (!appointment) return res.status(404).json({ error: 'Turno no encontrado' });
    if (appointment.status === 'cancelled') return res.status(409).json({ error: 'El turno fue cancelado' });
    if (appointment.status === 'confirmed') return res.json({ message: 'Ya confirmado', appointment });

    await db.query(
      "UPDATE appointments SET status = 'confirmed', confirmed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [appointment.id]
    );

    await db.query(
      `INSERT INTO appointment_history (appointment_id, professional_id, action, old_status, new_status, performed_by)
       VALUES ($1, $2, 'confirmed', $3, 'confirmed', 'client')`,
      [appointment.id, appointment.professional_id, appointment.status]
    );

    res.json({ message: 'Asistencia confirmada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/token/:token/cancel', async (req, res) => {
  const { reason } = req.body;
  try {
    const appointment = (await db.query(
      'SELECT * FROM appointments WHERE public_token = $1',
      [req.params.token]
    )).rows[0];
    if (!appointment) return res.status(404).json({ error: 'Turno no encontrado' });
    if (['cancelled', 'completed', 'no_show'].includes(appointment.status)) {
      return res.status(409).json({ error: 'El turno no puede ser cancelado' });
    }

    const policy = (await db.query(
      'SELECT * FROM cancellation_policies WHERE professional_id = $1',
      [appointment.professional_id]
    )).rows[0];

    let feeApplied = 0;
    let feeAmount = 0;
    if (policy && policy.enabled) {
      const hoursUntil = (new Date(appointment.start_time) - new Date()) / (1000 * 60 * 60);
      if (hoursUntil < policy.hours_before) {
        feeApplied = 1;
        const service = (await db.query(
          'SELECT price FROM services WHERE id = $1',
          [appointment.service_id]
        )).rows[0];
        if (policy.fee_type === 'fixed') {
          feeAmount = policy.fee_fixed_amount;
        } else if (policy.fee_type === 'percentage') {
          feeAmount = ((service ? service.price : 0) || 0) * policy.fee_percentage / 100;
        }
      }
    }

    await db.query(
      `UPDATE appointments SET
        status = 'cancelled', cancellation_reason = $1, cancelled_by = 'client',
        cancelled_at = CURRENT_TIMESTAMP, cancellation_fee_applied = $2, cancellation_fee_amount = $3,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [reason || null, feeApplied, feeAmount, appointment.id]
    );

    await db.query(
      `INSERT INTO appointment_history (appointment_id, professional_id, action, old_status, new_status, note, performed_by)
       VALUES ($1, $2, 'cancelled', $3, 'cancelled', $4, 'client')`,
      [appointment.id, appointment.professional_id, appointment.status, reason || null]
    );

    if (appointment.client_id) {
      await db.query(
        'UPDATE clients SET cancellation_count = cancellation_count + 1 WHERE id = $1',
        [appointment.client_id]
      );
    }

    res.json({ message: 'Turno cancelado', fee_applied: feeApplied, fee_amount: feeAmount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ══════════════════════════════════════════════════════════════
// RUTAS PRIVADAS (requieren token JWT del profesional)
// ══════════════════════════════════════════════════════════════

router.get('/slots', authMiddleware, (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'date requerido' });
  res.json({ date, slots: [] });
});

router.get('/metrics/summary', authMiddleware, async (req, res) => {
  const profId = req.professional.id;
  const today = new Date().toISOString().slice(0, 10);
  const thisMonthStart = today.slice(0, 7) + '-01';
  const lastMonthStart = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().slice(0, 10);
  const lastMonthEnd = new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString().slice(0, 10);

  try {
    const todayAppts = (await db.query(
      `SELECT COUNT(*) as count,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as no_show
       FROM appointments WHERE professional_id = $1 AND start_time::date = $2::date`,
      [profId, today]
    )).rows[0];

    const thisMonth = (await db.query(
      `SELECT COUNT(*) as total,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as no_shows,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN status = 'completed' THEN s.price ELSE 0 END) as revenue,
        SUM(CASE WHEN status = 'no_show' THEN s.price ELSE 0 END) as lost_revenue
       FROM appointments a
       JOIN services s ON a.service_id = s.id
       WHERE a.professional_id = $1 AND a.start_time::date >= $2::date`,
      [profId, thisMonthStart]
    )).rows[0];

    const lastMonth = (await db.query(
      `SELECT COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN s.price ELSE 0 END) as revenue
       FROM appointments a JOIN services s ON a.service_id = s.id
       WHERE a.professional_id = $1 AND a.start_time::date BETWEEN $2::date AND $3::date`,
      [profId, lastMonthStart, lastMonthEnd]
    )).rows[0];

    const clientsRow = (await db.query(
      'SELECT COUNT(*) as total FROM clients WHERE professional_id = $1',
      [profId]
    )).rows[0];

    const topServices = (await db.query(
      `SELECT s.name, COUNT(*) as count,
        SUM(CASE WHEN a.status = 'completed' THEN s.price ELSE 0 END) as revenue
       FROM appointments a JOIN services s ON a.service_id = s.id
       WHERE a.professional_id = $1 AND a.start_time::date >= $2::date
       GROUP BY s.id, s.name ORDER BY count DESC LIMIT 5`,
      [profId, thisMonthStart]
    )).rows;

    const peakHours = (await db.query(
      `SELECT TO_CHAR(start_time, 'HH24') as hour, COUNT(*) as count
       FROM appointments WHERE professional_id = $1 AND status IN ('confirmed','completed')
       GROUP BY hour ORDER BY count DESC LIMIT 5`,
      [profId]
    )).rows;

    const totalThisMonth = parseInt(thisMonth.total) || 0;
    const noShows = parseInt(thisMonth.no_shows) || 0;
    const noShowRate = totalThisMonth > 0 ? Math.round((noShows / totalThisMonth) * 100) : 0;

    const revThis = parseFloat(thisMonth.revenue) || 0;
    const revLast = parseFloat(lastMonth.revenue) || 0;
    const revenueGrowth = revLast > 0 ? Math.round(((revThis - revLast) / revLast) * 100) : null;

    res.json({
      today: todayAppts,
      this_month: { ...thisMonth, no_show_rate: noShowRate },
      last_month: lastMonth,
      clients: parseInt(clientsRow.total) || 0,
      revenue_growth: revenueGrowth,
      top_services: topServices,
      peak_hours: peakHours,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/', authMiddleware, async (req, res) => {
  const { date, from, to, status, limit = 50, offset = 0 } = req.query;
  const profId = req.professional.id;

  let where = 'WHERE a.professional_id = $1';
  const params = [profId];
  let idx = 2;

  if (date) {
    where += ` AND a.start_time::date = $${idx}::date`;
    params.push(date);
    idx++;
  } else if (from && to) {
    where += ` AND a.start_time::date BETWEEN $${idx}::date AND $${idx + 1}::date`;
    params.push(from, to);
    idx += 2;
  }

  if (status) {
    const statuses = status.split(',');
    where += ` AND a.status = ANY($${idx}::text[])`;
    params.push(statuses);
    idx++;
  }

  try {
    const countParams = [...params];
    params.push(parseInt(limit), parseInt(offset));

    const appointments = (await db.query(
      `SELECT a.*,
        s.name as service_name, s.duration as service_duration, s.price as service_price, s.color as service_color,
        c.name as client_full_name, c.no_show_count, c.total_visits, c.cancellation_count
       FROM appointments a
       JOIN services s ON a.service_id = s.id
       LEFT JOIN clients c ON a.client_id = c.id
       ${where}
       ORDER BY a.start_time ASC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      params
    )).rows;

    const totalRow = (await db.query(
      `SELECT COUNT(*) as count FROM appointments a ${where}`,
      countParams
    )).rows[0];

    res.json({ appointments, total: parseInt(totalRow.count), limit: parseInt(limit), offset: parseInt(offset) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ⚠️ /me DEBE ir ANTES de /:id
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const bookings = (await db.query(
      `SELECT id, professional_id, client_name, client_phone, comment, status,
              booking_date, start_time, end_time, created_at
       FROM bookings
       WHERE professional_id = $1
       ORDER BY
         booking_date ASC NULLS LAST,
         start_time ASC NULLS LAST,
         created_at DESC
       LIMIT 100`,
      [req.professional.id]
    )).rows;
    res.json({ bookings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener reservas' });
  }
});

// ⚠️ PATCH /:id/confirm y /:id/cancel DEBEN ir ANTES de GET /:id
router.patch('/:id/confirm', authMiddleware, async (req, res) => {
  try {
    const booking = (await db.query(
      'SELECT * FROM bookings WHERE id = $1 AND professional_id = $2',
      [parseInt(req.params.id), req.professional.id]
    )).rows[0];
    if (!booking) return res.status(404).json({ error: 'Reserva no encontrada' });

    await db.query("UPDATE bookings SET status = 'confirmed' WHERE id = $1", [booking.id]);

    const updated = (await db.query('SELECT * FROM bookings WHERE id = $1', [booking.id])).rows[0];
    res.json({ success: true, booking: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al confirmar la reserva' });
  }
});

router.patch('/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const booking = (await db.query(
      'SELECT * FROM bookings WHERE id = $1 AND professional_id = $2',
      [parseInt(req.params.id), req.professional.id]
    )).rows[0];
    if (!booking) return res.status(404).json({ error: 'Reserva no encontrada' });

    await db.query("UPDATE bookings SET status = 'cancelled' WHERE id = $1", [booking.id]);

    const updated = (await db.query('SELECT * FROM bookings WHERE id = $1', [booking.id])).rows[0];
    res.json({ success: true, booking: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al cancelar la reserva' });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const appointment = (await db.query(
      `SELECT a.*,
        s.name as service_name, s.duration as service_duration, s.price as service_price,
        c.name as client_full_name, c.no_show_count, c.private_notes as client_private_notes,
        c.total_visits, c.cancellation_count, c.total_spent
       FROM appointments a
       JOIN services s ON a.service_id = s.id
       LEFT JOIN clients c ON a.client_id = c.id
       WHERE a.id = $1 AND a.professional_id = $2`,
      [parseInt(req.params.id), req.professional.id]
    )).rows[0];

    if (!appointment) return res.status(404).json({ error: 'Turno no encontrado' });

    const history = (await db.query(
      'SELECT * FROM appointment_history WHERE appointment_id = $1 ORDER BY created_at DESC',
      [appointment.id]
    )).rows;

    res.json({ appointment, history });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  const { service_id, date, time, client_name, client_email, client_phone, client_notes, status } = req.body;
  if (!service_id || !date || !time || !client_name) {
    return res.status(400).json({ error: 'Faltan campos' });
  }

  const profId = req.professional.id;

  try {
    const service = (await db.query(
      'SELECT * FROM services WHERE id = $1 AND professional_id = $2',
      [parseInt(service_id), profId]
    )).rows[0];
    if (!service) return res.status(404).json({ error: 'Servicio no encontrado' });

    const startTimeFmt = `${date} ${time}:00`;
    const endDate = new Date(`${date}T${time}:00`);
    endDate.setMinutes(endDate.getMinutes() + service.duration);
    const endTimeFmt = endDate.toISOString().replace('T', ' ').slice(0, 19);
    const publicToken = crypto.randomUUID();

    let client = null;
    if (client_email) {
      client = (await db.query(
        'SELECT * FROM clients WHERE professional_id = $1 AND email = $2',
        [profId, client_email]
      )).rows[0];
      if (!client) {
        const cr = await db.query(
          'INSERT INTO clients (professional_id, name, email, phone) VALUES ($1, $2, $3, $4) RETURNING id',
          [profId, client_name, client_email, client_phone || null]
        );
        client = (await db.query('SELECT * FROM clients WHERE id = $1', [cr.rows[0].id])).rows[0];
      }
    }

    const initialStatus = status || 'confirmed';
    const result = await db.query(
      `INSERT INTO appointments
        (professional_id, client_id, service_id, client_name, client_email, client_phone, client_notes,
         start_time, end_time, status, public_token, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'manual') RETURNING id`,
      [
        profId, client ? client.id : null, service.id,
        client_name, client_email || null, client_phone || null, client_notes || null,
        startTimeFmt, endTimeFmt, initialStatus, publicToken,
      ]
    );
    const newId = result.rows[0].id;

    const appointment = (await db.query('SELECT * FROM appointments WHERE id = $1', [newId])).rows[0];

    await db.query(
      `INSERT INTO appointment_history (appointment_id, professional_id, action, new_status, performed_by)
       VALUES ($1, $2, 'created', $3, 'professional')`,
      [appointment.id, profId, initialStatus]
    );

    res.status(201).json({ appointment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.put('/:id/status', authMiddleware, async (req, res) => {
  const { status, reason } = req.body;
  const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'];
  if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Estado inválido' });

  try {
    const appointment = (await db.query(
      'SELECT * FROM appointments WHERE id = $1 AND professional_id = $2',
      [parseInt(req.params.id), req.professional.id]
    )).rows[0];
    if (!appointment) return res.status(404).json({ error: 'Turno no encontrado' });

    const oldStatus = appointment.status;
    const now = new Date().toISOString();

    const updates = { status, updated_at: now };
    if (status === 'confirmed') updates.confirmed_at = now;
    if (status === 'completed') {
      updates.completed_at = now;
      if (appointment.client_id) {
        const svc = (await db.query('SELECT price FROM services WHERE id = $1', [appointment.service_id])).rows[0];
        await db.query(
          'UPDATE clients SET total_visits = total_visits + 1, total_spent = total_spent + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [(svc ? svc.price : 0) || 0, appointment.client_id]
        );
      }
    }
    if (status === 'no_show') {
      updates.no_show_at = now;
      if (appointment.client_id) {
        await db.query(
          'UPDATE clients SET no_show_count = no_show_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
          [appointment.client_id]
        );
      }
    }
    if (status === 'cancelled') {
      updates.cancelled_at = now;
      updates.cancelled_by = 'professional';
      updates.cancellation_reason = reason || null;
      if (appointment.client_id) {
        await db.query(
          'UPDATE clients SET cancellation_count = cancellation_count + 1 WHERE id = $1',
          [appointment.client_id]
        );
      }
    }

    const updateEntries = Object.entries(updates);
    const setClauses = updateEntries.map(([k], i) => `${k} = $${i + 1}`).join(', ');
    const updateValues = updateEntries.map(([, v]) => v);
    updateValues.push(appointment.id);
    await db.query(
      `UPDATE appointments SET ${setClauses} WHERE id = $${updateEntries.length + 1}`,
      updateValues
    );

    await db.query(
      `INSERT INTO appointment_history (appointment_id, professional_id, action, old_status, new_status, note, performed_by)
       VALUES ($1, $2, $3, $4, $5, $6, 'professional')`,
      [appointment.id, req.professional.id, status, oldStatus, status, reason || null]
    );

    const updated = (await db.query('SELECT * FROM appointments WHERE id = $1', [appointment.id])).rows[0];
    res.json({ appointment: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.put('/:id/reschedule', authMiddleware, async (req, res) => {
  const { date, time } = req.body;
  if (!date || !time) return res.status(400).json({ error: 'date y time requeridos' });

  try {
    const appointment = (await db.query(
      'SELECT * FROM appointments WHERE id = $1 AND professional_id = $2',
      [parseInt(req.params.id), req.professional.id]
    )).rows[0];
    if (!appointment) return res.status(404).json({ error: 'Turno no encontrado' });
    if (['cancelled', 'completed', 'no_show'].includes(appointment.status)) {
      return res.status(409).json({ error: 'No se puede reprogramar este turno' });
    }

    const service = (await db.query('SELECT * FROM services WHERE id = $1', [appointment.service_id])).rows[0];
    const newStartStr = date + ' ' + time + ':00';
    const endDate = new Date(date + 'T' + time + ':00');
    endDate.setMinutes(endDate.getMinutes() + service.duration);
    const newEndTime = endDate.toISOString().replace('T', ' ').slice(0, 19);
    const oldStartTime = appointment.start_time;

    await db.query(
      `UPDATE appointments SET
        start_time = $1, end_time = $2,
        rescheduled_from_id = COALESCE(rescheduled_from_id, $3),
        rescheduled_at = CURRENT_TIMESTAMP, status = 'confirmed', updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [newStartStr, newEndTime, appointment.id, appointment.id]
    );

    await db.query(
      `INSERT INTO appointment_history
        (appointment_id, professional_id, action, old_start_time, new_start_time, old_status, new_status, performed_by)
       VALUES ($1, $2, 'rescheduled', $3, $4, $5, 'confirmed', 'professional')`,
      [appointment.id, req.professional.id, oldStartTime, newStartStr, appointment.status]
    );

    const updated = (await db.query('SELECT * FROM appointments WHERE id = $1', [appointment.id])).rows[0];
    res.json({ appointment: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
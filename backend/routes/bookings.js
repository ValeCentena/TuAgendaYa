const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const db = require('../db');

// Auth middleware definido inline para evitar dependencia de nombres de export
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

// ══════════════════════════════════════════════════════════════
// RUTAS PÚBLICAS
// ══════════════════════════════════════════════════════════════

router.get('/public/:slug', (req, res) => {
  const prof = db.prepare(`
    SELECT id, name, profession, slug, bio, avatar_initials, plan, status
    FROM professionals WHERE slug = ?
  `).get(req.params.slug);

  if (!prof) return res.status(404).json({ error: 'Profesional no encontrado' });
  if (prof.status === 'suspended') {
    return res.status(403).json({ error: 'Este profesional no está disponible.', suspended: true });
  }

  const services = db.prepare(`
    SELECT id, name, duration, price, description, color
    FROM services WHERE professional_id = ? AND active = 1
    ORDER BY sort_order, id
  `).all(prof.id);

  const policy = db.prepare(`
    SELECT enabled, hours_before, fee_type, fee_fixed_amount, fee_percentage, policy_text, show_on_booking
    FROM cancellation_policies WHERE professional_id = ?
  `).get(prof.id);

  res.json({ professional: prof, services, cancellation_policy: policy });
});

router.get('/public/:slug/slots', (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'date requerido' });

  const prof = db.prepare('SELECT id, status FROM professionals WHERE slug = ?').get(req.params.slug);
  if (!prof) return res.status(404).json({ error: 'No encontrado' });
  if (prof.status === 'suspended') {
    return res.status(403).json({ error: 'Este profesional no está disponible.', suspended: true });
  }

  // TODO: implementar cálculo de slots
  res.json({ date, slots: [] });
});

router.get('/public/:slug/available-days', (req, res) => {
  const prof = db.prepare('SELECT id, status FROM professionals WHERE slug = ?').get(req.params.slug);
  if (!prof) return res.status(404).json({ error: 'No encontrado' });
  if (prof.status === 'suspended') {
    return res.status(403).json({ error: 'Este profesional no está disponible.', suspended: true });
  }

  // TODO: implementar días disponibles
  res.json({ available_days: [] });
});

router.post('/public/:slug/book', (req, res) => {
  const { clientName, clientPhone, comment } = req.body;

  if (!clientName || !clientPhone) {
    return res.status(400).json({ error: 'Nombre y teléfono son requeridos' });
  }

  try {
    const prof = db.prepare('SELECT id, status FROM professionals WHERE slug = ?').get(req.params.slug);
    if (!prof) return res.status(404).json({ error: 'Profesional no encontrado' });
    if (prof.status === 'suspended') {
      return res.status(403).json({ error: 'Este profesional no está disponible.', suspended: true });
    }

    const result = db.prepare(`
      INSERT INTO bookings (professional_id, client_name, client_phone, comment, status)
      VALUES (?, ?, ?, ?, 'pending')
    `).run(prof.id, clientName, clientPhone, comment || null);

    res.status(201).json({ success: true, bookingId: result.lastInsertRowid });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear la reserva' });
  }
});

router.get('/token/:token', (req, res) => {
  const appointment = db.prepare(`
    SELECT a.*, s.name as service_name, s.duration as service_duration, s.price as service_price,
           p.name as professional_name, p.profession, p.slug
    FROM appointments a
    JOIN services s ON a.service_id = s.id
    JOIN professionals p ON a.professional_id = p.id
    WHERE a.public_token = ?
  `).get(req.params.token);

  if (!appointment) return res.status(404).json({ error: 'Turno no encontrado' });

  const policy = db.prepare(
    'SELECT * FROM cancellation_policies WHERE professional_id = ?'
  ).get(appointment.professional_id);

  res.json({ appointment, cancellation_policy: policy });
});

router.post('/token/:token/confirm', (req, res) => {
  const appointment = db.prepare('SELECT * FROM appointments WHERE public_token = ?').get(req.params.token);
  if (!appointment) return res.status(404).json({ error: 'Turno no encontrado' });
  if (appointment.status === 'cancelled') return res.status(409).json({ error: 'El turno fue cancelado' });
  if (appointment.status === 'confirmed') return res.json({ message: 'Ya confirmado', appointment });

  db.prepare(
    "UPDATE appointments SET status = 'confirmed', confirmed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).run(appointment.id);

  db.prepare(`
    INSERT INTO appointment_history (appointment_id, professional_id, action, old_status, new_status, performed_by)
    VALUES (?, ?, 'confirmed', ?, 'confirmed', 'client')
  `).run(appointment.id, appointment.professional_id, appointment.status);

  res.json({ message: 'Asistencia confirmada' });
});

router.post('/token/:token/cancel', (req, res) => {
  const { reason } = req.body;
  const appointment = db.prepare('SELECT * FROM appointments WHERE public_token = ?').get(req.params.token);
  if (!appointment) return res.status(404).json({ error: 'Turno no encontrado' });
  if (['cancelled', 'completed', 'no_show'].includes(appointment.status)) {
    return res.status(409).json({ error: 'El turno no puede ser cancelado' });
  }

  const policy = db.prepare(
    'SELECT * FROM cancellation_policies WHERE professional_id = ?'
  ).get(appointment.professional_id);

  let feeApplied = 0;
  let feeAmount = 0;
  if (policy && policy.enabled) {
    const hoursUntil = (new Date(appointment.start_time) - new Date()) / (1000 * 60 * 60);
    if (hoursUntil < policy.hours_before) {
      feeApplied = 1;
      const service = db.prepare('SELECT price FROM services WHERE id = ?').get(appointment.service_id);
      if (policy.fee_type === 'fixed') {
        feeAmount = policy.fee_fixed_amount;
      } else if (policy.fee_type === 'percentage') {
        feeAmount = ((service ? service.price : 0) || 0) * policy.fee_percentage / 100;
      }
    }
  }

  db.prepare(`
    UPDATE appointments SET
      status = 'cancelled', cancellation_reason = ?, cancelled_by = 'client',
      cancelled_at = CURRENT_TIMESTAMP, cancellation_fee_applied = ?, cancellation_fee_amount = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(reason || null, feeApplied, feeAmount, appointment.id);

  db.prepare(`
    INSERT INTO appointment_history (appointment_id, professional_id, action, old_status, new_status, note, performed_by)
    VALUES (?, ?, 'cancelled', ?, 'cancelled', ?, 'client')
  `).run(appointment.id, appointment.professional_id, appointment.status, reason || null);

  if (appointment.client_id) {
    db.prepare('UPDATE clients SET cancellation_count = cancellation_count + 1 WHERE id = ?').run(appointment.client_id);
  }

  res.json({ message: 'Turno cancelado', fee_applied: feeApplied, fee_amount: feeAmount });
});

// ══════════════════════════════════════════════════════════════
// RUTAS PRIVADAS (requieren token JWT del profesional)
// ══════════════════════════════════════════════════════════════

// ⚠️ /slots y /metrics/summary DEBEN ir ANTES de /:id
router.get('/slots', authMiddleware, (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'date requerido' });
  // TODO: implementar cálculo de slots disponibles
  res.json({ date, slots: [] });
});

router.get('/metrics/summary', authMiddleware, (req, res) => {
  const profId = req.professional.id;
  const today = new Date().toISOString().slice(0, 10);
  const thisMonthStart = today.slice(0, 7) + '-01';
  const lastMonthStart = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().slice(0, 10);
  const lastMonthEnd = new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString().slice(0, 10);

  const todayAppts = db.prepare(`
    SELECT COUNT(*) as count,
      SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
      SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as no_show
    FROM appointments WHERE professional_id = ? AND date(start_time) = ?
  `).get(profId, today);

  const thisMonth = db.prepare(`
    SELECT COUNT(*) as total,
      SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as no_shows,
      SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
      SUM(CASE WHEN status = 'completed' THEN s.price ELSE 0 END) as revenue,
      SUM(CASE WHEN status = 'no_show' THEN s.price ELSE 0 END) as lost_revenue
    FROM appointments a
    JOIN services s ON a.service_id = s.id
    WHERE a.professional_id = ? AND date(a.start_time) >= ?
  `).get(profId, thisMonthStart);

  const lastMonth = db.prepare(`
    SELECT COUNT(*) as total,
      SUM(CASE WHEN status = 'completed' THEN s.price ELSE 0 END) as revenue
    FROM appointments a JOIN services s ON a.service_id = s.id
    WHERE a.professional_id = ? AND date(a.start_time) BETWEEN ? AND ?
  `).get(profId, lastMonthStart, lastMonthEnd);

  const clients = db.prepare('SELECT COUNT(*) as total FROM clients WHERE professional_id = ?').get(profId);

  const topServices = db.prepare(`
    SELECT s.name, COUNT(*) as count,
      SUM(CASE WHEN a.status = 'completed' THEN s.price ELSE 0 END) as revenue
    FROM appointments a JOIN services s ON a.service_id = s.id
    WHERE a.professional_id = ? AND date(a.start_time) >= ?
    GROUP BY s.id ORDER BY count DESC LIMIT 5
  `).all(profId, thisMonthStart);

  const peakHours = db.prepare(`
    SELECT strftime('%H', start_time) as hour, COUNT(*) as count
    FROM appointments WHERE professional_id = ? AND status IN ('confirmed','completed')
    GROUP BY hour ORDER BY count DESC LIMIT 5
  `).all(profId);

  const noShowRate = thisMonth.total > 0
    ? Math.round((thisMonth.no_shows / thisMonth.total) * 100)
    : 0;

  const revenueGrowth = lastMonth.revenue > 0
    ? Math.round(((thisMonth.revenue - lastMonth.revenue) / lastMonth.revenue) * 100)
    : null;

  res.json({
    today: todayAppts,
    this_month: { ...thisMonth, no_show_rate: noShowRate },
    last_month: lastMonth,
    clients: clients.total,
    revenue_growth: revenueGrowth,
    top_services: topServices,
    peak_hours: peakHours,
  });
});

router.get('/', authMiddleware, (req, res) => {
  const { date, from, to, status, limit = 50, offset = 0 } = req.query;
  const profId = req.professional.id;

  let where = 'WHERE a.professional_id = ?';
  const params = [profId];

  if (date) {
    where += ' AND date(a.start_time) = ?';
    params.push(date);
  } else if (from && to) {
    where += ' AND date(a.start_time) BETWEEN ? AND ?';
    params.push(from, to);
  }

  if (status) {
    const statuses = status.split(',');
    where += ' AND a.status IN (' + statuses.map(() => '?').join(',') + ')';
    params.push(...statuses);
  }

  const appointments = db.prepare(`
    SELECT a.*,
      s.name as service_name, s.duration as service_duration, s.price as service_price, s.color as service_color,
      c.name as client_full_name, c.no_show_count, c.total_visits, c.cancellation_count
    FROM appointments a
    JOIN services s ON a.service_id = s.id
    LEFT JOIN clients c ON a.client_id = c.id
    ${where}
    ORDER BY a.start_time ASC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), parseInt(offset));

  const total = db.prepare(
    'SELECT COUNT(*) as count FROM appointments a ' + where
  ).get(...params).count;

  res.json({ appointments, total, limit: parseInt(limit), offset: parseInt(offset) });
});

// ── GET /api/bookings/me — reservas del profesional autenticado ──
router.get('/me', authMiddleware, (req, res) => {
  try {
    const bookings = db.prepare(`
      SELECT * FROM bookings
      WHERE professional_id = ?
      ORDER BY created_at DESC
      LIMIT 100
    `).all(req.professional.id);
    res.json({ bookings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener reservas' });
  }
});

// ── PATCH /api/bookings/:id/confirm ──────────────────────────
router.patch('/:id/confirm', authMiddleware, (req, res) => {
  try {
    const booking = db.prepare(
      'SELECT * FROM bookings WHERE id = ? AND professional_id = ?'
    ).get(parseInt(req.params.id), req.professional.id);
    if (!booking) return res.status(404).json({ error: 'Reserva no encontrada' });

    db.prepare(
      "UPDATE bookings SET status = 'confirmed' WHERE id = ?"
    ).run(booking.id);

    const updated = db.prepare('SELECT * FROM bookings WHERE id = ?').get(booking.id);
    res.json({ success: true, booking: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al confirmar la reserva' });
  }
});

// ── PATCH /api/bookings/:id/cancel ───────────────────────────
router.patch('/:id/cancel', authMiddleware, (req, res) => {
  try {
    const booking = db.prepare(
      'SELECT * FROM bookings WHERE id = ? AND professional_id = ?'
    ).get(parseInt(req.params.id), req.professional.id);
    if (!booking) return res.status(404).json({ error: 'Reserva no encontrada' });

    db.prepare(
      "UPDATE bookings SET status = 'cancelled' WHERE id = ?"
    ).run(booking.id);

    const updated = db.prepare('SELECT * FROM bookings WHERE id = ?').get(booking.id);
    res.json({ success: true, booking: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al cancelar la reserva' });
  }
});

router.get('/:id', authMiddleware, (req, res) => {
  const appointment = db.prepare(`
    SELECT a.*,
      s.name as service_name, s.duration as service_duration, s.price as service_price,
      c.name as client_full_name, c.no_show_count, c.private_notes as client_private_notes,
      c.total_visits, c.cancellation_count, c.total_spent
    FROM appointments a
    JOIN services s ON a.service_id = s.id
    LEFT JOIN clients c ON a.client_id = c.id
    WHERE a.id = ? AND a.professional_id = ?
  `).get(parseInt(req.params.id), req.professional.id);

  if (!appointment) return res.status(404).json({ error: 'Turno no encontrado' });

  const history = db.prepare(
    'SELECT * FROM appointment_history WHERE appointment_id = ? ORDER BY created_at DESC'
  ).all(appointment.id);

  res.json({ appointment, history });
});

router.post('/', authMiddleware, (req, res) => {
  const { service_id, date, time, client_name, client_email, client_phone, client_notes, status } = req.body;
  if (!service_id || !date || !time || !client_name) {
    return res.status(400).json({ error: 'Faltan campos' });
  }

  const profId = req.professional.id;
  const service = db.prepare(
    'SELECT * FROM services WHERE id = ? AND professional_id = ?'
  ).get(parseInt(service_id), profId);
  if (!service) return res.status(404).json({ error: 'Servicio no encontrado' });

  const startTimeFmt = `${date} ${time}:00`;
  const endDate = new Date(`${date}T${time}:00`);
  endDate.setMinutes(endDate.getMinutes() + service.duration);
  const endTimeFmt = endDate.toISOString().replace('T', ' ').slice(0, 19);
  const publicToken = crypto.randomUUID();

  let client = null;
  if (client_email) {
    client = db.prepare('SELECT * FROM clients WHERE professional_id = ? AND email = ?').get(profId, client_email);
    if (!client) {
      const cr = db.prepare(
        'INSERT INTO clients (professional_id, name, email, phone) VALUES (?, ?, ?, ?)'
      ).run(profId, client_name, client_email, client_phone || null);
      client = db.prepare('SELECT * FROM clients WHERE id = ?').get(cr.lastInsertRowid);
    }
  }

  const initialStatus = status || 'confirmed';
  const result = db.prepare(`
    INSERT INTO appointments
      (professional_id, client_id, service_id, client_name, client_email, client_phone, client_notes,
       start_time, end_time, status, public_token, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual')
  `).run(
    profId, client ? client.id : null, service.id,
    client_name, client_email || null, client_phone || null, client_notes || null,
    startTimeFmt, endTimeFmt, initialStatus, publicToken
  );

  const appointment = db.prepare('SELECT * FROM appointments WHERE id = ?').get(result.lastInsertRowid);

  db.prepare(`
    INSERT INTO appointment_history (appointment_id, professional_id, action, new_status, performed_by)
    VALUES (?, ?, 'created', ?, 'professional')
  `).run(appointment.id, profId, initialStatus);

  res.status(201).json({ appointment });
});

router.put('/:id/status', authMiddleware, (req, res) => {
  const { status, reason } = req.body;
  const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'];
  if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Estado inválido' });

  const appointment = db.prepare(
    'SELECT * FROM appointments WHERE id = ? AND professional_id = ?'
  ).get(parseInt(req.params.id), req.professional.id);
  if (!appointment) return res.status(404).json({ error: 'Turno no encontrado' });

  const oldStatus = appointment.status;
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  const updates = { status: status, updated_at: now };
  if (status === 'confirmed') updates.confirmed_at = now;
  if (status === 'completed') {
    updates.completed_at = now;
    if (appointment.client_id) {
      const svc = db.prepare('SELECT price FROM services WHERE id = ?').get(appointment.service_id);
      db.prepare(
        'UPDATE clients SET total_visits = total_visits + 1, total_spent = total_spent + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      ).run((svc ? svc.price : 0) || 0, appointment.client_id);
    }
  }
  if (status === 'no_show') {
    updates.no_show_at = now;
    if (appointment.client_id) {
      db.prepare(
        'UPDATE clients SET no_show_count = no_show_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      ).run(appointment.client_id);
    }
  }
  if (status === 'cancelled') {
    updates.cancelled_at = now;
    updates.cancelled_by = 'professional';
    updates.cancellation_reason = reason || null;
    if (appointment.client_id) {
      db.prepare('UPDATE clients SET cancellation_count = cancellation_count + 1 WHERE id = ?').run(appointment.client_id);
    }
  }

  const setClauses = Object.keys(updates).map(function(k) { return k + ' = ?'; }).join(', ');
  db.prepare('UPDATE appointments SET ' + setClauses + ' WHERE id = ?').run(...Object.values(updates), appointment.id);

  db.prepare(`
    INSERT INTO appointment_history (appointment_id, professional_id, action, old_status, new_status, note, performed_by)
    VALUES (?, ?, ?, ?, ?, ?, 'professional')
  `).run(appointment.id, req.professional.id, status, oldStatus, status, reason || null);

  const updated = db.prepare('SELECT * FROM appointments WHERE id = ?').get(appointment.id);
  res.json({ appointment: updated });
});

router.put('/:id/reschedule', authMiddleware, (req, res) => {
  const { date, time } = req.body;
  if (!date || !time) return res.status(400).json({ error: 'date y time requeridos' });

  const appointment = db.prepare(
    'SELECT * FROM appointments WHERE id = ? AND professional_id = ?'
  ).get(parseInt(req.params.id), req.professional.id);
  if (!appointment) return res.status(404).json({ error: 'Turno no encontrado' });
  if (['cancelled', 'completed', 'no_show'].includes(appointment.status)) {
    return res.status(409).json({ error: 'No se puede reprogramar este turno' });
  }

  const service = db.prepare('SELECT * FROM services WHERE id = ?').get(appointment.service_id);
  const newStartStr = date + ' ' + time + ':00';
  const endDate = new Date(date + 'T' + time + ':00');
  endDate.setMinutes(endDate.getMinutes() + service.duration);
  const newEndTime = endDate.toISOString().replace('T', ' ').slice(0, 19);
  const oldStartTime = appointment.start_time;

  db.prepare(`
    UPDATE appointments SET
      start_time = ?, end_time = ?,
      rescheduled_from_id = COALESCE(rescheduled_from_id, ?),
      rescheduled_at = CURRENT_TIMESTAMP, status = 'confirmed', updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(newStartStr, newEndTime, appointment.id, appointment.id);

  db.prepare(`
    INSERT INTO appointment_history
      (appointment_id, professional_id, action, old_start_time, new_start_time, old_status, new_status, performed_by)
    VALUES (?, ?, 'rescheduled', ?, ?, ?, 'confirmed', 'professional')
  `).run(appointment.id, req.professional.id, oldStartTime, newStartStr, appointment.status);

  const updated = db.prepare('SELECT * FROM appointments WHERE id = ?').get(appointment.id);
  res.json({ appointment: updated });
});

module.exports = router;
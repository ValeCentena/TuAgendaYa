const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const email = require('../utils/email');
const gcal = require('../utils/googleCalendar');
const { getAvailableSlots, getAvailableDays } = require('../utils/slots');

// ══════════════════════════════════════════════════════════════
// RUTAS PÚBLICAS (booking por clientes)
// ══════════════════════════════════════════════════════════════

// GET /api/bookings/public/:slug — Perfil público
router.get('/public/:slug', (req, res) => {
  const prof = db.prepare(`
    SELECT id, name, profession, slug, bio, avatar_initials, plan, status
    FROM professionals WHERE slug = ?
  `).get(req.params.slug);

  if (!prof) return res.status(404).json({ error: 'Profesional no encontrado' });
  if (prof.status === 'suspended') {
    return res.status(403).json({ error: 'Este profesional no está disponible en este momento.', suspended: true });
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

// GET /api/bookings/public/:slug/slots — Slots disponibles
router.get('/public/:slug/slots', (req, res) => {
  const { date, service_id } = req.query;
  if (!date || !service_id) return res.status(400).json({ error: 'date y service_id requeridos' });

  const prof = db.prepare('SELECT * FROM professionals WHERE slug = ?').get(req.params.slug);
  if (!prof) return res.status(404).json({ error: 'No encontrado' });
  if (prof.status === 'suspended') {
    return res.status(403).json({ error: 'Este profesional no está disponible en este momento.', suspended: true });
  }

  const service = db.prepare('SELECT duration FROM services WHERE id = ? AND professional_id = ? AND active = 1').get(parseInt(service_id), prof.id);
  if (!service) return res.status(404).json({ error: 'Servicio no encontrado' });

  const slots = getAvailableSlots(db, prof.id, date, service.duration);
  res.json({ date, slots });
});

// GET /api/bookings/public/:slug/available-days — Días disponibles
router.get('/public/:slug/available-days', (req, res) => {
  const { from, to } = req.query;
  const prof = db.prepare('SELECT * FROM professionals WHERE slug = ?').get(req.params.slug);
  if (!prof) return res.status(404).json({ error: 'No encontrado' });
  if (prof.status === 'suspended') {
    return res.status(403).json({ error: 'Este profesional no está disponible en este momento.', suspended: true });
  }

  const fromDate = from || new Date().toISOString().slice(0, 10);
  const toDate = to || new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const days = getAvailableDays(db, prof.id, fromDate, toDate);
  res.json({ available_days: days });
});

// POST /api/bookings/public/:slug/book — Crear reserva (cliente)
router.post('/public/:slug/book', (req, res) => {
  const { service_id, date, time, client_name, client_email, client_phone, client_notes } = req.body;

  if (!service_id || !date || !time || !client_name) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  const prof = db.prepare('SELECT * FROM professionals WHERE slug = ?').get(req.params.slug);
  if (!prof) return res.status(404).json({ error: 'No encontrado' });
  if (prof.status === 'suspended') {
    return res.status(403).json({ error: 'Este profesional no está disponible en este momento.', suspended: true });
  }

  const service = db.prepare('SELECT * FROM services WHERE id = ? AND professional_id = ? AND active = 1').get(parseInt(service_id), prof.id);
  if (!service) return res.status(404).json({ error: 'Servicio no encontrado' });

  const slots = getAvailableSlots(db, prof.id, date, service.duration);
  if (!slots.includes(time)) {
    return res.status(409).json({ error: 'El horario seleccionado ya no está disponible' });
  }

  const startTime = `${date}T${time}:00`;
  const endDate = new Date(startTime);
  endDate.setMinutes(endDate.getMinutes() + service.duration);
  const endTime = endDate.toISOString().replace('T', ' ').slice(0, 19);
  const startTimeFmt = startTime.replace('T', ' ');
  const publicToken = uuidv4();

  try {
    let client = null;
    if (client_email) {
      client = db.prepare('SELECT * FROM clients WHERE professional_id = ? AND email = ?').get(prof.id, client_email);
      if (!client) {
        const cr = db.prepare(`
          INSERT INTO clients (professional_id, name, email, phone)
          VALUES (?, ?, ?, ?)
        `).run(prof.id, client_name, client_email, client_phone || null);
        client = db.prepare('SELECT * FROM clients WHERE id = ?').get(cr.lastInsertRowid);
      }
    }

    const result = db.prepare(`
      INSERT INTO appointments
        (professional_id, client_id, service_id, client_name, client_email, client_phone, client_notes,
         start_time, end_time, status, public_token, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, 'web')
    `).run(
      prof.id, client?.id || null, service.id,
      client_name, client_email || null, client_phone || null, client_notes || null,
      startTimeFmt, endTime, publicToken
    );

    const appointment = db.prepare('SELECT * FROM appointments WHERE id = ?').get(result.lastInsertRowid);

    db.prepare(`
      INSERT INTO appointment_history (appointment_id, professional_id, action, new_status, performed_by)
      VALUES (?, ?, 'created', 'pending', 'client')
    `).run(appointment.id, prof.id);

    if (prof.google_sync_enabled) {
      gcal.createEvent(prof, appointment, service).then(googleEventId => {
        if (googleEventId) {
          db.prepare('UPDATE appointments SET google_event_id = ?, google_sync_at = CURRENT_TIMESTAMP WHERE id = ?')
            .run(googleEventId, appointment.id);
        }
      }).catch(console.error);
    }

    if (client_email && prof.notify_new_booking) {
      email.send(email.templates.bookingConfirmationToClient(appointment, prof, service)).catch(console.error);
    }
    if (prof.notify_new_booking) {
      email.send(email.templates.bookingNotificationToProfessional(appointment, prof, service)).catch(console.error);
    }

    res.status(201).json({
      appointment: {
        id: appointment.id,
        public_token: appointment.public_token,
        status: appointment.status,
        start_time: appointment.start_time,
        end_time: appointment.end_time,
        client_name: appointment.client_name,
        service: { name: service.name, duration: service.duration, price: service.price },
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear el turno' });
  }
});

// GET /api/bookings/token/:token — Ver turno por token público
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

  const policy = db.prepare('SELECT * FROM cancellation_policies WHERE professional_id = ?').get(appointment.professional_id);

  res.json({ appointment, cancellation_policy: policy });
});

// POST /api/bookings/token/:token/confirm — Confirmar asistencia (cliente)
router.post('/token/:token/confirm', (req, res) => {
  const appointment = db.prepare('SELECT * FROM appointments WHERE public_token = ?').get(req.params.token);
  if (!appointment) return res.status(404).json({ error: 'Turno no encontrado' });
  if (appointment.status === 'cancelled') return res.status(409).json({ error: 'El turno fue cancelado' });
  if (appointment.status === 'confirmed') return res.json({ message: 'Ya confirmado', appointment });

  db.prepare(`
    UPDATE appointments SET status = 'confirmed', confirmed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(appointment.id);

  db.prepare(`
    INSERT INTO appointment_history (appointment_id, professional_id, action, old_status, new_status, performed_by)
    VALUES (?, ?, 'confirmed', ?, 'confirmed', 'client')
  `).run(appointment.id, appointment.professional_id, appointment.status);

  res.json({ message: 'Asistencia confirmada' });
});

// POST /api/bookings/token/:token/cancel — Cancelar por token (cliente)
router.post('/token/:token/cancel', (req, res) => {
  const { reason } = req.body;
  const appointment = db.prepare('SELECT * FROM appointments WHERE public_token = ?').get(req.params.token);
  if (!appointment) return res.status(404).json({ error: 'Turno no encontrado' });
  if (['cancelled', 'completed', 'no_show'].includes(appointment.status)) {
    return res.status(409).json({ error: 'El turno no puede ser cancelado' });
  }

  const prof = db.prepare('SELECT * FROM professionals WHERE id = ?').get(appointment.professional_id);
  const policy = db.prepare('SELECT * FROM cancellation_policies WHERE professional_id = ?').get(appointment.professional_id);

  let feeApplied = 0, feeAmount = 0;
  if (policy?.enabled) {
    const hoursUntil = (new Date(appointment.start_time) - new Date()) / (1000 * 60 * 60);
    if (hoursUntil < policy.hours_before) {
      feeApplied = 1;
      const service = db.prepare('SELECT price FROM services WHERE id = ?').get(appointment.service_id);
      if (policy.fee_type === 'fixed') feeAmount = policy.fee_fixed_amount;
      else if (policy.fee_type === 'percentage') feeAmount = (service?.price || 0) * policy.fee_percentage / 100;
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

  if (prof.google_sync_enabled && appointment.google_event_id) {
    gcal.deleteEvent(prof, appointment.google_event_id).catch(console.error);
  }

  const service = db.prepare('SELECT * FROM services WHERE id = ?').get(appointment.service_id);
  if (prof.notify_cancellation) {
    email.send(email.templates.cancellationEmail(appointment, prof, service, 'client')).catch(console.error);
  }

  res.json({ message: 'Turno cancelado', fee_applied: feeApplied, fee_amount: feeAmount });
});

// ══════════════════════════════════════════════════════════════
// RUTAS PRIVADAS (dashboard del profesional)
// ══════════════════════════════════════════════════════════════

// GET /api/bookings/slots — Slots disponibles para el profesional autenticado
// ⚠️ DEBE ir ANTES de /:id
router.get('/slots', authMiddleware, (req, res) => {
  const { date, service_id } = req.query;
  if (!date || !service_id) return res.status(400).json({ error: 'date y service_id requeridos' });

  const service = db.prepare('SELECT duration FROM services WHERE id = ? AND professional_id = ? AND active = 1').get(parseInt(service_id), req.professional.id);
  if (!service) return res.status(404).json({ error: 'Servicio no encontrado' });

  const slots = getAvailableSlots(db, req.professional.id, date, service.duration);
  res.json({ date, slots });
});

// GET /api/bookings/metrics/summary — Métricas del dashboard
// ⚠️ DEBE ir ANTES de /:id
router.get('/metrics/summary', authMiddleware, (req, res) => {
  const profId = req.professional.id;
  const today = new Date().toISOString().slice(0, 10);
  const thisMonthStart = today.slice(0, 7) + '-01';
  const lastMonthStart = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().slice(0, 10);
  const lastMonthEnd = new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString().slice(0, 10);

  const todayAppts = db.prepare(`
    SELECT COUNT(*) as count, SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
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
    SELECT COUNT(*) as total, SUM(CASE WHEN status = 'completed' THEN s.price ELSE 0 END) as revenue
    FROM appointments a JOIN services s ON a.service_id = s.id
    WHERE a.professional_id = ? AND date(a.start_time) BETWEEN ? AND ?
  `).get(profId, lastMonthStart, lastMonthEnd);

  const clients = db.prepare(`
    SELECT COUNT(*) as total FROM clients WHERE professional_id = ?
  `).get(profId);

  const topServices = db.prepare(`
    SELECT s.name, COUNT(*) as count, SUM(CASE WHEN a.status='completed' THEN s.price ELSE 0 END) as revenue
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

// GET /api/bookings — Listar turnos del profesional
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
    where += ` AND a.status IN (${statuses.map(() => '?').join(',')})`;
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

  const total = db.prepare(`
    SELECT COUNT(*) as count FROM appointments a ${where}
  `).get(...params).count;

  res.json({ appointments, total, limit: parseInt(limit), offset: parseInt(offset) });
});

// GET /api/bookings/:id — Detalle de un turno
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

  const history = db.prepare(`
    SELECT * FROM appointment_history WHERE appointment_id = ? ORDER BY created_at DESC
  `).all(appointment.id);

  res.json({ appointment, history });
});

// POST /api/bookings — Crear turno manual (profesional)
router.post('/', authMiddleware, (req, res) => {
  const { service_id, date, time, client_name, client_email, client_phone, client_notes, status, skip_slot_check } = req.body;
  if (!service_id || !date || !time || !client_name) return res.status(400).json({ error: 'Faltan campos' });

  const profId = req.professional.id;
  const service = db.prepare('SELECT * FROM services WHERE id = ? AND professional_id = ?').get(parseInt(service_id), profId);
  if (!service) return res.status(404).json({ error: 'Servicio no encontrado' });

  if (!skip_slot_check) {
    const availableSlots = getAvailableSlots(db, profId, date, service.duration);
    if (!availableSlots.includes(time)) {
      const conflict = db.prepare(`
        SELECT id, client_name FROM appointments
        WHERE professional_id = ? AND date(start_time) = ?
          AND status NOT IN ('cancelled', 'no_show')
          AND start_time < ? AND end_time > ?
      `).get(profId, date, `${date} ${time}:59`, `${date} ${time}:00`);
      if (conflict) {
        return res.status(409).json({
          error: `Ese horario ya tiene un turno de ${conflict.client_name}`,
          conflict: true,
          available_slots: availableSlots,
        });
      }
      return res.status(409).json({
        error: 'El horario seleccionado no está disponible',
        conflict: false,
        available_slots: availableSlots,
      });
    }
  }

  const startTimeFmt = `${date} ${time}:00`;
  const endDate = new Date(`${date}T${time}:00`);
  endDate.setMinutes(endDate.getMinutes() + service.duration);
  const endTimeFmt = endDate.toISOString().replace('T', ' ').slice(0, 19);
  const publicToken = uuidv4();

  let client = null;
  if (client_email) {
    client = db.prepare('SELECT * FROM clients WHERE professional_id = ? AND email = ?').get(profId, client_email);
    if (!client) {
      const cr = db.prepare('INSERT INTO clients (professional_id, name, email, phone) VALUES (?, ?, ?, ?)').run(profId, client_name, client_email, client_phone || null);
      client = db.prepare('SELECT * FROM clients WHERE id = ?').get(cr.lastInsertRowid);
    }
  }

  const initialStatus = status || 'confirmed';
  const result = db.prepare(`
    INSERT INTO appointments
      (professional_id, client_id, service_id, client_name, client_email, client_phone, client_notes,
       start_time, end_time, status, public_token, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual')
  `).run(profId, client?.id || null, service.id, client_name, client_email || null, client_phone || null, client_notes || null, startTimeFmt, endTimeFmt, initialStatus, publicToken);

  const appointment = db.prepare('SELECT * FROM appointments WHERE id = ?').get(result.lastInsertRowid);

  db.prepare(`
    INSERT INTO appointment_history (appointment_id, professional_id, action, new_status, performed_by)
    VALUES (?, ?, 'created', ?, 'professional')
  `).run(appointment.id, profId, initialStatus);

  const prof = db.prepare('SELECT * FROM professionals WHERE id = ?').get(profId);
  if (prof.google_sync_enabled) {
    gcal.createEvent(prof, appointment, service).then(googleEventId => {
      if (googleEventId) {
        db.prepare('UPDATE appointments SET google_event_id = ?, google_sync_at = CURRENT_TIMESTAMP WHERE id = ?').run(googleEventId, appointment.id);
      }
    }).catch(console.error);
  }

  res.status(201).json({ appointment });
});

// PUT /api/bookings/:id/status — Cambiar estado
router.put('/:id/status', authMiddleware, (req, res) => {
  const { status, reason } = req.body;
  const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'];
  if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Estado inválido' });

  const appointment = db.prepare('SELECT * FROM appointments WHERE id = ? AND professional_id = ?').get(parseInt(req.params.id), req.professional.id);
  if (!appointment) return res.status(404).json({ error: 'Turno no encontrado' });

  const oldStatus = appointment.status;
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  const updates = { status, updated_at: now };
  if (status === 'confirmed') updates.confirmed_at = now;
  if (status === 'completed') {
    updates.completed_at = now;
    if (appointment.client_id) {
      const service = db.prepare('SELECT price FROM services WHERE id = ?').get(appointment.service_id);
      db.prepare('UPDATE clients SET total_visits = total_visits + 1, total_spent = total_spent + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(service?.price || 0, appointment.client_id);
    }
  }
  if (status === 'no_show') {
    updates.no_show_at = now;
    if (appointment.client_id) {
      db.prepare('UPDATE clients SET no_show_count = no_show_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(appointment.client_id);
    }
  }
  if (status === 'cancelled') {
    updates.cancelled_at = now;
    updates.cancelled_by = 'professional';
    updates.cancellation_reason = reason || null;
    if (appointment.client_id) {
      db.prepare('UPDATE clients SET cancellation_count = cancellation_count + 1 WHERE id = ?').run(appointment.client_id);
    }
    const prof = db.prepare('SELECT * FROM professionals WHERE id = ?').get(req.professional.id);
    if (prof.google_sync_enabled && appointment.google_event_id) {
      gcal.deleteEvent(prof, appointment.google_event_id).catch(console.error);
    }
    const service = db.prepare('SELECT * FROM services WHERE id = ?').get(appointment.service_id);
    if (appointment.client_email && prof.notify_cancellation) {
      email.send(email.templates.cancellationEmail({ ...appointment, cancellation_reason: reason }, prof, service, 'professional')).catch(console.error);
    }
  }

  const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE appointments SET ${setClauses} WHERE id = ?`).run(...Object.values(updates), appointment.id);

  db.prepare(`
    INSERT INTO appointment_history (appointment_id, professional_id, action, old_status, new_status, note, performed_by)
    VALUES (?, ?, ?, ?, ?, ?, 'professional')
  `).run(appointment.id, req.professional.id, status, oldStatus, status, reason || null);

  const updated = db.prepare('SELECT * FROM appointments WHERE id = ?').get(appointment.id);
  res.json({ appointment: updated });
});

// PUT /api/bookings/:id/reschedule — Reprogramar turno
router.put('/:id/reschedule', authMiddleware, (req, res) => {
  const { date, time, notify_client = true } = req.body;
  if (!date || !time) return res.status(400).json({ error: 'date y time requeridos' });

  const appointment = db.prepare('SELECT * FROM appointments WHERE id = ? AND professional_id = ?').get(parseInt(req.params.id), req.professional.id);
  if (!appointment) return res.status(404).json({ error: 'Turno no encontrado' });
  if (['cancelled', 'completed', 'no_show'].includes(appointment.status)) {
    return res.status(409).json({ error: 'No se puede reprogramar este turno' });
  }

  const service = db.prepare('SELECT * FROM services WHERE id = ?').get(appointment.service_id);
  const slots = getAvailableSlots(db, req.professional.id, date, service.duration);
  const newStartStr = `${date} ${time}:00`;

  if (!slots.includes(time)) {
    const conflict = db.prepare(`
      SELECT id FROM appointments
      WHERE professional_id = ? AND date(start_time) = ? AND status NOT IN ('cancelled','no_show')
        AND id != ?
        AND start_time < ? AND end_time > ?
    `).get(req.professional.id, date, appointment.id, `${date} ${time}:00`, `${date} ${time}:00`);
    if (conflict) return res.status(409).json({ error: 'El nuevo horario no está disponible' });
  }

  const endDate = new Date(`${date}T${time}:00`);
  endDate.setMinutes(endDate.getMinutes() + service.duration);
  const newEndTime = endDate.toISOString().replace('T', ' ').slice(0, 19);
  const oldStartTime = appointment.start_time;

  db.prepare(`
    UPDATE appointments SET
      start_time = ?, end_time = ?, rescheduled_from_id = COALESCE(rescheduled_from_id, ?),
      rescheduled_at = CURRENT_TIMESTAMP, status = 'confirmed', updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(newStartStr, newEndTime, appointment.id, appointment.id);

  db.prepare(`
    INSERT INTO appointment_history (appointment_id, professional_id, action, old_start_time, new_start_time, old_status, new_status, performed_by)
    VALUES (?, ?, 'rescheduled', ?, ?, ?, 'confirmed', 'professional')
  `).run(appointment.id, req.professional.id, oldStartTime, newStartStr, appointment.status);

  const updated = db.prepare('SELECT * FROM appointments WHERE id = ?').get(appointment.id);
  const prof = db.prepare('SELECT * FROM professionals WHERE id = ?').get(req.professional.id);

  if (prof.google_sync_enabled && appointment.google_event_id) {
    gcal.updateEvent(prof, updated, service).catch(console.error);
  }

  if (appointment.client_email && notify_client) {
    email.send(email.templates.rescheduleEmail(updated, prof, service, oldStartTime)).catch(console.error);
  }

  res.json({ appointment: updated });
});

module.exports = router;
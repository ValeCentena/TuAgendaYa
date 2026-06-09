const { AppError } = require('./errors');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function assert(condition, message, details = null) {
  if (!condition) throw new AppError(400, message, details);
}

function validateEmail(email, { required = true } = {}) {
  if (!email || !String(email).trim()) {
    if (required) throw new AppError(400, 'El email es obligatorio');
    return '';
  }
  const value = String(email).trim().toLowerCase();
  assert(EMAIL_RE.test(value), 'El email no es válido');
  return value;
}

function validatePassword(password) {
  assert(password && String(password).length >= 6, 'La contraseña debe tener al menos 6 caracteres');
  return String(password);
}

function validateName(name, field = 'El nombre') {
  const value = String(name || '').trim();
  assert(value.length >= 2, `${field} debe tener al menos 2 caracteres`);
  assert(value.length <= 100, `${field} no puede superar 100 caracteres`);
  return value;
}

function validatePhone(phone) {
  const value = String(phone || '').trim();
  const digits = value.replace(/\D/g, '');
  assert(digits.length >= 8, 'El teléfono debe tener al menos 8 dígitos');
  assert(digits.length <= 15, 'El teléfono no es válido');
  return value;
}

function validateDate(date) {
  assert(date && DATE_RE.test(date), 'La fecha no es válida (use YYYY-MM-DD)');
  const parsed = new Date(`${date}T23:59:59`);
  assert(!Number.isNaN(parsed.getTime()), 'La fecha no es válida');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  assert(parsed >= today, 'No se pueden reservar fechas pasadas');
  return date;
}

function validateTime(time) {
  assert(time && TIME_RE.test(time), 'El horario no es válido (use HH:MM)');
  return time;
}

function validateSlug(slug) {
  assert(slug && SLUG_RE.test(slug), 'El identificador del profesional no es válido');
  return slug;
}

function validateBookingInput(body) {
  return {
    slug: validateSlug(body.slug),
    date: validateDate(body.date),
    time: validateTime(body.time),
    clientName: validateName(body.clientName, 'El nombre'),
    clientPhone: validatePhone(body.clientPhone),
    clientEmail: body.clientEmail ? validateEmail(body.clientEmail, { required: false }) : '',
  };
}

function validateRegisterInput(body) {
  return {
    name: validateName(body.name),
    email: validateEmail(body.email),
    password: validatePassword(body.password),
    specialty: String(body.specialty || '').trim().slice(0, 100),
    phone: body.phone ? validatePhone(body.phone) : '',
    bio: String(body.bio || '').trim().slice(0, 500),
    durationMinutes: [15, 30, 45, 60].includes(Number(body.durationMinutes))
      ? Number(body.durationMinutes)
      : 30,
  };
}

function validateLoginInput(body) {
  return {
    email: validateEmail(body.email),
    password: validatePassword(body.password),
  };
}

function validateAvailabilitySlots(slots) {
  assert(Array.isArray(slots), 'La disponibilidad debe ser un array');

  for (const slot of slots) {
    assert(slot.day_of_week >= 0 && slot.day_of_week <= 6, 'Día de la semana inválido');
    validateTime(slot.start_time);
    validateTime(slot.end_time);
    assert(slot.start_time < slot.end_time, 'La hora de inicio debe ser anterior a la de fin');
  }

  return slots;
}

module.exports = {
  validateEmail,
  validatePassword,
  validateName,
  validatePhone,
  validateDate,
  validateTime,
  validateSlug,
  validateBookingInput,
  validateRegisterInput,
  validateLoginInput,
  validateAvailabilitySlots,
};

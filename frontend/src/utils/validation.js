const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateName(name) {
  const value = String(name || '').trim();
  if (value.length < 2) return 'Debe tener al menos 2 caracteres';
  if (value.length > 100) return 'No puede superar 100 caracteres';
  return null;
}

export function validateEmail(email, required = false) {
  const value = String(email || '').trim();
  if (!value) return required ? 'El email es obligatorio' : null;
  if (!EMAIL_RE.test(value)) return 'El email no es válido';
  return null;
}

export function validatePhone(phone) {
  const value = String(phone || '').trim();
  const digits = value.replace(/\D/g, '');
  if (digits.length < 8) return 'Ingresá un teléfono válido (mín. 8 dígitos)';
  if (digits.length > 15) return 'El teléfono no es válido';
  return null;
}

export function validatePassword(password) {
  if (!password || password.length < 6) return 'Mínimo 6 caracteres';
  return null;
}

export function validateBookingForm({ clientName, clientPhone, clientEmail }) {
  const errors = {};
  const nameErr = validateName(clientName);
  const phoneErr = validatePhone(clientPhone);
  const emailErr = validateEmail(clientEmail, false);

  if (nameErr) errors.clientName = nameErr;
  if (phoneErr) errors.clientPhone = phoneErr;
  if (emailErr) errors.clientEmail = emailErr;

  return errors;
}

export function validateRegisterForm(form) {
  const errors = {};
  const nameErr = validateName(form.name);
  const emailErr = validateEmail(form.email, true);
  const passErr = validatePassword(form.password);
  const phoneErr = form.phone ? validatePhone(form.phone) : null;

  if (nameErr) errors.name = nameErr;
  if (emailErr) errors.email = emailErr;
  if (passErr) errors.password = passErr;
  if (phoneErr) errors.phone = phoneErr;

  return errors;
}

export function validateLoginForm({ email, password }) {
  const errors = {};
  const emailErr = validateEmail(email, true);
  const passErr = validatePassword(password);

  if (emailErr) errors.email = emailErr;
  if (passErr) errors.password = passErr;

  return errors;
}

export function formatDateEs(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

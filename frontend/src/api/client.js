import { API_URL } from '../config';

export class ApiError extends Error {
  constructor(message, status = 0, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
  } catch {
    throw new ApiError('No se pudo conectar con el servidor. Verificá tu conexión.', 0);
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(data.error || 'Error en la solicitud', res.status, data.details);
  }

  return data;
}

export function getProfessionals() {
  return request('/api/professionals');
}

export function getProfessionalBySlug(slug) {
  return request(`/api/professionals/slug/${slug}`);
}

export function getAvailableDates(slug, month) {
  return request(`/api/professionals/slug/${slug}/dates?month=${month}`);
}

export function getAvailableSlots(slug, date) {
  return request(`/api/professionals/slug/${slug}/slots?date=${date}`);
}

export function createBooking(data) {
  return request('/api/bookings', { method: 'POST', body: JSON.stringify(data) });
}

export function getBookingConfirmation(id) {
  return request(`/api/bookings/${id}/confirmation`);
}

export function registerProfessional(data) {
  return request('/api/auth/register', { method: 'POST', body: JSON.stringify(data) });
}

export function loginProfessional(email, password) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function loginAdmin(email, password) {
  return request('/api/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

export function getMe(token) {
  return request('/api/professionals/me', { headers: authHeaders(token) });
}

export function updateMe(token, data) {
  return request('/api/professionals/me', {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
}

export function getMyBookings(token) {
  return request('/api/professionals/me/bookings', { headers: authHeaders(token) });
}

export function cancelBooking(token, id) {
  return request(`/api/bookings/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
}

export function getMyAvailability(token) {
  return request('/api/professionals/me/availability', { headers: authHeaders(token) });
}

export function updateMyAvailability(token, slots) {
  return request('/api/professionals/me/availability', {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify({ slots }),
  });
}

export function getAdminStats(token) {
  return request('/api/admin/stats', { headers: authHeaders(token) });
}

export function getAdminProfessionals(token) {
  return request('/api/admin/professionals', { headers: authHeaders(token) });
}

export function toggleProfessional(token, id, active) {
  return request(`/api/admin/professionals/${id}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ active }),
  });
}

export function getAdminBookings(token) {
  return request('/api/admin/bookings', { headers: authHeaders(token) });
}

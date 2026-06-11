import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

// Token automático en cada request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('tuagendaya_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Redirect a login si 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('tuagendaya_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Auth ─────────────────────────────────────────────────────
export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  updateMe: (data) => api.put('/auth/me', data),
  changePassword: (data) => api.post('/auth/change-password', data),
  checkSlug: (slug) => api.get(`/auth/check-slug/${slug}`),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
};

// ── Appointments ──────────────────────────────────────────────
export const appointmentsApi = {
  // Dashboard
  list: (params) => api.get('/appointments', { params }),
  get: (id) => api.get(`/appointments/${id}`),
  create: (data) => api.post('/appointments', data),
  updateStatus: (id, data) => api.put(`/appointments/${id}/status`, data),
  reschedule: (id, data) => api.put(`/appointments/${id}/reschedule`, data),
  metrics: () => api.get('/appointments/metrics/summary'),
  getSlotsDashboard: (params) => api.get('/appointments/slots', { params }),

  // Pública (booking por clientes)
  getPublicProfile: (slug) => api.get(`/appointments/public/${slug}`),
  getSlots: (slug, params) => api.get(`/appointments/public/${slug}/slots`, { params }),
  getAvailableDays: (slug, params) => api.get(`/appointments/public/${slug}/available-days`, { params }),
  book: (slug, data) => api.post(`/appointments/public/${slug}/book`, data),

  // Por token público
  getByToken: (token) => api.get(`/appointments/token/${token}`),
  confirmByToken: (token) => api.post(`/appointments/token/${token}/confirm`),
  cancelByToken: (token, data) => api.post(`/appointments/token/${token}/cancel`, data),
};

// ── Clients ───────────────────────────────────────────────────
export const clientsApi = {
  list: (params) => api.get('/clients', { params }),
  get: (id) => api.get(`/clients/${id}`),
  update: (id, data) => api.put(`/clients/${id}`, data),
  delete: (id) => api.delete(`/clients/${id}`),
};

// ── Services ──────────────────────────────────────────────────
export const servicesApi = {
  list: () => api.get('/services'),
  create: (data) => api.post('/services', data),
  update: (id, data) => api.put(`/services/${id}`, data),
  delete: (id) => api.delete(`/services/${id}`),
};

// ── Settings ──────────────────────────────────────────────────
export const settingsApi = {
  getAvailability: () => api.get('/settings/availability'),
  updateAvailability: (data) => api.put('/settings/availability', data),
  getExceptions: () => api.get('/settings/exceptions'),
  addException: (data) => api.post('/settings/exceptions', data),
  deleteException: (id) => api.delete(`/settings/exceptions/${id}`),
  getCancellationPolicy: () => api.get('/settings/cancellation-policy'),
  updateCancellationPolicy: (data) => api.put('/settings/cancellation-policy', data),
};

// ── Google Calendar ───────────────────────────────────────────
export const calendarApi = {
  getAuthUrl: () => api.get('/calendar/auth-url'),
  getStatus: () => api.get('/calendar/status'),
  listCalendars: () => api.get('/calendar/list'),
  updateSettings: (data) => api.put('/calendar/settings', data),
  disconnect: () => api.delete('/calendar/disconnect'),
  sync: () => api.post('/calendar/sync'),
};

// ── Admin API (panel superadmin) ──────────────────────────────
const adminAxios = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

adminAxios.interceptors.request.use((config) => {
  const token = localStorage.getItem('tuagendaya_admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

adminAxios.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('tuagendaya_admin_token');
      window.location.href = '/admin/login';
    }
    return Promise.reject(err);
  }
);

export const adminApi = {
  login: (data) => adminAxios.post('/admin/login', data),
  stats: () => adminAxios.get('/admin/stats'),
  professionals: (params) => adminAxios.get('/admin/professionals', { params }),
  professionalDetail: (id) => adminAxios.get(`/admin/professionals/${id}`),
  updateStatus: (id, status) => adminAxios.patch(`/admin/professionals/${id}/status`, { status }),
};

export default api;
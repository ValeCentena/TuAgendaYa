import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('tuagendaya_token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

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

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// AUTH
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

export const loginProfesional = (email, password) => {
  return api.post('/auth/login', { email, password });
};

export const registerProfesional = (data) => {
  return api.post('/auth/register', data);
};

export const registerProfessional = (data) => {
  return api.post('/auth/register', data);
};

export const getMe = () => {
  return api.get('/auth/me');
};

// BOOKINGS / APPOINTMENTS
export const appointmentsApi = {
  list: (params) => api.get('/bookings', { params }),
  get: (id) => api.get(`/bookings/${id}`),
  create: (data) => api.post('/bookings', data),
  updateStatus: (id, data) => api.put(`/bookings/${id}/status`, data),
  reschedule: (id, data) => api.put(`/bookings/${id}/reschedule`, data),
  metrics: () => api.get('/bookings/metrics/summary'),
  getSlotsDashboard: (params) => api.get('/bookings/slots', { params }),

  getPublicProfile: (slug) => api.get(`/bookings/public/${slug}`),
  getSlots: (slug, params) => api.get(`/bookings/public/${slug}/slots`, { params }),
  getAvailableDays: (slug, params) =>
    api.get(`/bookings/public/${slug}/available-days`, { params }),
  book: (slug, data) => api.post(`/bookings/public/${slug}/book`, data),

  getByToken: (token) => api.get(`/bookings/token/${token}`),
  confirmByToken: (token) => api.post(`/bookings/token/${token}/confirm`),
  cancelByToken: (token, data) => api.post(`/bookings/token/${token}/cancel`, data),
};

export const bookingsApi = appointmentsApi;

export const getMyBookings = (params) => {
  return api.get('/bookings', { params });
};

export const getBookings = (params) => {
  return api.get('/bookings', { params });
};

export const getBooking = (id) => {
  return api.get(`/bookings/${id}`);
};

export const createBooking = (data) => {
  return api.post('/bookings', data);
};

export const cancelBooking = (id, data = {}) => {
  return api.put(`/bookings/${id}/status`, {
    status: 'cancelled',
    ...data,
  });
};

export const updateBookingStatus = (id, data) => {
  return api.put(`/bookings/${id}/status`, data);
};

export const getPublicProfile = (slug) => {
  return api.get(`/bookings/public/${slug}`);
};

export const getPublicSlots = (slug, params) => {
  return api.get(`/bookings/public/${slug}/slots`, { params });
};

export const getAvailableDays = (slug, params) => {
  return api.get(`/bookings/public/${slug}/available-days`, { params });
};

export const bookPublicAppointment = (slug, data) => {
  return api.post(`/bookings/public/${slug}/book`, data);
};

// PROFESSIONALS
export const professionalsApi = {
  list: (params) => api.get('/professionals', { params }),
  get: (id) => api.get(`/professionals/${id}`),
  create: (data) => api.post('/professionals', data),
  update: (id, data) => api.put(`/professionals/${id}`, data),
  delete: (id) => api.delete(`/professionals/${id}`),
};

export const getProfessionals = (params) => {
  return api.get('/professionals', { params });
};

export const getProfessional = (id) => {
  return api.get(`/professionals/${id}`);
};

export const createProfessional = (data) => {
  return api.post('/professionals', data);
};

export const updateProfessional = (id, data) => {
  return api.put(`/professionals/${id}`, data);
};

export const deleteProfessional = (id) => {
  return api.delete(`/professionals/${id}`);
};

// CLIENTS
export const clientsApi = {
  list: (params) => api.get('/clients', { params }),
  get: (id) => api.get(`/clients/${id}`),
  update: (id, data) => api.put(`/clients/${id}`, data),
  delete: (id) => api.delete(`/clients/${id}`),
};

export const getClients = (params) => {
  return api.get('/clients', { params });
};

export const getClient = (id) => {
  return api.get(`/clients/${id}`);
};

export const updateClient = (id, data) => {
  return api.put(`/clients/${id}`, data);
};

export const deleteClient = (id) => {
  return api.delete(`/clients/${id}`);
};

// SERVICES
export const servicesApi = {
  list: () => api.get('/services'),
  create: (data) => api.post('/services', data),
  update: (id, data) => api.put(`/services/${id}`, data),
  delete: (id) => api.delete(`/services/${id}`),
};

export const getServices = () => {
  return api.get('/services');
};

export const createService = (data) => {
  return api.post('/services', data);
};

export const updateService = (id, data) => {
  return api.put(`/services/${id}`, data);
};

export const deleteService = (id) => {
  return api.delete(`/services/${id}`);
};

// SETTINGS
export const settingsApi = {
  getAvailability: () => api.get('/settings/availability'),
  updateAvailability: (data) => api.put('/settings/availability', data),
  getExceptions: () => api.get('/settings/exceptions'),
  addException: (data) => api.post('/settings/exceptions', data),
  deleteException: (id) => api.delete(`/settings/exceptions/${id}`),
  getCancellationPolicy: () => api.get('/settings/cancellation-policy'),
  updateCancellationPolicy: (data) => api.put('/settings/cancellation-policy', data),
};

export const getAvailability = () => {
  return api.get('/settings/availability');
};

export const updateAvailability = (data) => {
  return api.put('/settings/availability', data);
};

export const getExceptions = () => {
  return api.get('/settings/exceptions');
};

export const addException = (data) => {
  return api.post('/settings/exceptions', data);
};

export const deleteException = (id) => {
  return api.delete(`/settings/exceptions/${id}`);
};

// CALENDAR
export const calendarApi = {
  getAuthUrl: () => api.get('/calendar/auth-url'),
  getStatus: () => api.get('/calendar/status'),
  listCalendars: () => api.get('/calendar/list'),
  updateSettings: (data) => api.put('/calendar/settings', data),
  disconnect: () => api.delete('/calendar/disconnect'),
  sync: () => api.post('/calendar/sync'),
};

// ADMIN
const adminAxios = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

adminAxios.interceptors.request.use((config) => {
  const token = localStorage.getItem('tuagendaya_admin_token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

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
  updateStatus: (id, status) =>
    adminAxios.patch(`/admin/professionals/${id}/status`, { status }),
};

export const adminLogin = (data) => {
  return adminAxios.post('/admin/login', data);
};

export const getAdminStats = () => {
  return adminAxios.get('/admin/stats');
};

export const getAdminProfessionals = (params) => {
  return adminAxios.get('/admin/professionals', { params });
};

export const getAdminProfessionalDetail = (id) => {
  return adminAxios.get(`/admin/professionals/${id}`);
};

export const updateAdminProfessionalStatus = (id, status) => {
  return adminAxios.patch(`/admin/professionals/${id}/status`, { status });
};

export default api;
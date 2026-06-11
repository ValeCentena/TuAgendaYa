import { create } from 'zustand';

const ADMIN_TOKEN_KEY = 'tuagendaya_admin_token';

export const useAdminStore = create((set) => ({
  token: localStorage.getItem(ADMIN_TOKEN_KEY) || null,
  admin: null,
  isAuthenticated: !!localStorage.getItem(ADMIN_TOKEN_KEY),

  setAdmin: (token, admin) => {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
    set({ token, admin, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    set({ token: null, admin: null, isAuthenticated: false });
  },
}));
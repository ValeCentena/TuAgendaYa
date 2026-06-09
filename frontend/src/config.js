// En desarrollo, Vite hace proxy de /api al backend (ver vite.config.js).
// En producción, definí VITE_API_URL con la URL del servidor.
export const API_URL = import.meta.env.VITE_API_URL || '';

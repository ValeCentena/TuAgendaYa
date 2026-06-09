const { AppError } = require('../utils/errors');

function createRateLimiter({ windowMs = 60_000, max = 30, keyPrefix = '' }) {
  const hits = new Map();

  return (req, _res, next) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${keyPrefix}:${ip}`;
    const now = Date.now();

    const entry = hits.get(key) || { count: 0, resetAt: now + windowMs };

    if (now > entry.resetAt) {
      entry.count = 0;
      entry.resetAt = now + windowMs;
    }

    entry.count += 1;
    hits.set(key, entry);

    if (entry.count > max) {
      return next(new AppError(429, 'Demasiadas solicitudes. Intentá de nuevo en un momento.'));
    }

    next();
  };
}

const bookingLimiter = createRateLimiter({ windowMs: 60_000, max: 10, keyPrefix: 'booking' });
const authLimiter = createRateLimiter({ windowMs: 60_000, max: 15, keyPrefix: 'auth' });

module.exports = { bookingLimiter, authLimiter, createRateLimiter };

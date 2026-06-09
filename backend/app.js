require('dotenv').config();

const express = require('express');
const { errorHandler } = require('./middleware/errorHandler');
const { applySecurityMiddleware } = require('./middleware/security');
const { checkDbHealth } = require('./db');
const { getActiveProvider } = require('./services/whatsapp');
const { isProduction } = require('./config/env');

const authRoutes = require('./routes/auth');
const professionalRoutes = require('./routes/professionals');
const bookingRoutes = require('./routes/bookings');
const adminRoutes = require('./routes/admin');

function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  applySecurityMiddleware(app);
  app.use(express.json({ limit: '32kb' }));

  app.get('/api/health', (_req, res) => {
    try {
      const db = checkDbHealth();
      res.json({
        status: 'ok',
        service: 'TuAgendaYa',
        environment: isProduction() ? 'production' : process.env.NODE_ENV || 'development',
        database: db,
        whatsapp: getActiveProvider(),
      });
    } catch (err) {
      res.status(503).json({
        status: 'error',
        service: 'TuAgendaYa',
        error: 'Database unavailable',
        message: err.message,
      });
    }
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/professionals', professionalRoutes);
  app.use('/api/bookings', bookingRoutes);
  app.use('/api/admin', adminRoutes);

  app.use(errorHandler);

  return app;
}

module.exports = { createApp };

const helmet = require('helmet');
const cors = require('cors');
const { getCorsOrigins } = require('../config/env');

function applySecurityMiddleware(app) {
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));

  app.use(cors({
    origin: getCorsOrigins(),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
  }));

  app.disable('x-powered-by');
}

module.exports = { applySecurityMiddleware };

const logger = require('../utils/logger');

const INSECURE_JWT_SECRETS = new Set([
  'dev-secret-change-me',
  'cambia-este-secreto-en-produccion',
  'change-me',
]);

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function validateEnv() {
  if (!isProduction()) {
    if (!process.env.JWT_SECRET) {
      logger.warn('JWT_SECRET no definido — usando valor de desarrollo inseguro');
      process.env.JWT_SECRET = 'dev-secret-change-me';
    }
    return;
  }

  const required = ['JWT_SECRET', 'CORS_ORIGIN', 'ADMIN_EMAIL', 'ADMIN_PASSWORD', 'DATABASE_PATH'];
  const missing = required.filter((key) => !process.env[key]?.trim());

  if (missing.length > 0) {
    throw new Error(`Variables de entorno obligatorias en producción: ${missing.join(', ')}`);
  }

  if (process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET debe tener al menos 32 caracteres en producción');
  }

  if (INSECURE_JWT_SECRETS.has(process.env.JWT_SECRET)) {
    throw new Error('JWT_SECRET no puede ser un valor por defecto en producción');
  }

  if (process.env.ADMIN_PASSWORD.length < 8) {
    throw new Error('ADMIN_PASSWORD debe tener al menos 8 caracteres en producción');
  }

  const whatsappCloud = process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID;
  const whatsappTwilio = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN;

  if (!whatsappCloud && !whatsappTwilio) {
    logger.warn('WhatsApp no configurado — los mensajes se simularán en logs');
  } else if (whatsappCloud) {
    logger.info('WhatsApp Cloud API configurado');
  } else {
    logger.info('Twilio WhatsApp configurado');
  }

  logger.info('Variables de producción validadas correctamente');
}

function getCorsOrigins() {
  if (!process.env.CORS_ORIGIN) {
    return isProduction() ? [] : true;
  }
  return process.env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean);
}

module.exports = { validateEnv, getCorsOrigins, isProduction };

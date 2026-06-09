const logger = require('../utils/logger');
const cloud = require('./whatsappCloud');

function formatPhoneTwilio(phone) {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('54')) return `whatsapp:+${digits}`;
  if (digits.length === 10) return `whatsapp:+54${digits}`;
  return `whatsapp:+${digits}`;
}

async function sendViaTwilio(to, body) {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM } = process.env;

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM) {
    return null;
  }

  const twilio = require('twilio')(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  const message = await twilio.messages.create({
    from: TWILIO_WHATSAPP_FROM,
    to: formatPhoneTwilio(to),
    body,
  });

  return { provider: 'twilio', sid: message.sid };
}

async function sendWhatsApp(to, body) {
  if (cloud.isConfigured()) {
    const result = await cloud.sendMessage(to, body);
    if (result) return result;
  }

  const twilioResult = await sendViaTwilio(to, body);
  if (twilioResult) return twilioResult;

  logger.info('[WhatsApp simulado]', { to, body });
  return { simulated: true };
}

async function sendBookingConfirmation(booking, professional) {
  const body = `¡Hola ${booking.client_name}! ✅\n\nTu turno con ${professional.name} está confirmado:\n📅 ${booking.date}\n🕐 ${booking.time}\n\nTuAgendaYa`;
  return sendWhatsApp(booking.client_phone, body);
}

async function sendReminder(booking, professional) {
  const body = `¡Hola ${booking.client_name}! ⏰\n\nRecordatorio: mañana tenés turno con ${professional.name}.\n📅 ${booking.date} a las ${booking.time}\n\nTuAgendaYa`;
  return sendWhatsApp(booking.client_phone, body);
}

function getActiveProvider() {
  if (cloud.isConfigured()) return 'cloud';
  if (process.env.TWILIO_ACCOUNT_SID) return 'twilio';
  return 'simulated';
}

module.exports = {
  sendWhatsApp,
  sendBookingConfirmation,
  sendReminder,
  getActiveProvider,
};

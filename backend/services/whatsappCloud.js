const logger = require('../utils/logger');

const API_VERSION = process.env.WHATSAPP_API_VERSION || 'v21.0';

function isConfigured() {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

function formatE164(phone) {
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) throw new Error('Número de teléfono inválido');
  if (digits.startsWith('54')) return digits;
  if (digits.length === 10) return `54${digits}`;
  return digits;
}

async function sendMessage(to, body) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    return null;
  }

  const url = `https://graph.facebook.com/${API_VERSION}/${phoneNumberId}/messages`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: formatE164(to),
      type: 'text',
      text: { preview_url: false, body },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const message = data?.error?.message || `HTTP ${response.status}`;
    logger.error('WhatsApp Cloud API error', { message, code: data?.error?.code });
    throw new Error(`WhatsApp Cloud API: ${message}`);
  }

  return {
    provider: 'cloud',
    messageId: data.messages?.[0]?.id,
  };
}

module.exports = { isConfigured, sendMessage, formatE164 };

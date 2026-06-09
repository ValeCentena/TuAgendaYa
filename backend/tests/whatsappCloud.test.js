const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { formatE164, isConfigured } = require('../services/whatsappCloud');

describe('whatsappCloud', () => {
  it('formatea teléfono argentino a E.164', () => {
    assert.equal(formatE164('+54 11 1234-5678'), '541112345678');
    assert.equal(formatE164('1112345678'), '541112345678');
    assert.equal(formatE164('541112345678'), '541112345678');
  });

  it('isConfigured depende de variables de entorno', () => {
    const original = {
      token: process.env.WHATSAPP_TOKEN,
      id: process.env.WHATSAPP_PHONE_NUMBER_ID,
    };
    delete process.env.WHATSAPP_TOKEN;
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    assert.equal(isConfigured(), false);
    process.env.WHATSAPP_TOKEN = original.token;
    process.env.WHATSAPP_PHONE_NUMBER_ID = original.id;
  });
});

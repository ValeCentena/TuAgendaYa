const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  validateEmail,
  validatePhone,
  validateName,
  validateDate,
  validateTime,
  validateBookingInput,
} = require('../utils/validate');
const { AppError } = require('../utils/errors');

describe('validate', () => {
  it('valida email correcto', () => {
    assert.equal(validateEmail('user@test.com'), 'user@test.com');
  });

  it('rechaza email inválido', () => {
    assert.throws(() => validateEmail('no-email'), AppError);
  });

  it('valida teléfono con al menos 8 dígitos', () => {
    assert.equal(validatePhone('+54 11 1234-5678'), '+54 11 1234-5678');
  });

  it('rechaza teléfono corto', () => {
    assert.throws(() => validatePhone('123'), AppError);
  });

  it('valida nombre', () => {
    assert.equal(validateName('Juan Pérez'), 'Juan Pérez');
  });

  it('rechaza fecha pasada', () => {
    assert.throws(() => validateDate('2000-01-01'), AppError);
  });

  it('valida horario HH:MM', () => {
    assert.equal(validateTime('09:30'), '09:30');
    assert.throws(() => validateTime('25:00'), AppError);
  });

  it('valida payload de reserva completo', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    const date = tomorrow.toISOString().split('T')[0];

    const result = validateBookingInput({
      slug: 'test-pro',
      date,
      time: '10:00',
      clientName: 'Cliente Test',
      clientPhone: '+5491112345678',
      clientEmail: 'cliente@test.com',
    });

    assert.equal(result.slug, 'test-pro');
    assert.equal(result.clientName, 'Cliente Test');
  });
});

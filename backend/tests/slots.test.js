const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const { generateSlots, getAvailableSlotsForDate } = require('../utils/slots');
const { setupTestDb, seedTestProfessional } = require('./helpers');
const { db } = require('../db');

describe('slots', () => {
  before(() => {
    setupTestDb();
  });

  it('genera slots según duración', () => {
    const slots = generateSlots('09:00', '11:00', 30);
    assert.deepEqual(slots, ['09:00', '09:30', '10:00', '10:30']);
  });

  it('excluye horarios ya reservados', () => {
    const pro = seedTestProfessional({ slug: 'slots-pro', email: 'slots@test.com' });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    while (tomorrow.getDay() === 0 || tomorrow.getDay() === 6) {
      tomorrow.setDate(tomorrow.getDate() + 1);
    }
    const date = tomorrow.toISOString().split('T')[0];

    db.prepare(`
      INSERT INTO bookings (professional_id, date, time, client_name, client_phone, status)
      VALUES (?, ?, '10:00', 'A', '+5491111111111', 'confirmed')
    `).run(pro.id, date);

    const slots = getAvailableSlotsForDate(db, pro.id, date, 30);
    assert.equal(slots.includes('10:00'), false);
    assert.equal(slots.includes('09:00'), true);
  });
});

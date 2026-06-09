const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../app');
const { setupTestDb, seedTestProfessional, futureWeekday } = require('./helpers');

describe('bookings API', () => {
  let app;
  let slug;
  let date;

  before(() => {
    setupTestDb();
    app = createApp();
    const pro = seedTestProfessional();
    slug = pro.slug;
    date = futureWeekday();
  });

  it('health check responde ok', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.database.connected, true);
  });

  it('crea una reserva válida', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .send({
        slug,
        date,
        time: '10:00',
        clientName: 'María Cliente',
        clientPhone: '+5491122334455',
        clientEmail: 'maria@cliente.com',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.clientName, 'María Cliente');
    assert.ok(res.body.id);
    assert.equal(res.body.whatsappSent, false);
  });

  it('rechaza doble reserva del mismo horario', async () => {
    const payload = {
      slug,
      date,
      time: '11:00',
      clientName: 'Pedro Cliente',
      clientPhone: '+5491199887766',
    };

    const first = await request(app).post('/api/bookings').send(payload);
    assert.equal(first.status, 201);

    const second = await request(app).post('/api/bookings').send({
      ...payload,
      clientName: 'Otro Cliente',
      clientPhone: '+5491155667788',
    });

    assert.equal(second.status, 409);
    assert.match(second.body.error, /ocupado|disponible/i);
  });

  it('rechaza datos inválidos', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .send({
        slug,
        date: 'fecha-mala',
        time: '10:00',
        clientName: 'X',
        clientPhone: '123',
      });

    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  it('devuelve confirmación de reserva por id', async () => {
    const created = await request(app)
      .post('/api/bookings')
      .send({
        slug,
        date,
        time: '12:00',
        clientName: 'Confirm Test',
        clientPhone: '+5491111222333',
      });

    const res = await request(app).get(`/api/bookings/${created.body.id}/confirmation`);
    assert.equal(res.status, 200);
    assert.equal(res.body.id, created.body.id);
    assert.equal(res.body.clientName, 'Confirm Test');
  });
});

const cron = require('node-cron');
const { db } = require('../db');
const { sendReminder } = require('./whatsapp');

function getTomorrowDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

async function processReminders() {
  const tomorrow = getTomorrowDate();

  const pending = db.prepare(`
    SELECT b.*, p.name as professional_name, p.specialty
    FROM bookings b
    JOIN professionals p ON p.id = b.professional_id
    WHERE b.date = ? AND b.status = 'confirmed' AND b.reminder_sent = 0
  `).all(tomorrow);

  for (const booking of pending) {
    try {
      await sendReminder(booking, { name: booking.professional_name });
      db.prepare('UPDATE bookings SET reminder_sent = 1 WHERE id = ?').run(booking.id);
      console.log(`Recordatorio enviado: booking #${booking.id}`);
    } catch (err) {
      console.error(`Error recordatorio booking #${booking.id}:`, err.message);
    }
  }
}

function startReminderScheduler() {
  cron.schedule('0 * * * *', processReminders);
  console.log('Scheduler de recordatorios WhatsApp activo (cada hora)');
}

module.exports = { startReminderScheduler, processReminders };

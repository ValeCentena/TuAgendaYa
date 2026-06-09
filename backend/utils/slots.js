function timeToMinutes(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function generateSlots(startTime, endTime, durationMinutes) {
  const slots = [];
  let current = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);

  while (current + durationMinutes <= end) {
    slots.push(minutesToTime(current));
    current += durationMinutes;
  }

  return slots;
}

function getDayOfWeek(dateStr) {
  return new Date(`${dateStr}T12:00:00`).getDay();
}

function isPastSlot(dateStr, time) {
  const now = new Date();
  const slot = new Date(`${dateStr}T${time}:00`);
  return slot <= now;
}

function getAvailableSlotsForDate(db, professionalId, date, durationMinutes) {
  const dayOfWeek = getDayOfWeek(date);
  const windows = db.prepare(`
    SELECT start_time, end_time FROM availability
    WHERE professional_id = ? AND day_of_week = ?
    ORDER BY start_time
  `).all(professionalId, dayOfWeek);

  if (windows.length === 0) return [];

  const booked = new Set(
    db.prepare(`
      SELECT time FROM bookings
      WHERE professional_id = ? AND date = ? AND status = 'confirmed'
    `).all(professionalId, date).map((b) => b.time),
  );

  const allSlots = windows.flatMap((w) =>
    generateSlots(w.start_time, w.end_time, durationMinutes),
  );

  return [...new Set(allSlots)]
    .filter((slot) => !booked.has(slot) && !isPastSlot(date, slot))
    .sort();
}

function getAvailableDatesInMonth(db, professionalId, year, month, durationMinutes) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dates = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dateObj = new Date(`${dateStr}T12:00:00`);
    if (dateObj < today) continue;

    const slots = getAvailableSlotsForDate(db, professionalId, dateStr, durationMinutes);
    if (slots.length > 0) dates.push(dateStr);
  }

  return dates;
}

module.exports = {
  generateSlots,
  getAvailableSlotsForDate,
  getAvailableDatesInMonth,
  getDayOfWeek,
};

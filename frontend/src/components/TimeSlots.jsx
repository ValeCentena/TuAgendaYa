export default function TimeSlots({ slots, selected, onSelect }) {
  if (slots.length === 0) {
    return <p className="empty-state">No hay horarios disponibles este día.</p>;
  }

  return (
    <div className="time-slots">
      {slots.map((slot) => (
        <button
          key={slot}
          type="button"
          className={`time-slot${selected === slot ? ' selected' : ''}`}
          onClick={() => onSelect(slot)}
        >
          {slot}
        </button>
      ))}
    </div>
  );
}

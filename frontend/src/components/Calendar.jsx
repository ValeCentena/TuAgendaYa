const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export default function Calendar({ year, month, availableDates, selectedDate, onSelectDate, onMonthChange }) {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const availableSet = new Set(availableDates);

  const cells = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push(<div key={`e-${i}`} className="calendar-day empty" />);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isAvailable = availableSet.has(dateStr);
    const isSelected = selectedDate === dateStr;

    cells.push(
      <button
        key={day}
        type="button"
        className={`calendar-day${isAvailable ? ' available' : ''}${isSelected ? ' selected' : ''}`}
        disabled={!isAvailable}
        onClick={() => onSelectDate(dateStr)}
      >
        {day}
      </button>,
    );
  }

  const prevMonth = () => {
    if (month === 1) onMonthChange(year - 1, 12);
    else onMonthChange(year, month - 1);
  };

  const nextMonth = () => {
    if (month === 12) onMonthChange(year + 1, 1);
    else onMonthChange(year, month + 1);
  };

  return (
    <div>
      <div className="calendar-header">
        <button type="button" className="calendar-nav" onClick={prevMonth}>‹</button>
        <h3>{MONTHS[month - 1]} {year}</h3>
        <button type="button" className="calendar-nav" onClick={nextMonth}>›</button>
      </div>
      <div className="calendar-grid">
        {WEEKDAYS.map((d) => (
          <div key={d} className="calendar-weekday">{d}</div>
        ))}
        {cells}
      </div>
    </div>
  );
}

import { useState, useEffect, useRef, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import BookPage from './pages/BookPage.jsx';

const API_BASE = 'https://tuagendaya-api.onrender.com/api';

const APP_FONT = '"Nunito", "Arial Rounded MT Bold", "Avenir Next", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

const brandTextStyle = {
  fontFamily: APP_FONT,
  fontWeight: 700,
  letterSpacing: '-0.03em',
  color: '#0071e3',
};

function TuAgendaLogo({ height = 38, centered = false }) {
  return (
    <img
      src="/tuagendaya-logo.png"
      alt="Tu Agenda Ya"
      style={{
        height,
        width: 'auto',
        maxWidth: '100%',
        objectFit: 'contain',
        display: 'block',
        margin: centered ? '0 auto' : 0,
      }}
    />
  );
}

const DAYS = [
  { dayOfWeek: 0, label: 'Domingo' },
  { dayOfWeek: 1, label: 'Lunes' },
  { dayOfWeek: 2, label: 'Martes' },
  { dayOfWeek: 3, label: 'Miércoles' },
  { dayOfWeek: 4, label: 'Jueves' },
  { dayOfWeek: 5, label: 'Viernes' },
  { dayOfWeek: 6, label: 'Sábado' },
];

const PROFESSIONS = [
  'Barbería',
  'Peluquería',
  'Odontología',
  'Psicología',
  'Uñas / Manicura',
  'Veterinaria',
  'Medicina',
  'Fisioterapia',
  'Kinesiología',
  'Masajes',
  'Entrenador personal',
  'Gimnasio / Fitness',
  'Maquillaje',
  'Fotografía',
  'Estética',
  'Cosmetología',
  'Depilación',
  'Cejas y pestañas',
  'Nutrición',
  'Tatuajes',
  'Piercing',
  'Consultoría',
  'Clases particulares',
  'Otro',
];

const STAFF_COLORS = [
  '#0071e3',
  '#30d158',
  '#ff9f0a',
  '#ff453a',
  '#bf5af2',
  '#64d2ff',
  '#ffd60a',
  '#8e8e93',
];

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  border: '0.5px solid #d0d0d5',
  fontSize: 14,
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
  background: '#fff',
  color: '#1a1a1a',
};

const smallLabelStyle = {
  fontSize: 11,
  color: '#6e6e73',
  marginBottom: 4,
  display: 'block',
  fontWeight: 600,
};

function formatDate(d) {
  if (!d) return 'Sin fecha';

  const raw = String(d).trim();

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, y, m, day] = isoMatch;
    return `${day}/${m}/${y}`;
  }

  const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    const [, day, m, y] = slashMatch;
    return `${String(day).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    const day = String(parsed.getDate()).padStart(2, '0');
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const y = parsed.getFullYear();
    return `${day}/${m}/${y}`;
  }

  return 'Sin fecha';
}

function getBookingDateValue(booking) {
  return (
    booking?.bookingDate ??
    booking?.booking_date ??
    booking?.date ??
    booking?.fecha ??
    booking?.day ??
    booking?.appointmentDate ??
    booking?.appointment_date ??
    booking?.startDate ??
    booking?.start_date ??
    booking?.createdDate ??
    booking?.created_date ??
    null
  );
}

function formatTime(t) {
  if (!t) return null;
  return String(t).slice(0, 5);
}

function formatMoney(value) {
  if (value === null || value === undefined || value === '') return '$0';

  const number = Number(value);

  if (Number.isNaN(number)) return '$0';

  return `$${number.toLocaleString('es-UY', {
    minimumFractionDigits: number % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}


function getLocalDateKeyValue(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getDateKeyFromValue(value) {
  if (!value) return '';

  const raw = String(value).trim();

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return getLocalDateKeyValue(parsed);
  }

  return '';
}

function formatDateKeyLong(dateKey) {
  if (!dateKey) return 'Elegir fecha';

  const [year, month, day] = String(dateKey).split('-').map(Number);
  if (!year || !month || !day) return 'Elegir fecha';

  const date = new Date(year, month - 1, day);
  const formatted = date.toLocaleDateString('es-UY', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function DatePickerField({ value, onChange, placeholder = 'Elegir fecha', allowPast = true }) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    if (value) {
      const [year, month] = String(value).split('-').map(Number);
      if (year && month) return new Date(year, month - 1, 1);
    }
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  useEffect(() => {
    if (!value) return;
    const [year, month] = String(value).split('-').map(Number);
    if (year && month) {
      setViewDate(new Date(year, month - 1, 1));
    }
  }, [value]);

  const todayKey = getLocalDateKeyValue();
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = firstDay.getDay();
  const monthTitle = viewDate.toLocaleDateString('es-UY', { month: 'long', year: 'numeric' });
  const capitalizedMonth = monthTitle.charAt(0).toUpperCase() + monthTitle.slice(1);

  const changeMonth = (delta) => {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  };

  const clearValue = (event) => {
    event.stopPropagation();
    onChange('');
    setOpen(false);
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        style={{
          width: '100%',
          minHeight: 42,
          border: open ? '1px solid #0071e3' : '0.5px solid #d8d8de',
          background: '#fff',
          borderRadius: 14,
          padding: '10px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          cursor: 'pointer',
          fontFamily: 'inherit',
          boxShadow: open ? '0 0 0 3px rgba(0,113,227,0.10)' : '0 1px 5px rgba(0,0,0,0.03)',
        }}
      >
        <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: value ? '#1a1a1a' : '#8e8e93', fontSize: 13, fontWeight: 800 }}>
          {value ? formatDate(value) : placeholder}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {value && (
            <span
              onClick={clearValue}
              style={{ width: 22, height: 22, borderRadius: 999, background: '#f2f2f7', color: '#8e8e93', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900 }}
            >
              ×
            </span>
          )}
          <span style={{ color: '#0071e3', fontSize: 15, fontWeight: 900 }}>▾</span>
        </span>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            zIndex: 60,
            top: 'calc(100% + 8px)',
            left: 0,
            width: 'min(314px, 88vw)',
            background: '#fff',
            border: '0.5px solid #e2e2e8',
            borderRadius: 22,
            padding: 12,
            boxShadow: '0 18px 40px rgba(0,0,0,0.16)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <button type="button" onClick={() => changeMonth(-1)} style={{ width: 34, height: 34, borderRadius: 12, border: 'none', background: '#f6f6f8', color: '#1a1a1a', fontSize: 17, fontWeight: 900, cursor: 'pointer' }}>‹</button>
            <div style={{ fontSize: 14, fontWeight: 900, color: '#1a1a1a' }}>{capitalizedMonth}</div>
            <button type="button" onClick={() => changeMonth(1)} style={{ width: 34, height: 34, borderRadius: 12, border: 'none', background: '#f6f6f8', color: '#1a1a1a', fontSize: 17, fontWeight: 900, cursor: 'pointer' }}>›</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5, marginBottom: 6 }}>
            {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((day) => (
              <div key={day} style={{ textAlign: 'center', fontSize: 11, color: '#8e8e93', fontWeight: 900 }}>{day}</div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5 }}>
            {Array.from({ length: startOffset }).map((_, index) => <div key={`empty-${index}`} />)}
            {Array.from({ length: daysInMonth }).map((_, index) => {
              const day = index + 1;
              const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const selected = key === value;
              const disabled = !allowPast && key < todayKey;

              return (
                <button
                  key={key}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onChange(key);
                    setOpen(false);
                  }}
                  style={{
                    height: 34,
                    borderRadius: 12,
                    border: selected ? '1px solid #0071e3' : 'none',
                    background: selected ? '#eaf3ff' : disabled ? '#fafafa' : '#f6f6f8',
                    color: disabled ? '#c7c7cc' : selected ? '#0071e3' : '#1a1a1a',
                    fontSize: 13,
                    fontWeight: 900,
                    fontFamily: 'inherit',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const PAYMENT_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'paid', label: 'Pagado' },
  { value: 'deposit', label: 'Seña' },
  { value: 'cancelled', label: 'Cancelado' },
];

const PAYMENT_METHOD_OPTIONS = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'card', label: 'Tarjeta' },
  { value: 'other', label: 'Otro' },
];

const paymentStatusLabel = {
  pending: 'Pendiente',
  paid: 'Pagado',
  deposit: 'Seña',
  cancelled: 'Cancelado',
};

const paymentMethodLabel = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  card: 'Tarjeta',
  other: 'Otro',
};

const paymentStatusColor = {
  pending: '#ff9f0a',
  paid: '#30d158',
  deposit: '#0071e3',
  cancelled: '#ff453a',
};

const paymentStatusBg = {
  pending: '#fff8ee',
  paid: '#edfff3',
  deposit: '#eef6ff',
  cancelled: '#fff2f2',
};

function getBookingPaymentStatus(booking) {
  return String(booking?.paymentStatus ?? booking?.payment_status ?? 'pending').trim() || 'pending';
}

function getBookingPaymentMethod(booking) {
  return String(booking?.paymentMethod ?? booking?.payment_method ?? 'cash').trim() || 'cash';
}

function getBookingAmountPaid(booking) {
  const value = booking?.amountPaid ?? booking?.amount_paid ?? '';
  return value === null || value === undefined ? '' : String(value);
}

function normalizePhoneForWhatsApp(phone) {
  const onlyNumbers = String(phone || '').replace(/\D/g, '');

  if (!onlyNumbers) return '';

  if (onlyNumbers.startsWith('598')) {
    return onlyNumbers;
  }

  if (onlyNumbers.startsWith('09') && onlyNumbers.length >= 8) {
    return `598${onlyNumbers.slice(1)}`;
  }

  if (onlyNumbers.startsWith('9') && onlyNumbers.length >= 8) {
    return `598${onlyNumbers}`;
  }

  if (onlyNumbers.startsWith('0') && onlyNumbers.length > 6) {
    return `598${onlyNumbers.slice(1)}`;
  }

  return onlyNumbers;
}

function buildClientWhatsAppMessage({ clientName, businessName, serviceName, staffName, dateStr, timeStr, endStr }) {
  const safeClientName = String(clientName || '').trim() || 'te';
  const safeBusinessName = String(businessName || '').trim() || 'el negocio';

  const lines = [
    `Hola ${safeClientName}, tu reserva en ${safeBusinessName} quedó confirmada.`,
    '',
    serviceName ? `Servicio: ${serviceName}` : null,
    staffName ? `Profesional: ${staffName}` : null,
    dateStr ? `Fecha: ${dateStr}` : null,
    timeStr ? `Hora: ${timeStr}${endStr ? ` a ${endStr}` : ''}` : null,
    '',
    'Te esperamos. Gracias por reservar.',
  ];

  return lines.filter((line) => line !== null).join('\n');
}

function buildWhatsAppUrl(phone, message) {
  const normalizedPhone = normalizePhoneForWhatsApp(phone);

  if (!normalizedPhone) return '';

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}


function csvSafe(value) {
  const raw = value === null || value === undefined ? '' : String(value);
  const clean = raw.replace(/\r?\n|\r/g, ' ').trim();
  return `"${clean.replace(/"/g, '""')}"`;
}

function downloadCsvFile(filename, headers, rows) {
  const csvLines = [
    headers.map(csvSafe).join(','),
    ...rows.map((row) => row.map(csvSafe).join(',')),
  ];

  const blob = new Blob([`\ufeff${csvLines.join('\n')}`], {
    type: 'text/csv;charset=utf-8;',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function exportBookingsToCsv(bookings, filename = 'reservas.csv') {
  const headers = [
    'Fecha',
    'Hora inicio',
    'Hora fin',
    'Cliente',
    'Telefono',
    'Servicio',
    'Profesional',
    'Estado',
    'Duracion',
    'Precio',
    'Comentario',
  ];

  const rows = bookings.map((booking) => [
    formatDate(getBookingDateValue(booking)),
    formatTime(booking.startTime ?? booking.start_time) || '',
    formatTime(booking.endTime ?? booking.end_time) || '',
    booking.clientName ?? booking.client_name ?? '',
    booking.clientPhone ?? booking.client_phone ?? '',
    booking.serviceName ?? booking.service_name ?? '',
    booking.staffName ?? booking.staff_name ?? '',
    booking.status || '',
    booking.serviceDurationMinutes ?? booking.service_duration_minutes ?? '',
    booking.servicePrice ?? booking.service_price ?? '',
    booking.comment || '',
  ]);

  downloadCsvFile(filename, headers, rows);
}

function exportClientsToCsv(clients, filename = 'clientes.csv') {
  const headers = [
    'Cliente',
    'Telefono',
    'Reservas totales',
    'Asistencias',
    'Canceladas',
    'Pendientes o confirmadas',
    'Ultima reserva',
    'Ultima hora',
    'Notas internas',
  ];

  const rows = clients.map((client) => {
    const lastBooking = client.lastBooking;

    return [
      client.name || '',
      client.phone || '',
      client.bookings?.length || 0,
      client.completedCount || 0,
      client.cancelledCount || 0,
      client.pendingOrConfirmedCount || 0,
      lastBooking ? formatDate(getBookingDateValue(lastBooking)) : '',
      lastBooking ? formatTime(lastBooking.startTime ?? lastBooking.start_time) || '' : '',
      client.notes || '',
    ];
  });

  downloadCsvFile(filename, headers, rows);
}

function normalizeSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeSearchText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function getDefaultAvailability() {
  return DAYS.map((day) => ({
    dayOfWeek: day.dayOfWeek,
    isActive: day.dayOfWeek >= 1 && day.dayOfWeek <= 5,
    startTime: '09:00',
    endTime: '18:00',
    slotDurationMinutes: 30,
  }));
}

function normalizeAvailabilityItem(item) {
  return {
    dayOfWeek: Number(item.dayOfWeek ?? item.day_of_week ?? 0),
    isActive: Boolean(item.isActive ?? item.is_active),
    startTime: String(item.startTime ?? item.start_time ?? '09:00').slice(0, 5),
    endTime: String(item.endTime ?? item.end_time ?? '18:00').slice(0, 5),
    slotDurationMinutes: Number(item.slotDurationMinutes ?? item.slot_duration_minutes ?? 30),
  };
}

function normalizeService(item) {
  return {
    id: item.id,
    name: item.name || '',
    description: item.description || '',
    durationMinutes: Number(item.durationMinutes ?? item.duration_minutes ?? 30),
    price: item.price === null || item.price === undefined || item.price === '' ? '' : String(item.price),
    isActive: Boolean(item.isActive ?? item.is_active),
  };
}

function normalizeStaff(item) {
  return {
    id: item.id,
    name: item.name || '',
    phone: item.phone || '',
    email: item.email || '',
    color: item.color || '#0071e3',
    isActive: Boolean(item.isActive ?? item.is_active),
  };
}

function getProfessionExamples() {
  let profession = '';

  try {
    const stored = JSON.parse(localStorage.getItem('tuagendaya_professional')) || {};
    profession = String(stored.profession || '').toLowerCase();
  } catch {
    profession = '';
  }

  if (profession.includes('dent') || profession.includes('odont')) {
    return {
      serviceExample: 'Ej: Limpieza dental',
      descriptionExample: 'Ej: Profilaxis, control, urgencia dental...',
    };
  }

  if (profession.includes('psic') || profession.includes('terap')) {
    return {
      serviceExample: 'Ej: Consulta individual',
      descriptionExample: 'Ej: Sesión individual, primera entrevista, consulta online...',
    };
  }

  if (profession.includes('veterin')) {
    return {
      serviceExample: 'Ej: Consulta general',
      descriptionExample: 'Ej: Consulta, vacunación, control post tratamiento...',
    };
  }

  if (
    profession.includes('uña') ||
    profession.includes('una') ||
    profession.includes('manicur') ||
    profession.includes('nail')
  ) {
    return {
      serviceExample: 'Ej: Kapping',
      descriptionExample: 'Ej: Kapping, esmaltado semi, esculpidas...',
    };
  }

  if (profession.includes('fisi') || profession.includes('kines') || profession.includes('masaj')) {
    return {
      serviceExample: 'Ej: Sesión de fisioterapia',
      descriptionExample: 'Ej: Evaluación, fisioterapia, masaje terapéutico...',
    };
  }

  if (
    profession.includes('entren') ||
    profession.includes('gym') ||
    profession.includes('fitness')
  ) {
    return {
      serviceExample: 'Ej: Clase personal',
      descriptionExample: 'Ej: Entrenamiento personalizado, evaluación física...',
    };
  }

  if (profession.includes('maquill') || profession.includes('makeup')) {
    return {
      serviceExample: 'Ej: Maquillaje social',
      descriptionExample: 'Ej: Social, novia, prueba de maquillaje...',
    };
  }

  if (profession.includes('foto')) {
    return {
      serviceExample: 'Ej: Sesión completa',
      descriptionExample: 'Ej: Sesión básica, completa, reunión previa...',
    };
  }

  return {
    serviceExample: 'Ej: Corte + barba',
    descriptionExample: 'Ej: Corte clásico, degradado, arreglo de barba...',
  };
}

function AuthLayout({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: '#f2f2f7', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: APP_FONT }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&display=swap');@keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>

      <div style={{ background: '#fff', borderRadius: 24, padding: '36px 32px', border: '0.5px solid #e0e0e5', width: '100%', maxWidth: 460, animation: 'slideUp 250ms cubic-bezier(0.16,1,0.3,1) both', boxShadow: '0 2px 40px rgba(0,0,0,0.06)' }}>
        {children}
      </div>
    </div>
  );
}

function ProfessionCombobox({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const filteredProfessions = PROFESSIONS.filter((profession) =>
    normalizeSearchText(profession).includes(normalizeSearchText(value))
  );

  const visibleOptions = filteredProfessions.length > 0 ? filteredProfessions : ['Otro'];

  useEffect(() => {
    function handleClickOutside(event) {
      if (!containerRef.current) return;

      if (!containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative', marginBottom: 10 }}>
      <input
        style={{ ...inputStyle, marginBottom: 0 }}
        value={value}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        placeholder=""
        required
        autoComplete="off"
      />

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            background: '#fff',
            border: '0.5px solid #d0d0d5',
            borderRadius: 12,
            boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
            maxHeight: 126,
            overflowY: 'auto',
            zIndex: 50,
            padding: 4,
          }}
        >
          {visibleOptions.map((profession) => (
            <button
              key={profession}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(profession);
                setOpen(false);
              }}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '10px 12px',
                border: 'none',
                background: normalizeSearchText(value) === normalizeSearchText(profession) ? '#eef6ff' : '#fff',
                color: '#1a1a1a',
                borderRadius: 9,
                fontSize: 14,
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              {profession}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function LoginForm({ onLogin }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al ingresar');
      } else {
        localStorage.setItem('tuagendaya_token', data.token);
        if (data.professional) {
          localStorage.setItem('tuagendaya_professional', JSON.stringify(data.professional));
        }
        onLogin(data.professional || {});
      }
    } catch {
      setError('No se pudo conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <TuAgendaLogo height={52} centered />
        <div style={{ fontSize: 14, color: '#6e6e73' }}>Accedé a tu panel profesional</div>
      </div>

      <form onSubmit={handleSubmit}>
        <label style={smallLabelStyle}>Email</label>
        <input
          style={{ ...inputStyle, marginBottom: 12 }}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
          autoComplete="email"
        />

        <label style={smallLabelStyle}>Contraseña</label>
        <input
          style={{ ...inputStyle, marginBottom: 12 }}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña"
          required
          autoComplete="current-password"
        />

        {error && (
          <div style={{ background: '#fff2f2', border: '0.5px solid #ffcdd2', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: '#c62828', marginBottom: 12 }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: loading ? '#aeaeb2' : '#0071e3', color: '#fff', fontSize: 15, fontWeight: 600, fontFamily: 'inherit', cursor: loading ? 'not-allowed' : 'pointer', marginTop: 4 }}
        >
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>

      <button
        type="button"
        onClick={() => navigate('/profesional/register')}
        style={{ width: '100%', marginTop: 12, padding: '12px', borderRadius: 12, border: '0.5px solid #d0d0d5', background: '#fff', color: '#0071e3', fontSize: 14, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}
      >
        Crear cuenta profesional
      </button>

      <div style={{ textAlign: 'center', fontSize: 11, color: '#aeaeb2', marginTop: 16 }}>
        Tus datos están cifrados y protegidos
      </div>
    </AuthLayout>
  );
}

function RegisterPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    businessName: '',
    email: '',
    password: '',
    phone: '',
    profession: '',
    address: '',
    slug: '',
  });

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const steps = [
    {
      number: 1,
      title: 'Datos del negocio',
      text: 'Nombre, rubro, dirección y contacto.',
    },
    {
      number: 2,
      title: 'Datos de acceso',
      text: 'Responsable, email y contraseña.',
    },
    {
      number: 3,
      title: 'Link público',
      text: 'Tu agenda queda lista para compartir.',
    },
    {
      number: 4,
      title: 'Confirmación',
      text: 'Revisá los datos antes de crear la cuenta.',
    },
  ];

  const updateForm = (field, value) => {
    const next = { ...form, [field]: value };

    if (field === 'businessName' && !form.slug) {
      next.slug = normalizeSlug(value);
    }

    if (field === 'slug') {
      next.slug = normalizeSlug(value);
    }

    setForm(next);
  };

  const validateStep = (targetStep = step) => {
    setError('');

    if (targetStep === 1) {
      if (!form.businessName.trim()) return 'El nombre del negocio es obligatorio.';
      if (!form.profession.trim()) return 'El rubro o profesión es obligatorio.';
      if (!form.address.trim()) return 'La dirección del negocio es obligatoria.';
    }

    if (targetStep === 2) {
      if (!form.name.trim()) return 'El nombre del profesional es obligatorio.';
      if (!form.email.trim()) return 'El email es obligatorio.';
      if (form.password.length < 8) return 'La contraseña debe tener mínimo 8 caracteres.';
    }

    if (targetStep === 3) {
      if (!form.slug.trim()) return 'El link público es obligatorio.';
    }

    return '';
  };

  const goNext = () => {
    const validationError = validateStep(step);

    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setStep((current) => Math.min(current + 1, 4));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    setError('');
    setStep((current) => Math.max(current - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const validations = [validateStep(1), validateStep(2), validateStep(3)].filter(Boolean);

    if (validations.length > 0) {
      setError(validations[0]);
      if (!form.businessName.trim() || !form.profession.trim() || !form.address.trim()) setStep(1);
      else if (!form.name.trim() || !form.email.trim() || form.password.length < 8) setStep(2);
      else setStep(3);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          businessName: form.businessName.trim(),
          email: form.email.trim(),
          password: form.password,
          phone: form.phone.trim(),
          profession: form.profession.trim(),
          address: form.address.trim(),
          slug: normalizeSlug(form.slug),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'No se pudo crear la cuenta.');
      } else {
        localStorage.setItem('tuagendaya_token', data.token);
        localStorage.setItem('tuagendaya_professional', JSON.stringify(data.professional || {}));
        navigate('/profesional/dashboard');
      }
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const publicPreview = form.slug ? `/reservar/${normalizeSlug(form.slug)}` : '/reservar/tu-negocio';
  const activeStep = steps.find((item) => item.number === step) || steps[0];

  const stepPillStyle = (number) => ({
    display: 'flex',
    gap: 12,
    alignItems: 'flex-start',
    background: number === step ? '#eef6ff' : '#f8fafc',
    border: number === step ? '1px solid rgba(0,113,227,0.36)' : '0.5px solid #e5e7eb',
    borderRadius: 22,
    padding: 14,
    cursor: number < step ? 'pointer' : 'default',
    transition: 'all 0.2s ease',
  });

  const renderStepContent = () => {
    if (step === 1) {
      return (
        <div className="register-grid">
          <div>
            <label style={smallLabelStyle}>Nombre del negocio *</label>
            <input
              style={{ ...inputStyle, marginBottom: 0, borderRadius: 15, padding: '13px 14px' }}
              value={form.businessName}
              onChange={(e) => updateForm('businessName', e.target.value)}
              placeholder=""
              required
            />
          </div>

          <div>
            <label style={smallLabelStyle}>Rubro / profesión *</label>
            <ProfessionCombobox
              value={form.profession}
              onChange={(value) => updateForm('profession', value)}
            />
          </div>

          <div>
            <label style={smallLabelStyle}>Teléfono</label>
            <input
              style={{ ...inputStyle, marginBottom: 0, borderRadius: 15, padding: '13px 14px' }}
              value={form.phone}
              onChange={(e) => updateForm('phone', e.target.value)}
              placeholder=""
              inputMode="tel"
            />
          </div>

          <div className="register-full">
            <label style={smallLabelStyle}>Dirección del negocio *</label>
            <input
              style={{ ...inputStyle, marginBottom: 0, borderRadius: 15, padding: '13px 14px' }}
              value={form.address}
              onChange={(e) => updateForm('address', e.target.value)}
              placeholder=""
              required
            />
          </div>
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="register-grid">
          <div>
            <label style={smallLabelStyle}>Nombre del profesional *</label>
            <input
              style={{ ...inputStyle, marginBottom: 0, borderRadius: 15, padding: '13px 14px' }}
              value={form.name}
              onChange={(e) => updateForm('name', e.target.value)}
              placeholder=""
              required
            />
          </div>

          <div>
            <label style={smallLabelStyle}>Email *</label>
            <input
              style={{ ...inputStyle, marginBottom: 0, borderRadius: 15, padding: '13px 14px' }}
              type="email"
              value={form.email}
              onChange={(e) => updateForm('email', e.target.value)}
              placeholder="Email"
              required
              autoComplete="email"
            />
          </div>

          <div className="register-full">
            <label style={smallLabelStyle}>Contraseña *</label>
            <input
              style={{ ...inputStyle, marginBottom: 0, borderRadius: 15, padding: '13px 14px' }}
              type="password"
              value={form.password}
              onChange={(e) => updateForm('password', e.target.value)}
              placeholder="Contraseña"
              required
              autoComplete="new-password"
            />
            <div style={{ marginTop: 7, color: '#8e8e93', fontSize: 12, fontWeight: 650 }}>
              Usá mínimo 8 caracteres para proteger el acceso al panel.
            </div>
          </div>
        </div>
      );
    }

    if (step === 3) {
      return (
        <div>
          <label style={smallLabelStyle}>Link público *</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 8, alignItems: 'center', background: '#f8fafc', border: '0.5px solid #d0d0d5', borderRadius: 17, padding: '6px 8px 6px 12px' }}>
            <span style={{ fontSize: 13, color: '#8e8e93', whiteSpace: 'nowrap', fontWeight: 800 }}>/reservar/</span>
            <input
              style={{ border: 'none', outline: 'none', background: '#fff', borderRadius: 12, padding: '12px 12px', fontSize: 16, fontFamily: 'inherit', color: '#1a1a1a', minWidth: 0 }}
              value={form.slug}
              onChange={(e) => updateForm('slug', e.target.value)}
              placeholder=""
              required
            />
          </div>
          <div style={{ marginTop: 8, color: '#8e8e93', fontSize: 12, fontWeight: 650 }}>
            Usá un nombre corto, sin espacios ni tildes.
          </div>

          <div style={{ marginTop: 18, background: '#f8fafc', border: '0.5px solid #e5e7eb', borderRadius: 22, padding: 16 }}>
            <div style={{ fontSize: 12, color: '#8e8e93', fontWeight: 900, marginBottom: 5 }}>
              Vista previa del link público
            </div>
            <div style={{ color: '#0071e3', fontWeight: 950, fontSize: 15, wordBreak: 'break-word' }}>
              {publicPreview}
            </div>
            <div style={{ color: '#64748b', fontSize: 12.5, lineHeight: 1.45, marginTop: 8, fontWeight: 650 }}>
              Este será el enlace que vas a compartir con tus clientes para recibir reservas.
            </div>
          </div>
        </div>
      );
    }

    return (
      <div style={{ display: 'grid', gap: 12 }}>
        {[
          ['Negocio', form.businessName || 'Sin completar'],
          ['Rubro', form.profession || 'Sin completar'],
          ['Dirección', form.address || 'Sin completar'],
          ['Teléfono', form.phone || 'Sin completar'],
          ['Profesional', form.name || 'Sin completar'],
          ['Email', form.email || 'Sin completar'],
          ['Link público', publicPreview],
        ].map(([label, value]) => (
          <div key={label} style={{ background: '#f8fafc', border: '0.5px solid #e5e7eb', borderRadius: 18, padding: 14, display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'center' }}>
            <div style={{ color: '#8e8e93', fontSize: 12.5, fontWeight: 850 }}>{label}</div>
            <div style={{ color: label === 'Link público' ? '#0071e3' : '#111827', fontSize: 13.5, fontWeight: 850, textAlign: 'right', wordBreak: 'break-word' }}>
              {value}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #f7fbff 0%, #f5f5f7 45%, #ffffff 100%)',
        padding: 'max(18px, env(safe-area-inset-top)) 14px 28px',
        fontFamily: APP_FONT,
        boxSizing: 'border-box',
      }}
    >
      <style>
        {`
          .register-shell {
            width: min(1080px, 100%);
            margin: 0 auto;
            display: grid;
            grid-template-columns: 0.9fr 1.1fr;
            gap: 18px;
            align-items: stretch;
          }

          .register-card {
            background: rgba(255,255,255,0.92);
            border: 0.5px solid rgba(225,229,236,0.95);
            border-radius: 34px;
            box-shadow: 0 18px 50px rgba(15,23,42,0.07);
          }

          .register-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }

          .register-full {
            grid-column: 1 / -1;
          }

          @media (max-width: 860px) {
            .register-shell {
              grid-template-columns: 1fr !important;
            }
            .register-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}
      </style>

      <div style={{ width: 'min(1080px, 100%)', margin: '0 auto 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <button
          type="button"
          onClick={() => navigate('/')}
          style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          <TuAgendaLogo height={36} />
        </button>

        <button
          type="button"
          onClick={() => navigate('/profesional/login')}
          style={{
            border: '0.5px solid #d7dce5',
            background: '#fff',
            color: '#111827',
            borderRadius: 999,
            padding: '10px 15px',
            fontSize: 14,
            fontWeight: 850,
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}
        >
          Ingresar
        </button>
      </div>

      <div className="register-shell">
        <aside className="register-card" style={{ padding: 26, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 18 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 999, background: '#eaf4ff', color: '#0066cc', padding: '8px 12px', fontSize: 13, fontWeight: 950, marginBottom: 16 }}>
              Crear cuenta profesional
            </div>
            <h1 style={{ margin: 0, color: '#0f172a', fontSize: 38, lineHeight: 1, letterSpacing: '-1.6px', fontWeight: 950 }}>
              Configurá tu agenda en minutos.
            </h1>
            <p style={{ margin: '16px 0 0', color: '#64748b', fontSize: 15.5, lineHeight: 1.55, fontWeight: 650 }}>
              Completá la información en pasos simples. Al terminar, entrás directo al panel para configurar servicios, horarios y profesionales.
            </p>
          </div>

          <div style={{ display: 'grid', gap: 10 }}>
            {steps.map((item) => (
              <button
                key={item.title}
                type="button"
                onClick={() => {
                  if (item.number < step) setStep(item.number);
                }}
                style={{ ...stepPillStyle(item.number), fontFamily: 'inherit', textAlign: 'left' }}
              >
                <div style={{ width: 32, height: 32, borderRadius: 13, background: item.number === step ? '#0071e3' : '#dbeafe', color: item.number === step ? '#fff' : '#0071e3', display: 'grid', placeItems: 'center', fontWeight: 950, flex: '0 0 auto' }}>
                  {item.number}
                </div>
                <div>
                  <div style={{ color: '#111827', fontSize: 14, fontWeight: 950 }}>{item.title}</div>
                  <div style={{ color: '#64748b', fontSize: 13, lineHeight: 1.4, marginTop: 2, fontWeight: 650 }}>{item.text}</div>
                </div>
              </button>
            ))}
          </div>

          <div style={{ background: '#fff', borderRadius: 24, border: '0.5px solid #e5e7eb', padding: 16 }}>
            <div style={{ fontSize: 12, color: '#8e8e93', fontWeight: 900, marginBottom: 4 }}>Tu link quedaría así</div>
            <div style={{ color: '#0071e3', fontWeight: 950, fontSize: 14, wordBreak: 'break-word' }}>{publicPreview}</div>
          </div>
        </aside>

        <section className="register-card" style={{ padding: 24 }}>
          <div style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
            <div>
              <div style={{ color: '#0071e3', fontSize: 12, fontWeight: 950, marginBottom: 5 }}>
                Paso {step} de 4
              </div>
              <h2 style={{ margin: 0, color: '#111827', fontSize: 24, letterSpacing: '-0.7px', fontWeight: 950 }}>{activeStep.title}</h2>
              <p style={{ margin: '6px 0 0', color: '#6e6e73', fontSize: 14, fontWeight: 650 }}>
                {activeStep.text}
              </p>
            </div>
            <div style={{ minWidth: 74, height: 8, borderRadius: 999, background: '#eef2f7', overflow: 'hidden', marginTop: 8 }}>
              <div style={{ width: `${(step / 4) * 100}%`, height: '100%', background: '#0071e3', borderRadius: 999, transition: 'width 0.2s ease' }} />
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {renderStepContent()}

            {error && (
              <div style={{ background: '#fff2f2', border: '0.5px solid #ffcdd2', borderRadius: 14, padding: '11px 13px', fontSize: 13, color: '#c62828', marginTop: 14, fontWeight: 700 }}>
                {error}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: step === 1 ? '1fr' : '0.6fr 1fr', gap: 10, marginTop: 18 }}>
              {step > 1 && (
                <button
                  type="button"
                  onClick={goBack}
                  disabled={loading}
                  style={{ width: '100%', padding: '14px', borderRadius: 18, border: '0.5px solid #d0d0d5', background: '#fff', color: '#111827', fontSize: 15, fontWeight: 900, fontFamily: 'inherit', cursor: loading ? 'not-allowed' : 'pointer' }}
                >
                  Atrás
                </button>
              )}

              {step < 4 ? (
                <button
                  type="button"
                  onClick={goNext}
                  disabled={loading}
                  style={{ width: '100%', padding: '14px', borderRadius: 18, border: 'none', background: '#0071e3', color: '#fff', fontSize: 15, fontWeight: 950, fontFamily: 'inherit', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 14px 30px rgba(0,113,227,0.20)' }}
                >
                  Continuar
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  style={{ width: '100%', padding: '14px', borderRadius: 18, border: 'none', background: loading ? '#aeaeb2' : '#0071e3', color: '#fff', fontSize: 15, fontWeight: 950, fontFamily: 'inherit', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 14px 30px rgba(0,113,227,0.20)' }}
                >
                  {loading ? 'Creando cuenta...' : 'Crear cuenta profesional'}
                </button>
              )}
            </div>
          </form>

          <button
            type="button"
            onClick={() => navigate('/profesional/login')}
            style={{ width: '100%', marginTop: 12, padding: '13px', borderRadius: 18, border: '0.5px solid #d0d0d5', background: '#fff', color: '#0071e3', fontSize: 14, fontWeight: 900, fontFamily: 'inherit', cursor: 'pointer' }}
          >
            Ya tengo cuenta
          </button>
        </section>
      </div>
    </div>
  );
}

function ReservationsSection() {
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [reservationView, setReservationView] = useState('today');
  const [expandedBookingId, setExpandedBookingId] = useState(null);
  const [archivedSearch, setArchivedSearch] = useState('');
  const [archivedStatus, setArchivedStatus] = useState('all');
  const [archivedService, setArchivedService] = useState('all');
  const [archivedFromDate, setArchivedFromDate] = useState('');
  const [archivedToDate, setArchivedToDate] = useState('');
  const [paymentDrafts, setPaymentDrafts] = useState({});

  let storedProfessional = {};

  try {
    storedProfessional = JSON.parse(localStorage.getItem('tuagendaya_professional')) || {};
  } catch {
    storedProfessional = {};
  }

  const businessName = storedProfessional.businessName || storedProfessional.business_name || storedProfessional.name || '';

  const fetchBookings = useCallback((showLoading = false) => {
    const token = localStorage.getItem('tuagendaya_token');

    if (showLoading) {
      setLoadingBookings(true);
    }

    return fetch(`${API_BASE}/bookings/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        const nextBookings = Array.isArray(data.bookings) ? data.bookings : [];
        setBookings(nextBookings);
      })
      .catch(() => {
        if (showLoading) {
          setBookings([]);
        }
      })
      .finally(() => {
        if (showLoading) {
          setLoadingBookings(false);
        }
      });
  }, []);

  useEffect(() => {
    fetchBookings(true);

    const intervalId = window.setInterval(() => {
      fetchBookings(false);
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [fetchBookings]);

  const handleAction = async (id, action) => {
    setActionLoading(`${id}-${action}`);
    const token = localStorage.getItem('tuagendaya_token');

    try {
      await fetch(`${API_BASE}/bookings/${id}/${action}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });

      fetchBookings(false);
    } catch {
      // no-op
    } finally {
      setActionLoading(null);
    }
  };

  const updatePaymentDraft = (bookingId, field, value) => {
    setPaymentDrafts((current) => ({
      ...current,
      [bookingId]: {
        ...(current[bookingId] || {}),
        [field]: value,
      },
    }));
  };

  const getPaymentDraft = (booking) => {
    const existing = paymentDrafts[booking.id] || {};

    return {
      paymentStatus: existing.paymentStatus ?? getBookingPaymentStatus(booking),
      paymentMethod: existing.paymentMethod ?? getBookingPaymentMethod(booking),
      amountPaid: existing.amountPaid ?? getBookingAmountPaid(booking),
    };
  };

  const handleSavePayment = async (booking) => {
    const draft = getPaymentDraft(booking);
    const token = localStorage.getItem('tuagendaya_token');

    setActionLoading(`${booking.id}-payment`);

    try {
      await fetch(`${API_BASE}/bookings/${booking.id}/payment`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentStatus: draft.paymentStatus,
          paymentMethod: draft.paymentMethod,
          amountPaid: draft.amountPaid === '' ? null : Number(draft.amountPaid),
        }),
      });

      await fetchBookings(false);
    } catch {
      // no-op
    } finally {
      setActionLoading(null);
    }
  };

  const statusColor = { pending: '#ff9f0a', confirmed: '#30d158', completed: '#5e5ce6', cancelled: '#ff453a' };
  const statusLabel = { pending: 'Pendiente', confirmed: 'Confirmada', completed: 'Completada', cancelled: 'Cancelada' };
  const statusBg = { pending: '#fff8ee', confirmed: '#edfff3', completed: '#f1f0ff', cancelled: '#fff2f2' };

  const getLocalDateKey = (date = new Date()) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const getBookingDateKey = (booking) => {
    const value = getBookingDateValue(booking);
    if (!value) return '';

    const raw = String(value).trim();

    const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    }

    const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (slashMatch) {
      const [, day, month, year] = slashMatch;
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return getLocalDateKey(parsed);
    }

    return '';
  };

  const getBookingSortValue = (booking) => {
    const dateKey = getBookingDateKey(booking) || '9999-12-31';
    const time = formatTime(booking.startTime ?? booking.start_time) || '00:00';
    return `${dateKey} ${time}`;
  };

  const todayKey = getLocalDateKey();

  const todayBookings = bookings
    .filter((booking) => getBookingDateKey(booking) === todayKey)
    .sort((a, b) => getBookingSortValue(a).localeCompare(getBookingSortValue(b)));

  const upcomingBookings = bookings
    .filter((booking) => {
      const key = getBookingDateKey(booking);
      return key && key > todayKey;
    })
    .sort((a, b) => getBookingSortValue(a).localeCompare(getBookingSortValue(b)));

  const rawArchivedBookings = bookings
    .filter((booking) => {
      const key = getBookingDateKey(booking);
      return !key || key < todayKey;
    })
    .sort((a, b) => getBookingSortValue(b).localeCompare(getBookingSortValue(a)));

  const archivedServiceOptions = Array.from(
    new Set(
      rawArchivedBookings
        .map((booking) => String(booking.serviceName ?? booking.service_name ?? '').trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b, 'es'));

  const archivedBookings = rawArchivedBookings.filter((booking) => {
    const dateKey = getBookingDateKey(booking);
    const status = String(booking.status || '').trim();
    const serviceName = String(booking.serviceName ?? booking.service_name ?? '').trim();
    const searchText = normalizeSearchText([
      booking.clientName ?? booking.client_name,
      booking.clientPhone ?? booking.client_phone,
      serviceName,
      booking.staffName ?? booking.staff_name,
      booking.comment,
    ].filter(Boolean).join(' '));

    const searchOk = !archivedSearch.trim() || searchText.includes(normalizeSearchText(archivedSearch));
    const statusOk = archivedStatus === 'all' || status === archivedStatus;
    const serviceOk = archivedService === 'all' || serviceName === archivedService;
    const fromOk = !archivedFromDate || (dateKey && dateKey >= archivedFromDate);
    const toOk = !archivedToDate || (dateKey && dateKey <= archivedToDate);

    return searchOk && statusOk && serviceOk && fromOk && toOk;
  });

  const clearArchivedFilters = () => {
    setArchivedSearch('');
    setArchivedStatus('all');
    setArchivedService('all');
    setArchivedFromDate('');
    setArchivedToDate('');
  };

  const hasArchivedFilters =
    archivedSearch.trim() ||
    archivedStatus !== 'all' ||
    archivedService !== 'all' ||
    archivedFromDate ||
    archivedToDate;

  const visibleBookings =
    reservationView === 'upcoming'
      ? upcomingBookings
      : reservationView === 'archived'
        ? archivedBookings
        : todayBookings;

  const pendingCount = todayBookings.filter((b) => b.status === 'pending').length;
  const confirmedCount = todayBookings.filter((b) => b.status === 'confirmed').length;
  const completedCount = todayBookings.filter((b) => b.status === 'completed').length;
  const cancelledCount = todayBookings.filter((b) => b.status === 'cancelled').length;

  const clientStatsMap = new Map();

  bookings.forEach((booking) => {
    const clientName = String(booking.clientName ?? booking.client_name ?? '').trim();
    const clientPhone = String(booking.clientPhone ?? booking.client_phone ?? '').trim();

    if (!clientName && !clientPhone) return;

    const key = normalizeSearchText(clientPhone || clientName);
    const existing = clientStatsMap.get(key) || {
      name: clientName || 'Sin nombre',
      phone: clientPhone,
      count: 0,
    };

    existing.count += 1;

    if (!existing.name && clientName) existing.name = clientName;
    if (!existing.phone && clientPhone) existing.phone = clientPhone;

    clientStatsMap.set(key, existing);
  });

  const totalClientsCount = clientStatsMap.size;
  const frequentClient = Array.from(clientStatsMap.values()).sort((a, b) => b.count - a.count)[0] || null;
  const frequentClientLabel = frequentClient ? `${frequentClient.name} (${frequentClient.count})` : 'Sin datos';

  const reservationViewButtonStyle = (key) => ({
    flex: 1,
    padding: '11px 12px',
    borderRadius: 14,
    border: reservationView === key ? '1px solid #0071e3' : '0.5px solid #e2e2e7',
    background: reservationView === key ? '#eaf3ff' : '#fff',
    color: reservationView === key ? '#0071e3' : '#1a1a1a',
    fontSize: 13,
    fontWeight: 800,
    fontFamily: 'inherit',
    cursor: 'pointer',
    boxShadow: reservationView === key ? '0 1px 6px rgba(0,113,227,0.16)' : '0 1px 5px rgba(0,0,0,0.04)',
  });

  const currentTitle =
    reservationView === 'upcoming'
      ? 'Próximas reservas'
      : reservationView === 'archived'
        ? 'Reservas archivadas'
        : 'Reservas de hoy';

  const emptyText =
    reservationView === 'upcoming'
      ? 'No tenés próximas reservas.'
      : reservationView === 'archived'
        ? 'Todavía no hay reservas archivadas.'
        : 'No tenés reservas para hoy.';

  const getDateObjectFromKey = (dateKey) => {
    if (!dateKey || dateKey === 'sin-fecha') return null;
    const [year, month, day] = dateKey.split('-').map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  };

  const capitalizeFirst = (value) => {
    const text = String(value || '').trim();
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1);
  };

  const formatDayGroupTitle = (dateKey) => {
    if (!dateKey || dateKey === 'sin-fecha') return 'Sin fecha registrada';

    const date = getDateObjectFromKey(dateKey);
    if (!date) return 'Sin fecha registrada';

    const weekday = capitalizeFirst(date.toLocaleDateString('es-UY', { weekday: 'long' }));
    const month = date.toLocaleDateString('es-UY', { month: 'long' });
    const day = date.getDate();

    if (dateKey === todayKey) {
      return `Hoy · ${weekday} ${day} de ${month}`;
    }

    return `${weekday} ${day} de ${month}`;
  };

  const formatMonthGroupTitle = (monthKey) => {
    if (!monthKey || monthKey === 'sin-fecha') return 'Sin fecha';

    const [year, month] = monthKey.split('-').map(Number);
    if (!year || !month) return 'Sin fecha';

    const date = new Date(year, month - 1, 1);
    const monthName = capitalizeFirst(date.toLocaleDateString('es-UY', { month: 'long' }));

    return `${monthName} ${year}`;
  };

  const visibleBookingItems = [];
  let lastMonthKey = null;
  let lastDateKey = null;

  visibleBookings.forEach((booking) => {
    const dateKey = getBookingDateKey(booking) || 'sin-fecha';
    const monthKey = dateKey === 'sin-fecha' ? 'sin-fecha' : dateKey.slice(0, 7);

    if (monthKey !== lastMonthKey) {
      visibleBookingItems.push({
        type: 'month-header',
        key: `month-${reservationView}-${monthKey}`,
        monthKey,
        title: formatMonthGroupTitle(monthKey),
      });
      lastMonthKey = monthKey;
      lastDateKey = null;
    }

    if (dateKey !== lastDateKey) {
      visibleBookingItems.push({
        type: 'date-header',
        key: `date-${reservationView}-${dateKey}`,
        dateKey,
        title: formatDayGroupTitle(dateKey),
        count: visibleBookings.filter((item) => (getBookingDateKey(item) || 'sin-fecha') === dateKey).length,
      });
      lastDateKey = dateKey;
    }

    visibleBookingItems.push({
      type: 'booking',
      key: `booking-${booking.id}`,
      booking,
    });
  });

  return (
    <>
      {!loadingBookings && (
        <div style={{ background: '#fff', borderRadius: 22, padding: '18px 20px', marginBottom: 16, boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#1a1a1a' }}>Resumen del negocio</div>
              <div style={{ fontSize: 12, color: '#8e8e93', fontWeight: 600, marginTop: 3 }}>
                Vista rápida del día, próximas reservas y clientes.
              </div>
            </div>
            <div style={{ fontSize: 11, color: '#8e8e93', fontWeight: 800, whiteSpace: 'nowrap' }}>
              Actualiza cada 5 s
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
            <div style={{ background: '#f2f2f7', borderRadius: 16, padding: '14px 16px', border: '0.5px solid #e8e8ed' }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#1a1a1a' }}>{todayBookings.length}</div>
              <div style={{ fontSize: 12, color: '#8e8e93', marginTop: 2, fontWeight: 700 }}>Reservas hoy</div>
            </div>

            <div style={{ background: '#edfff3', borderRadius: 16, padding: '14px 16px' }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#30d158' }}>{confirmedCount}</div>
              <div style={{ fontSize: 12, color: '#8e8e93', marginTop: 2, fontWeight: 700 }}>Confirmadas</div>
            </div>

            <div style={{ background: '#fff2f2', borderRadius: 16, padding: '14px 16px' }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#ff453a' }}>{cancelledCount}</div>
              <div style={{ fontSize: 12, color: '#8e8e93', marginTop: 2, fontWeight: 700 }}>Canceladas</div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <button type="button" onClick={() => setReservationView('today')} style={reservationViewButtonStyle('today')}>
          Hoy ({todayBookings.length})
        </button>
        <button type="button" onClick={() => setReservationView('upcoming')} style={reservationViewButtonStyle('upcoming')}>
          Próximas ({upcomingBookings.length})
        </button>
        <button type="button" onClick={() => setReservationView('archived')} style={reservationViewButtonStyle('archived')}>
          Archivadas ({rawArchivedBookings.length})
        </button>
      </div>

      <div style={{ background: '#fff', borderRadius: 20, padding: '20px 24px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a' }}>{currentTitle}</div>
            <div style={{ fontSize: 11, color: '#8e8e93', fontWeight: 600, marginTop: 3 }}>
              Las reservas se agrupan por mes y fecha, y a las 00:00 pasan automáticamente a Archivadas.
            </div>
          </div>
          <div style={{ fontSize: 11, color: '#8e8e93', fontWeight: 600, whiteSpace: 'nowrap' }}>Actualización automática cada 5 s</div>
        </div>

        {reservationView === 'archived' && !loadingBookings && (
          <div
            style={{
              background: '#f7f7fb',
              border: '0.5px solid #e4e4ea',
              borderRadius: 18,
              padding: 14,
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 900, color: '#1a1a1a' }}>Buscar en archivadas</div>
                <div style={{ fontSize: 11, color: '#8e8e93', fontWeight: 700, marginTop: 2 }}>
                  Filtrá por cliente, fecha, servicio o estado.
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => exportBookingsToCsv(archivedBookings, 'reservas-archivadas-tuagendaya.csv')}
                  disabled={archivedBookings.length === 0}
                  style={{
                    border: 'none',
                    background: archivedBookings.length === 0 ? '#f2f2f7' : '#0071e3',
                    color: archivedBookings.length === 0 ? '#8e8e93' : '#fff',
                    borderRadius: 999,
                    padding: '8px 12px',
                    fontSize: 12,
                    fontWeight: 900,
                    fontFamily: 'inherit',
                    cursor: archivedBookings.length === 0 ? 'not-allowed' : 'pointer',
                    boxShadow: archivedBookings.length === 0 ? 'none' : '0 1px 5px rgba(0,113,227,0.18)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Exportar CSV
                </button>

                {hasArchivedFilters && (
                  <button
                    type="button"
                    onClick={clearArchivedFilters}
                    style={{
                      border: 'none',
                      background: '#fff',
                      color: '#0071e3',
                      borderRadius: 999,
                      padding: '8px 12px',
                      fontSize: 12,
                      fontWeight: 900,
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                      boxShadow: '0 1px 5px rgba(0,0,0,0.05)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Limpiar
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1.3fr) repeat(4, minmax(120px, 1fr))', gap: 10 }}>
              <input
                value={archivedSearch}
                onChange={(e) => setArchivedSearch(e.target.value)}
                placeholder="Buscar cliente, teléfono o profesional"
                style={{
                  ...inputStyle,
                  margin: 0,
                  background: '#fff',
                  borderRadius: 14,
                  fontSize: 13,
                  padding: '11px 12px',
                }}
              />

              <DatePickerField
                value={archivedFromDate}
                onChange={setArchivedFromDate}
                placeholder="Desde"
              />

              <DatePickerField
                value={archivedToDate}
                onChange={setArchivedToDate}
                placeholder="Hasta"
              />

              <select
                value={archivedStatus}
                onChange={(e) => setArchivedStatus(e.target.value)}
                style={{
                  ...inputStyle,
                  margin: 0,
                  background: '#fff',
                  borderRadius: 14,
                  fontSize: 13,
                  padding: '11px 12px',
                }}
              >
                <option value="all">Todos los estados</option>
                <option value="pending">Pendientes</option>
                <option value="confirmed">Confirmadas</option>
                <option value="completed">Completadas</option>
                <option value="cancelled">Canceladas</option>
              </select>

              <select
                value={archivedService}
                onChange={(e) => setArchivedService(e.target.value)}
                style={{
                  ...inputStyle,
                  margin: 0,
                  background: '#fff',
                  borderRadius: 14,
                  fontSize: 13,
                  padding: '11px 12px',
                }}
              >
                <option value="all">Todos los servicios</option>
                {archivedServiceOptions.map((service) => (
                  <option key={service} value={service}>{service}</option>
                ))}
              </select>
            </div>

            <div style={{ fontSize: 11, color: '#8e8e93', fontWeight: 800, marginTop: 10 }}>
              Mostrando {archivedBookings.length} de {rawArchivedBookings.length} reservas archivadas.
            </div>
          </div>
        )}

        {loadingBookings ? (
          <div style={{ textAlign: 'center', color: '#aeaeb2', padding: 32 }}>Cargando reservas...</div>
        ) : visibleBookings.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#aeaeb2', padding: 32 }}>
            <div style={{ fontWeight: 500 }}>{emptyText}</div>
          </div>
        ) : (
          visibleBookingItems.map((item) => {
            if (item.type === 'month-header') {
              return (
                <div
                  key={item.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    padding: '10px 4px 8px',
                    marginTop: 4,
                    marginBottom: 6,
                    borderBottom: '0.5px solid #f0f0f0',
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 900, color: '#1a1a1a' }}>{item.title}</div>
                  <div style={{ fontSize: 11, color: '#8e8e93', fontWeight: 800 }}>
                    {item.monthKey === 'sin-fecha' ? 'Sin fecha' : 'Archivo por mes'}
                  </div>
                </div>
              );
            }

            if (item.type === 'date-header') {
              return (
                <div
                  key={item.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    background: '#f5f5f7',
                    borderRadius: 14,
                    padding: '9px 12px',
                    marginBottom: 8,
                    marginTop: 8,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 900, color: '#1a1a1a' }}>{item.title}</div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#8e8e93' }}>
                    {item.count} {item.count === 1 ? 'turno' : 'turnos'}
                  </div>
                </div>
              );
            }

            const b = item.booking;
            const isPending = b.status === 'pending';
            const isConfirmed = b.status === 'confirmed';
            const isCompleted = b.status === 'completed';
            const isCancelled = b.status === 'cancelled';
            const isArchivedView = reservationView === 'archived';
            const dateStr = formatDate(getBookingDateValue(b));
            const timeStr = formatTime(b.startTime ?? b.start_time);
            const endStr = formatTime(b.endTime ?? b.end_time);
            const clientName = b.clientName ?? b.client_name;
            const clientPhone = b.clientPhone ?? b.client_phone;
            const serviceName = b.serviceName ?? b.service_name;
            const serviceDuration = b.serviceDurationMinutes ?? b.service_duration_minutes;
            const servicePrice = b.servicePrice ?? b.service_price;
            const staffName = b.staffName ?? b.staff_name;
            const paymentDraft = getPaymentDraft(b);
            const currentPaymentStatus = getBookingPaymentStatus(b);
            const currentPaymentMethod = getBookingPaymentMethod(b);
            const currentAmountPaid = getBookingAmountPaid(b);
            const paidAmountNumber = currentAmountPaid === '' ? 0 : Number(currentAmountPaid);
            const pendingAmountNumber = Math.max(Number(servicePrice || 0) - (Number.isNaN(paidAmountNumber) ? 0 : paidAmountNumber), 0);
            const whatsappMessage = buildClientWhatsAppMessage({
              clientName,
              businessName,
              serviceName,
              staffName,
              dateStr,
              timeStr,
              endStr,
            });
            const whatsappUrl = buildWhatsAppUrl(clientPhone, whatsappMessage);
            const canSendWhatsApp = Boolean(clientPhone && whatsappUrl && !isCancelled);
            const canConfirm = !isArchivedView && isPending;
            const canComplete = !isArchivedView && (isPending || isConfirmed);
            const canCancel = !isArchivedView && !isCancelled && !isCompleted;

            const isExpanded = expandedBookingId === b.id;
            const mainTime = timeStr ? `${timeStr}${endStr ? ` - ${endStr}` : ''}` : 'Sin hora';
            const mainService = serviceName || 'Servicio no especificado';

            return (
              <div
                key={b.id}
                style={{
                  border: `1px solid ${isExpanded ? '#0071e3' : isCancelled ? '#ffe0e0' : '#e8e8ed'}`,
                  borderRadius: 18,
                  marginBottom: 10,
                  background: isCancelled ? '#fffafa' : isCompleted ? '#fbfbff' : '#fff',
                  opacity: isCancelled ? 0.78 : 1,
                  overflow: 'hidden',
                  boxShadow: isExpanded ? '0 8px 24px rgba(0,113,227,0.10)' : '0 1px 8px rgba(0,0,0,0.04)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setExpandedBookingId(isExpanded ? null : b.id)}
                  style={{
                    width: '100%',
                    border: 'none',
                    background: 'transparent',
                    padding: '14px 16px',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    textAlign: 'left',
                    display: 'grid',
                    gridTemplateColumns: '96px minmax(0, 1fr) auto',
                    gap: 12,
                    alignItems: 'center',
                  }}
                >
                  <div
                    style={{
                      borderRadius: 14,
                      background: '#f2f2f7',
                      padding: '9px 8px',
                      textAlign: 'center',
                      color: '#1a1a1a',
                    }}
                  >
                    <div style={{ fontSize: 15, fontWeight: 900, lineHeight: 1 }}>{timeStr || '--:--'}</div>
                    {endStr && <div style={{ fontSize: 10, color: '#8e8e93', fontWeight: 700, marginTop: 4 }}>hasta {endStr}</div>}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 900,
                          fontSize: 14,
                          color: '#1a1a1a',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {clientName || 'Cliente sin nombre'}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: '#6e6e73',
                        marginTop: 4,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {mainService}{staffName ? ` · ${staffName}` : ''}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: '#8e8e93',
                        marginTop: 3,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {dateStr}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        flexShrink: 0,
                        whiteSpace: 'nowrap',
                        color: statusColor[b.status] || '#6e6e73',
                        background: statusBg[b.status] || '#f2f2f7',
                        padding: '5px 10px',
                        borderRadius: 999,
                      }}
                    >
                      {statusLabel[b.status] || b.status}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 850,
                        flexShrink: 0,
                        whiteSpace: 'nowrap',
                        color: paymentStatusColor[currentPaymentStatus] || '#6e6e73',
                        background: paymentStatusBg[currentPaymentStatus] || '#f2f2f7',
                        padding: '5px 10px',
                        borderRadius: 999,
                      }}
                    >
                      {paymentStatusLabel[currentPaymentStatus] || currentPaymentStatus}
                    </span>
                    <span style={{ color: '#8e8e93', fontSize: 18, fontWeight: 800, transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.18s ease' }}>
                      ⌄
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div style={{ padding: '0 16px 16px 16px' }}>
                    <div
                      style={{
                        borderTop: '0.5px solid #eeeeef',
                        paddingTop: 14,
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                        gap: 10,
                      }}
                    >
                      <div style={{ background: '#fafafa', borderRadius: 14, padding: 12 }}>
                        <div style={{ fontSize: 11, color: '#8e8e93', fontWeight: 800, marginBottom: 4 }}>Cliente</div>
                        <div style={{ fontSize: 13, color: '#1a1a1a', fontWeight: 800 }}>{clientName || 'Sin nombre'}</div>
                      </div>

                      <div style={{ background: '#fafafa', borderRadius: 14, padding: 12 }}>
                        <div style={{ fontSize: 11, color: '#8e8e93', fontWeight: 800, marginBottom: 4 }}>Teléfono</div>
                        <div style={{ fontSize: 13, color: '#1a1a1a', fontWeight: 800 }}>{clientPhone || 'Sin teléfono'}</div>
                      </div>

                      <div style={{ background: '#fafafa', borderRadius: 14, padding: 12 }}>
                        <div style={{ fontSize: 11, color: '#8e8e93', fontWeight: 800, marginBottom: 4 }}>Servicio</div>
                        <div style={{ fontSize: 13, color: '#1a1a1a', fontWeight: 800 }}>{mainService}</div>
                        {(serviceDuration || servicePrice) && (
                          <div style={{ fontSize: 12, color: '#0071e3', fontWeight: 700, marginTop: 4 }}>
                            {serviceDuration ? `${serviceDuration} min` : ''}{serviceDuration && servicePrice ? ' · ' : ''}{servicePrice ? `$${servicePrice}` : ''}
                          </div>
                        )}
                      </div>

                      <div style={{ background: '#fafafa', borderRadius: 14, padding: 12 }}>
                        <div style={{ fontSize: 11, color: '#8e8e93', fontWeight: 800, marginBottom: 4 }}>Profesional</div>
                        <div style={{ fontSize: 13, color: '#1a1a1a', fontWeight: 800 }}>{staffName || 'Sin asignar'}</div>
                      </div>

                      <div style={{ background: '#fafafa', borderRadius: 14, padding: 12 }}>
                        <div style={{ fontSize: 11, color: '#8e8e93', fontWeight: 800, marginBottom: 4 }}>Fecha</div>
                        <div style={{ fontSize: 13, color: '#1a1a1a', fontWeight: 800 }}>{dateStr}</div>
                      </div>

                      <div style={{ background: '#fafafa', borderRadius: 14, padding: 12 }}>
                        <div style={{ fontSize: 11, color: '#8e8e93', fontWeight: 800, marginBottom: 4 }}>Hora</div>
                        <div style={{ fontSize: 13, color: '#1a1a1a', fontWeight: 800 }}>{mainTime}</div>
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: 12,
                        padding: 14,
                        borderRadius: 18,
                        border: '0.5px solid #e6eef8',
                        background: '#f7fbff',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                        <div>
                          <div style={{ fontSize: 13, color: '#1a1a1a', fontWeight: 950 }}>Pago y caja</div>
                          <div style={{ fontSize: 11, color: '#6e6e73', fontWeight: 700, marginTop: 3 }}>
                            Registrá cobro, método de pago y montos para el cierre diario.
                          </div>
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: paymentStatusColor[currentPaymentStatus] || '#6e6e73',
                            background: paymentStatusBg[currentPaymentStatus] || '#fff',
                            padding: '6px 10px',
                            borderRadius: 999,
                            fontWeight: 900,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {paymentStatusLabel[currentPaymentStatus] || currentPaymentStatus}
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                          gap: 10,
                          marginBottom: 12,
                        }}
                      >
                        <div style={{ background: '#fff', borderRadius: 14, padding: 11, border: '0.5px solid #edf0f5' }}>
                          <div style={{ fontSize: 10, color: '#8e8e93', fontWeight: 900, marginBottom: 4 }}>PRECIO</div>
                          <div style={{ fontSize: 14, color: '#1a1a1a', fontWeight: 950 }}>{formatMoney(servicePrice || 0)}</div>
                        </div>
                        <div style={{ background: '#fff', borderRadius: 14, padding: 11, border: '0.5px solid #edf0f5' }}>
                          <div style={{ fontSize: 10, color: '#8e8e93', fontWeight: 900, marginBottom: 4 }}>COBRADO</div>
                          <div style={{ fontSize: 14, color: '#188038', fontWeight: 950 }}>{formatMoney(currentAmountPaid || 0)}</div>
                        </div>
                        <div style={{ background: '#fff', borderRadius: 14, padding: 11, border: '0.5px solid #edf0f5' }}>
                          <div style={{ fontSize: 10, color: '#8e8e93', fontWeight: 900, marginBottom: 4 }}>PENDIENTE</div>
                          <div style={{ fontSize: 14, color: pendingAmountNumber > 0 ? '#ff9f0a' : '#188038', fontWeight: 950 }}>{formatMoney(pendingAmountNumber)}</div>
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))',
                          gap: 8,
                          alignItems: 'end',
                        }}
                      >
                        <label style={{ display: 'block' }}>
                          <span style={{ display: 'block', fontSize: 11, color: '#6e6e73', fontWeight: 850, marginBottom: 5 }}>Estado de pago</span>
                          <select
                            value={paymentDraft.paymentStatus}
                            onChange={(event) => updatePaymentDraft(b.id, 'paymentStatus', event.target.value)}
                            style={{ ...inputStyle, borderRadius: 13, padding: '10px 11px', fontSize: 13 }}
                          >
                            {PAYMENT_STATUS_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </label>

                        <label style={{ display: 'block' }}>
                          <span style={{ display: 'block', fontSize: 11, color: '#6e6e73', fontWeight: 850, marginBottom: 5 }}>Método</span>
                          <select
                            value={paymentDraft.paymentMethod}
                            onChange={(event) => updatePaymentDraft(b.id, 'paymentMethod', event.target.value)}
                            style={{ ...inputStyle, borderRadius: 13, padding: '10px 11px', fontSize: 13 }}
                          >
                            {PAYMENT_METHOD_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </label>

                        <label style={{ display: 'block' }}>
                          <span style={{ display: 'block', fontSize: 11, color: '#6e6e73', fontWeight: 850, marginBottom: 5 }}>Monto cobrado</span>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={paymentDraft.amountPaid}
                            onChange={(event) => updatePaymentDraft(b.id, 'amountPaid', event.target.value)}
                            placeholder="0"
                            style={{ ...inputStyle, borderRadius: 13, padding: '10px 11px', fontSize: 13 }}
                          />
                        </label>

                        <button
                          type="button"
                          onClick={() => handleSavePayment(b)}
                          disabled={actionLoading === `${b.id}-payment`}
                          style={{
                            border: 'none',
                            borderRadius: 13,
                            padding: '11px 13px',
                            background: '#0071e3',
                            color: '#fff',
                            fontSize: 13,
                            fontWeight: 900,
                            fontFamily: 'inherit',
                            cursor: 'pointer',
                            opacity: actionLoading === `${b.id}-payment` ? 0.65 : 1,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {actionLoading === `${b.id}-payment` ? 'Guardando...' : 'Guardar'}
                        </button>
                      </div>
                    </div>

                    {b.comment && (
                      <div style={{ fontSize: 12, color: '#6e6e73', fontStyle: 'italic', marginTop: 10, padding: 12, background: '#fafafa', borderRadius: 14 }}>
                        "{b.comment}"
                      </div>
                    )}

                    {canSendWhatsApp && (
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          textDecoration: 'none',
                          width: '100%',
                          padding: '11px 12px',
                          borderRadius: 14,
                          border: '0.5px solid #c8f2d3',
                          background: '#edfff3',
                          color: '#188038',
                          fontSize: 13,
                          fontWeight: 900,
                          fontFamily: 'inherit',
                          boxSizing: 'border-box',
                          marginTop: 12,
                          marginBottom: !isArchivedView && (canConfirm || canComplete || canCancel) ? 10 : 0,
                        }}
                      >
                        Enviar WhatsApp al cliente
                      </a>
                    )}

                    {!isArchivedView && (canConfirm || canComplete || canCancel) && (
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: `repeat(${[canConfirm, canComplete, canCancel].filter(Boolean).length}, minmax(0, 1fr))`,
                          gap: 8,
                          marginTop: 10,
                        }}
                      >
                        {canConfirm && (
                          <button
                            onClick={() => handleAction(b.id, 'confirm')}
                            disabled={actionLoading === `${b.id}-confirm`}
                            style={{
                              padding: '10px 0',
                              borderRadius: 12,
                              border: 'none',
                              background: '#30d158',
                              color: '#fff',
                              fontSize: 13,
                              fontWeight: 800,
                              fontFamily: 'inherit',
                              cursor: 'pointer',
                              opacity: actionLoading === `${b.id}-confirm` ? 0.6 : 1,
                            }}
                          >
                            {actionLoading === `${b.id}-confirm` ? '...' : 'Confirmar'}
                          </button>
                        )}

                        {canComplete && (
                          <button
                            onClick={() => handleAction(b.id, 'complete')}
                            disabled={actionLoading === `${b.id}-complete`}
                            style={{
                              padding: '10px 0',
                              borderRadius: 12,
                              border: 'none',
                              background: '#5e5ce6',
                              color: '#fff',
                              fontSize: 13,
                              fontWeight: 800,
                              fontFamily: 'inherit',
                              cursor: 'pointer',
                              opacity: actionLoading === `${b.id}-complete` ? 0.6 : 1,
                            }}
                          >
                            {actionLoading === `${b.id}-complete` ? '...' : 'Completar'}
                          </button>
                        )}

                        {canCancel && (
                          <button
                            onClick={() => handleAction(b.id, 'cancel')}
                            disabled={actionLoading === `${b.id}-cancel`}
                            style={{
                              padding: '10px 0',
                              borderRadius: 12,
                              border: 'none',
                              background: '#ff453a',
                              color: '#fff',
                              fontSize: 13,
                              fontWeight: 800,
                              fontFamily: 'inherit',
                              cursor: 'pointer',
                              opacity: actionLoading === `${b.id}-cancel` ? 0.6 : 1,
                            }}
                          >
                            {actionLoading === `${b.id}-cancel` ? '...' : 'Cancelar'}
                          </button>
                        )}
                      </div>
                    )}

                    {isArchivedView && (
                      <div style={{ fontSize: 11, color: '#8e8e93', fontWeight: 700, marginTop: 12, textAlign: 'center' }}>
                        Registro archivado. No se muestra como turno activo del día.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </>
  );
}


function CashSection() {
  const [bookings, setBookings] = useState([]);
  const [closures, setClosures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [closuresLoading, setClosuresLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getLocalDateKeyValue());
  const [closeLoading, setCloseLoading] = useState(false);
  const [closeMessage, setCloseMessage] = useState('');
  const [expandedClosureId, setExpandedClosureId] = useState(null);

  const statusLabel = { pending: 'Pendiente', confirmed: 'Confirmada', completed: 'Completada', cancelled: 'Cancelada' };

  const getToken = () => localStorage.getItem('tuagendaya_token');

  const fetchBookings = useCallback((showLoading = false) => {
    const token = getToken();

    if (showLoading) {
      setLoading(true);
    }

    return fetch(`${API_BASE}/bookings/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setBookings(Array.isArray(data.bookings) ? data.bookings : []);
      })
      .catch(() => {
        if (showLoading) setBookings([]);
      })
      .finally(() => {
        if (showLoading) setLoading(false);
      });
  }, []);

  const fetchClosures = useCallback((showLoading = false) => {
    const token = getToken();

    if (showLoading) {
      setClosuresLoading(true);
    }

    return fetch(`${API_BASE}/bookings/cash-closures`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setClosures(Array.isArray(data.closures) ? data.closures : []);
      })
      .catch(() => {
        if (showLoading) setClosures([]);
      })
      .finally(() => {
        if (showLoading) setClosuresLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchBookings(true);
    fetchClosures(true);
    const intervalId = window.setInterval(() => {
      fetchBookings(false);
      fetchClosures(false);
    }, 5000);
    return () => window.clearInterval(intervalId);
  }, [fetchBookings, fetchClosures]);

  const dayBookings = bookings
    .filter((booking) => getDateKeyFromValue(getBookingDateValue(booking)) === selectedDate)
    .sort((a, b) => {
      const aTime = formatTime(a.startTime ?? a.start_time) || '00:00';
      const bTime = formatTime(b.startTime ?? b.start_time) || '00:00';
      return aTime.localeCompare(bTime);
    });

  const activeBookings = dayBookings.filter((booking) => booking.status !== 'cancelled');
  const completedBookings = dayBookings.filter((booking) => booking.status === 'completed');
  const cancelledBookings = dayBookings.filter((booking) => booking.status === 'cancelled');
  const pendingBookings = dayBookings.filter((booking) => booking.status === 'pending' || booking.status === 'confirmed');

  const getServicePrice = (booking) => Number(booking.servicePrice ?? booking.service_price ?? 0) || 0;
  const getPaidAmount = (booking) => {
    const value = Number(booking.amountPaid ?? booking.amount_paid ?? 0);
    return Number.isNaN(value) ? 0 : value;
  };

  const totalGenerated = activeBookings.reduce((sum, booking) => sum + getServicePrice(booking), 0);
  const totalCollected = activeBookings.reduce((sum, booking) => sum + getPaidAmount(booking), 0);
  const totalPending = activeBookings.reduce((sum, booking) => sum + Math.max(getServicePrice(booking) - getPaidAmount(booking), 0), 0);

  const byMethod = PAYMENT_METHOD_OPTIONS.map((method) => {
    const total = activeBookings
      .filter((booking) => getBookingPaymentMethod(booking) === method.value)
      .reduce((sum, booking) => sum + getPaidAmount(booking), 0);

    return { ...method, total };
  });

  const serviceMap = new Map();
  activeBookings.forEach((booking) => {
    const serviceName = String(booking.serviceName ?? booking.service_name ?? 'Servicio sin nombre').trim() || 'Servicio sin nombre';
    const current = serviceMap.get(serviceName) || {
      name: serviceName,
      count: 0,
      generated: 0,
      collected: 0,
    };

    current.count += 1;
    current.generated += getServicePrice(booking);
    current.collected += getPaidAmount(booking);
    serviceMap.set(serviceName, current);
  });

  const servicesSummary = Array.from(serviceMap.values()).sort((a, b) => b.generated - a.generated);

  const existingClosure = closures.find((closure) => getDateKeyFromValue(closure.closureDate ?? closure.closure_date) === selectedDate);

  const cashCardStyle = (bg = '#fff') => ({
    background: bg,
    border: '0.5px solid #ececf2',
    borderRadius: 18,
    padding: 16,
    boxShadow: '0 1px 7px rgba(0,0,0,0.045)',
  });

  const smallStatStyle = {
    fontSize: 12,
    color: '#8e8e93',
    fontWeight: 800,
    marginTop: 4,
  };

  const exportCashCsv = () => {
    const headers = [
      'Fecha',
      'Hora',
      'Cliente',
      'Telefono',
      'Servicio',
      'Profesional',
      'Estado reserva',
      'Estado pago',
      'Metodo pago',
      'Precio',
      'Cobrado',
      'Pendiente',
    ];

    const rows = dayBookings.map((booking) => {
      const price = getServicePrice(booking);
      const paid = getPaidAmount(booking);
      return [
        formatDate(getBookingDateValue(booking)),
        `${formatTime(booking.startTime ?? booking.start_time) || ''}${booking.endTime || booking.end_time ? ` - ${formatTime(booking.endTime ?? booking.end_time)}` : ''}`,
        booking.clientName ?? booking.client_name ?? '',
        booking.clientPhone ?? booking.client_phone ?? '',
        booking.serviceName ?? booking.service_name ?? '',
        booking.staffName ?? booking.staff_name ?? '',
        statusLabel[booking.status] || booking.status || '',
        paymentStatusLabel[getBookingPaymentStatus(booking)] || getBookingPaymentStatus(booking),
        paymentMethodLabel[getBookingPaymentMethod(booking)] || getBookingPaymentMethod(booking),
        price,
        paid,
        Math.max(price - paid, 0),
      ];
    });

    downloadCsvFile(`caja-${selectedDate}.csv`, headers, rows);
  };

  const closeCashDay = async () => {
    if (dayBookings.length === 0) {
      setCloseMessage('No hay citas para cerrar en esta fecha.');
      return;
    }

    const token = getToken();
    setCloseLoading(true);
    setCloseMessage('');

    try {
      const response = await fetch(`${API_BASE}/bookings/cash-closures`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ closureDate: selectedDate }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo cerrar la caja');
      }

      setCloseMessage(existingClosure ? 'Cierre actualizado correctamente.' : 'Caja cerrada correctamente.');
      await fetchClosures(false);
    } catch (error) {
      setCloseMessage(error.message || 'Error cerrando caja');
    } finally {
      setCloseLoading(false);
    }
  };

  const closureRows = closures
    .slice()
    .sort((a, b) => String(b.closureDate ?? b.closure_date ?? '').localeCompare(String(a.closureDate ?? a.closure_date ?? '')));

  const parseLocalDate = (dateValue) => {
    const key = getDateKeyFromValue(dateValue);
    if (!key) return null;
    const [year, month, day] = key.split('-').map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  };

  const selectedDateObject = parseLocalDate(selectedDate) || new Date();
  const startOfWeek = new Date(selectedDateObject);
  const weekDay = startOfWeek.getDay();
  const mondayOffset = weekDay === 0 ? -6 : 1 - weekDay;
  startOfWeek.setDate(startOfWeek.getDate() + mondayOffset);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const startOfMonth = new Date(selectedDateObject.getFullYear(), selectedDateObject.getMonth(), 1);
  const endOfMonth = new Date(selectedDateObject.getFullYear(), selectedDateObject.getMonth() + 1, 0, 23, 59, 59, 999);

  const getClosureDateObject = (closure) => parseLocalDate(closure.closureDate ?? closure.closure_date);
  const getClosureNumber = (closure, camelKey, snakeKey) => Number(closure?.[camelKey] ?? closure?.[snakeKey] ?? 0) || 0;

  const summarizeClosures = (items) => items.reduce((summary, closure) => {
    summary.days += 1;
    summary.bookings += getClosureNumber(closure, 'totalBookings', 'total_bookings');
    summary.completed += getClosureNumber(closure, 'completedBookings', 'completed_bookings');
    summary.cancelled += getClosureNumber(closure, 'cancelledBookings', 'cancelled_bookings');
    summary.generated += getClosureNumber(closure, 'totalGenerated', 'total_generated');
    summary.collected += getClosureNumber(closure, 'totalCollected', 'total_collected');
    summary.pending += getClosureNumber(closure, 'totalPending', 'total_pending');
    summary.cash += getClosureNumber(closure, 'cashTotal', 'cash_total');
    summary.transfer += getClosureNumber(closure, 'transferTotal', 'transfer_total');
    summary.card += getClosureNumber(closure, 'cardTotal', 'card_total');
    summary.other += getClosureNumber(closure, 'otherTotal', 'other_total');
    return summary;
  }, {
    days: 0,
    bookings: 0,
    completed: 0,
    cancelled: 0,
    generated: 0,
    collected: 0,
    pending: 0,
    cash: 0,
    transfer: 0,
    card: 0,
    other: 0,
  });

  const closuresThisWeek = closures.filter((closure) => {
    const date = getClosureDateObject(closure);
    return date && date >= startOfWeek && date <= endOfWeek;
  });

  const closuresThisMonth = closures.filter((closure) => {
    const date = getClosureDateObject(closure);
    return date && date >= startOfMonth && date <= endOfMonth;
  });

  const weeklySummary = summarizeClosures(closuresThisWeek);
  const monthlySummary = summarizeClosures(closuresThisMonth);


  const exportClosureRowsToCsv = (items, filename) => {
    const headers = [
      'Fecha',
      'Citas',
      'Completadas',
      'Canceladas',
      'Total generado',
      'Total cobrado',
      'Pendiente de cobro',
      'Efectivo',
      'Transferencia',
      'Tarjeta',
      'Otro',
    ];

    const rows = items
      .slice()
      .sort((a, b) => String(a.closureDate ?? a.closure_date ?? '').localeCompare(String(b.closureDate ?? b.closure_date ?? '')))
      .map((closure) => [
        formatDate(closure.closureDate ?? closure.closure_date),
        getClosureNumber(closure, 'totalBookings', 'total_bookings'),
        getClosureNumber(closure, 'completedBookings', 'completed_bookings'),
        getClosureNumber(closure, 'cancelledBookings', 'cancelled_bookings'),
        getClosureNumber(closure, 'totalGenerated', 'total_generated'),
        getClosureNumber(closure, 'totalCollected', 'total_collected'),
        getClosureNumber(closure, 'totalPending', 'total_pending'),
        getClosureNumber(closure, 'cashTotal', 'cash_total'),
        getClosureNumber(closure, 'transferTotal', 'transfer_total'),
        getClosureNumber(closure, 'cardTotal', 'card_total'),
        getClosureNumber(closure, 'otherTotal', 'other_total'),
      ]);

    downloadCsvFile(filename, headers, rows);
  };

  const exportWeeklyCashCsv = () => {
    exportClosureRowsToCsv(
      closuresThisWeek,
      `caja-semanal-${getDateKeyFromValue(startOfWeek)}-${getDateKeyFromValue(endOfWeek)}.csv`
    );
  };

  const exportMonthlyCashCsv = () => {
    const monthKey = `${selectedDateObject.getFullYear()}-${String(selectedDateObject.getMonth() + 1).padStart(2, '0')}`;
    exportClosureRowsToCsv(closuresThisMonth, `caja-mensual-${monthKey}.csv`);
  };

  const exportAllCashClosuresCsv = () => {
    exportClosureRowsToCsv(closures, 'historial-cierres-caja-tuagendaya.csv');
  };

  const periodSummaryCardStyle = {
    background: '#fff',
    borderRadius: 22,
    padding: '20px 22px',
    boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
    border: '0.5px solid #ececf2',
  };

  const periodMetricStyle = {
    background: '#f7f7fb',
    borderRadius: 16,
    padding: 12,
  };

  const renderPeriodSummary = (title, subtitle, summary) => (
    <div style={periodSummaryCardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 900, color: '#1a1a1a' }}>{title}</div>
          <div style={{ fontSize: 12, color: '#8e8e93', fontWeight: 750, marginTop: 3, lineHeight: 1.4 }}>{subtitle}</div>
        </div>
        <div style={{ padding: '6px 10px', borderRadius: 999, background: '#f2f7ff', color: '#0071e3', fontSize: 11, fontWeight: 950 }}>
          {summary.days} {summary.days === 1 ? 'cierre' : 'cierres'}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 9, marginBottom: 10 }}>
        <div style={periodMetricStyle}>
          <div style={{ fontSize: 10, color: '#8e8e93', fontWeight: 950 }}>Cobrado</div>
          <div style={{ fontSize: 16, color: '#188038', fontWeight: 950, marginTop: 4 }}>{formatMoney(summary.collected)}</div>
        </div>
        <div style={periodMetricStyle}>
          <div style={{ fontSize: 10, color: '#8e8e93', fontWeight: 950 }}>Generado</div>
          <div style={{ fontSize: 16, color: '#1a1a1a', fontWeight: 950, marginTop: 4 }}>{formatMoney(summary.generated)}</div>
        </div>
        <div style={periodMetricStyle}>
          <div style={{ fontSize: 10, color: '#8e8e93', fontWeight: 950 }}>Pendiente</div>
          <div style={{ fontSize: 16, color: '#ff9f0a', fontWeight: 950, marginTop: 4 }}>{formatMoney(summary.pending)}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
        <div style={{ background: '#fafafa', borderRadius: 14, padding: 10 }}><div style={{ fontSize: 10, color: '#8e8e93', fontWeight: 900 }}>Citas</div><div style={{ fontSize: 13, fontWeight: 950 }}>{summary.bookings}</div></div>
        <div style={{ background: '#fafafa', borderRadius: 14, padding: 10 }}><div style={{ fontSize: 10, color: '#8e8e93', fontWeight: 900 }}>Efectivo</div><div style={{ fontSize: 13, fontWeight: 950 }}>{formatMoney(summary.cash)}</div></div>
        <div style={{ background: '#fafafa', borderRadius: 14, padding: 10 }}><div style={{ fontSize: 10, color: '#8e8e93', fontWeight: 900 }}>Transfer.</div><div style={{ fontSize: 13, fontWeight: 950 }}>{formatMoney(summary.transfer)}</div></div>
        <div style={{ background: '#fafafa', borderRadius: 14, padding: 10 }}><div style={{ fontSize: 10, color: '#8e8e93', fontWeight: 900 }}>Tarjeta</div><div style={{ fontSize: 13, fontWeight: 950 }}>{formatMoney(summary.card)}</div></div>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
        {renderPeriodSummary(
          'Resumen semanal',
          `${formatDate(startOfWeek)} al ${formatDate(endOfWeek)}`,
          weeklySummary
        )}
        {renderPeriodSummary(
          'Resumen mensual',
          selectedDateObject.toLocaleDateString('es-UY', { month: 'long', year: 'numeric' }),
          monthlySummary
        )}
      </div>

      <div style={{ background: '#fff', borderRadius: 22, padding: '18px 22px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', border: '0.5px solid #ececf2' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 900, color: '#1a1a1a' }}>Exportar caja</div>
            <div style={{ fontSize: 12, color: '#8e8e93', fontWeight: 700, marginTop: 3, lineHeight: 1.45 }}>
              Descargá cierres semanales, mensuales o el historial completo en CSV compatible con Excel.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={exportWeeklyCashCsv}
              disabled={closuresThisWeek.length === 0}
              style={{
                border: 'none',
                borderRadius: 999,
                padding: '10px 13px',
                background: closuresThisWeek.length === 0 ? '#f2f2f7' : '#0071e3',
                color: closuresThisWeek.length === 0 ? '#8e8e93' : '#fff',
                fontSize: 12,
                fontWeight: 900,
                fontFamily: 'inherit',
                cursor: closuresThisWeek.length === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              Exportar semana
            </button>

            <button
              type="button"
              onClick={exportMonthlyCashCsv}
              disabled={closuresThisMonth.length === 0}
              style={{
                border: 'none',
                borderRadius: 999,
                padding: '10px 13px',
                background: closuresThisMonth.length === 0 ? '#f2f2f7' : '#0071e3',
                color: closuresThisMonth.length === 0 ? '#8e8e93' : '#fff',
                fontSize: 12,
                fontWeight: 900,
                fontFamily: 'inherit',
                cursor: closuresThisMonth.length === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              Exportar mes
            </button>

            <button
              type="button"
              onClick={exportAllCashClosuresCsv}
              disabled={closures.length === 0}
              style={{
                border: '0.5px solid #d8d8df',
                borderRadius: 999,
                padding: '10px 13px',
                background: '#fff',
                color: closures.length === 0 ? '#aeaeb2' : '#1a1a1a',
                fontSize: 12,
                fontWeight: 900,
                fontFamily: 'inherit',
                cursor: closures.length === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              Exportar historial
            </button>
          </div>
        </div>
      </div>
      <div style={{ background: '#fff', borderRadius: 22, padding: '22px 24px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 19, fontWeight: 900, color: '#1a1a1a' }}>Caja diaria</div>
            <div style={{ fontSize: 13, color: '#6e6e73', marginTop: 4, lineHeight: 1.45 }}>
              Controlá citas, cobros, pendientes y métodos de pago por día.
            </div>
          </div>

          <div style={{ width: 250, maxWidth: '100%' }}>
            <DatePickerField value={selectedDate} onChange={(nextDate) => setSelectedDate(nextDate || getLocalDateKeyValue())} placeholder="Elegir día" />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, marginBottom: 12 }}>
          <div style={cashCardStyle('#f7f7fb')}>
            <div style={{ fontSize: 28, fontWeight: 950, color: '#1a1a1a' }}>{dayBookings.length}</div>
            <div style={smallStatStyle}>Citas del día</div>
          </div>
          <div style={cashCardStyle('#ecfff3')}>
            <div style={{ fontSize: 28, fontWeight: 950, color: '#30d158' }}>{completedBookings.length}</div>
            <div style={smallStatStyle}>Completadas</div>
          </div>
          <div style={cashCardStyle('#fff8eb')}>
            <div style={{ fontSize: 28, fontWeight: 950, color: '#ff9f0a' }}>{pendingBookings.length}</div>
            <div style={smallStatStyle}>Pendientes/confirmadas</div>
          </div>
          <div style={cashCardStyle('#fff1f0')}>
            <div style={{ fontSize: 28, fontWeight: 950, color: '#ff453a' }}>{cancelledBookings.length}</div>
            <div style={smallStatStyle}>Canceladas</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
          <div style={cashCardStyle('#f7f7fb')}>
            <div style={{ fontSize: 13, color: '#8e8e93', fontWeight: 900 }}>Total generado</div>
            <div style={{ fontSize: 26, fontWeight: 950, color: '#1a1a1a', marginTop: 6 }}>{formatMoney(totalGenerated)}</div>
          </div>
          <div style={cashCardStyle('#ecfff3')}>
            <div style={{ fontSize: 13, color: '#8e8e93', fontWeight: 900 }}>Total cobrado</div>
            <div style={{ fontSize: 26, fontWeight: 950, color: '#188038', marginTop: 6 }}>{formatMoney(totalCollected)}</div>
          </div>
          <div style={cashCardStyle('#fff8eb')}>
            <div style={{ fontSize: 13, color: '#8e8e93', fontWeight: 900 }}>Pendiente de cobro</div>
            <div style={{ fontSize: 26, fontWeight: 950, color: '#ff9f0a', marginTop: 6 }}>{formatMoney(totalPending)}</div>
          </div>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 22, padding: '20px 24px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 900, color: '#1a1a1a' }}>Cierre de caja</div>
            <div style={{ fontSize: 12, color: '#8e8e93', fontWeight: 700, marginTop: 4, lineHeight: 1.45 }}>
              Guardá un resumen fijo del día para consultar después en el historial.
            </div>
            {existingClosure && (
              <div style={{ display: 'inline-flex', marginTop: 10, padding: '6px 10px', borderRadius: 999, background: '#ecfff3', color: '#188038', fontSize: 12, fontWeight: 900 }}>
                Esta fecha ya tiene un cierre guardado. Podés actualizarlo si cambió algo.
              </div>
            )}
            {closeMessage && (
              <div style={{ marginTop: 10, color: closeMessage.toLowerCase().includes('error') || closeMessage.toLowerCase().includes('no se pudo') ? '#ff453a' : '#188038', fontSize: 12, fontWeight: 900 }}>
                {closeMessage}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={closeCashDay}
            disabled={closeLoading || dayBookings.length === 0}
            style={{
              border: 'none',
              borderRadius: 16,
              padding: '12px 16px',
              background: closeLoading || dayBookings.length === 0 ? '#f2f2f7' : '#0071e3',
              color: closeLoading || dayBookings.length === 0 ? '#8e8e93' : '#fff',
              fontSize: 13,
              fontWeight: 950,
              fontFamily: 'inherit',
              cursor: closeLoading || dayBookings.length === 0 ? 'not-allowed' : 'pointer',
              boxShadow: closeLoading || dayBookings.length === 0 ? 'none' : '0 10px 22px rgba(0,113,227,0.22)',
            }}
          >
            {closeLoading ? 'Guardando...' : existingClosure ? 'Actualizar cierre' : 'Cerrar caja del día'}
          </button>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 22, padding: '20px 24px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 900, color: '#1a1a1a' }}>Métodos de pago</div>
            <div style={{ fontSize: 12, color: '#8e8e93', fontWeight: 700, marginTop: 2 }}>Detalle de cobros registrados.</div>
          </div>
          <button
            type="button"
            onClick={exportCashCsv}
            disabled={dayBookings.length === 0}
            style={{
              border: 'none',
              borderRadius: 999,
              padding: '9px 13px',
              background: dayBookings.length === 0 ? '#f2f2f7' : '#0071e3',
              color: dayBookings.length === 0 ? '#8e8e93' : '#fff',
              fontSize: 12,
              fontWeight: 900,
              fontFamily: 'inherit',
              cursor: dayBookings.length === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            Exportar día CSV
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
          {byMethod.map((method) => (
            <div key={method.value} style={{ background: '#f7f7fb', borderRadius: 16, padding: 14, border: '0.5px solid #ececf2' }}>
              <div style={{ fontSize: 13, fontWeight: 900, color: '#1a1a1a' }}>{method.label}</div>
              <div style={{ fontSize: 21, fontWeight: 950, color: '#0071e3', marginTop: 6 }}>{formatMoney(method.total)}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 22, padding: '20px 24px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: 17, fontWeight: 900, color: '#1a1a1a', marginBottom: 4 }}>Servicios del día</div>
        <div style={{ fontSize: 12, color: '#8e8e93', fontWeight: 700, marginBottom: 14 }}>Cuánto generó cada servicio en la fecha elegida.</div>

        {servicesSummary.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#aeaeb2', padding: 22, fontWeight: 700 }}>No hay servicios registrados para esta fecha.</div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {servicesSummary.map((service) => (
              <div key={service.name} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto auto', gap: 12, alignItems: 'center', background: '#fafafa', borderRadius: 16, padding: '12px 14px' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 900, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{service.name}</div>
                  <div style={{ fontSize: 11, color: '#8e8e93', fontWeight: 700, marginTop: 2 }}>{service.count} {service.count === 1 ? 'turno' : 'turnos'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: '#8e8e93', fontWeight: 800 }}>Generado</div>
                  <div style={{ fontSize: 13, color: '#1a1a1a', fontWeight: 900 }}>{formatMoney(service.generated)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: '#8e8e93', fontWeight: 800 }}>Cobrado</div>
                  <div style={{ fontSize: 13, color: '#188038', fontWeight: 900 }}>{formatMoney(service.collected)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ background: '#fff', borderRadius: 22, padding: '20px 24px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: 17, fontWeight: 900, color: '#1a1a1a', marginBottom: 4 }}>Registro del día</div>
        <div style={{ fontSize: 12, color: '#8e8e93', fontWeight: 700, marginBottom: 14 }}>Listado contable de citas y pagos.</div>

        {loading ? (
          <div style={{ textAlign: 'center', color: '#aeaeb2', padding: 28 }}>Cargando caja...</div>
        ) : dayBookings.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#aeaeb2', padding: 28, fontWeight: 700 }}>No hay citas para esta fecha.</div>
        ) : (
          <div style={{ display: 'grid', gap: 9 }}>
            {dayBookings.map((booking) => {
              const price = getServicePrice(booking);
              const paid = getPaidAmount(booking);
              const pending = Math.max(price - paid, 0);
              const paymentStatus = getBookingPaymentStatus(booking);
              const paymentMethod = getBookingPaymentMethod(booking);

              return (
                <div key={booking.id} style={{ border: '0.5px solid #ececf2', background: booking.status === 'cancelled' ? '#fffafa' : '#fff', borderRadius: 16, padding: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '90px minmax(0, 1fr) auto', gap: 12, alignItems: 'center' }}>
                    <div style={{ background: '#f2f2f7', borderRadius: 14, padding: 9, textAlign: 'center' }}>
                      <div style={{ fontSize: 14, fontWeight: 950 }}>{formatTime(booking.startTime ?? booking.start_time) || '--:--'}</div>
                      <div style={{ fontSize: 10, color: '#8e8e93', fontWeight: 800, marginTop: 3 }}>{formatTime(booking.endTime ?? booking.end_time) || ''}</div>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 950, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{booking.clientName ?? booking.client_name ?? 'Cliente sin nombre'}</div>
                      <div style={{ fontSize: 12, color: '#6e6e73', fontWeight: 700, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {booking.serviceName ?? booking.service_name ?? 'Servicio'}{booking.staffName || booking.staff_name ? ` · ${booking.staffName ?? booking.staff_name}` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <span style={{ fontSize: 11, fontWeight: 900, color: paymentStatusColor[paymentStatus] || '#6e6e73', background: paymentStatusBg[paymentStatus] || '#f2f2f7', padding: '5px 9px', borderRadius: 999 }}>
                        {paymentStatusLabel[paymentStatus] || paymentStatus}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8, marginTop: 12 }}>
                    <div style={{ background: '#fafafa', borderRadius: 13, padding: 10 }}>
                      <div style={{ fontSize: 10, color: '#8e8e93', fontWeight: 900 }}>Precio</div>
                      <div style={{ fontSize: 12, color: '#1a1a1a', fontWeight: 900, marginTop: 3 }}>{formatMoney(price)}</div>
                    </div>
                    <div style={{ background: '#fafafa', borderRadius: 13, padding: 10 }}>
                      <div style={{ fontSize: 10, color: '#8e8e93', fontWeight: 900 }}>Cobrado</div>
                      <div style={{ fontSize: 12, color: '#188038', fontWeight: 900, marginTop: 3 }}>{formatMoney(paid)}</div>
                    </div>
                    <div style={{ background: '#fafafa', borderRadius: 13, padding: 10 }}>
                      <div style={{ fontSize: 10, color: '#8e8e93', fontWeight: 900 }}>Pendiente</div>
                      <div style={{ fontSize: 12, color: pending > 0 ? '#ff9f0a' : '#188038', fontWeight: 900, marginTop: 3 }}>{formatMoney(pending)}</div>
                    </div>
                    <div style={{ background: '#fafafa', borderRadius: 13, padding: 10 }}>
                      <div style={{ fontSize: 10, color: '#8e8e93', fontWeight: 900 }}>Método</div>
                      <div style={{ fontSize: 12, color: '#1a1a1a', fontWeight: 900, marginTop: 3 }}>{paymentMethodLabel[paymentMethod] || paymentMethod}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ background: '#fff', borderRadius: 22, padding: '20px 24px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 900, color: '#1a1a1a' }}>Historial de cierres</div>
            <div style={{ fontSize: 12, color: '#8e8e93', fontWeight: 700, marginTop: 2 }}>Cierres guardados por fecha, ordenados del más reciente al más antiguo.</div>
          </div>
          <div style={{ fontSize: 12, color: '#8e8e93', fontWeight: 900 }}>{closures.length} cierres</div>
        </div>

        {closuresLoading ? (
          <div style={{ textAlign: 'center', color: '#aeaeb2', padding: 22 }}>Cargando cierres...</div>
        ) : closureRows.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#aeaeb2', padding: 22, fontWeight: 700 }}>Todavía no hay cierres guardados.</div>
        ) : (
          <div style={{ display: 'grid', gap: 9 }}>
            {closureRows.map((closure) => {
              const closureId = closure.id;
              const isExpanded = expandedClosureId === closureId;
              const services = Array.isArray(closure.servicesSummary ?? closure.services_summary) ? (closure.servicesSummary ?? closure.services_summary) : [];

              return (
                <div key={closureId} style={{ border: '0.5px solid #ececf2', borderRadius: 18, overflow: 'hidden', background: '#fff' }}>
                  <button
                    type="button"
                    onClick={() => setExpandedClosureId(isExpanded ? null : closureId)}
                    style={{
                      width: '100%',
                      border: 'none',
                      background: '#fff',
                      padding: 15,
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 1fr) auto auto',
                      gap: 12,
                      alignItems: 'center',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: 'inherit',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 950, color: '#1a1a1a' }}>{formatDate(closure.closureDate ?? closure.closure_date)}</div>
                      <div style={{ fontSize: 11, color: '#8e8e93', fontWeight: 800, marginTop: 3 }}>
                        {(closure.totalBookings ?? closure.total_bookings ?? 0)} citas · {(closure.completedBookings ?? closure.completed_bookings ?? 0)} completadas
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: '#8e8e93', fontWeight: 800 }}>Cobrado</div>
                      <div style={{ fontSize: 14, color: '#188038', fontWeight: 950 }}>{formatMoney(closure.totalCollected ?? closure.total_collected ?? 0)}</div>
                    </div>
                    <div style={{ color: '#8e8e93', fontSize: 18 }}>{isExpanded ? '−' : '+'}</div>
                  </button>

                  {isExpanded && (
                    <div style={{ borderTop: '0.5px solid #f0f0f5', padding: 15, display: 'grid', gap: 12 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
                        <div style={{ background: '#f7f7fb', borderRadius: 14, padding: 10 }}>
                          <div style={{ fontSize: 10, color: '#8e8e93', fontWeight: 900 }}>Generado</div>
                          <div style={{ fontSize: 12, fontWeight: 950 }}>{formatMoney(closure.totalGenerated ?? closure.total_generated ?? 0)}</div>
                        </div>
                        <div style={{ background: '#ecfff3', borderRadius: 14, padding: 10 }}>
                          <div style={{ fontSize: 10, color: '#8e8e93', fontWeight: 900 }}>Cobrado</div>
                          <div style={{ fontSize: 12, color: '#188038', fontWeight: 950 }}>{formatMoney(closure.totalCollected ?? closure.total_collected ?? 0)}</div>
                        </div>
                        <div style={{ background: '#fff8eb', borderRadius: 14, padding: 10 }}>
                          <div style={{ fontSize: 10, color: '#8e8e93', fontWeight: 900 }}>Pendiente</div>
                          <div style={{ fontSize: 12, color: '#ff9f0a', fontWeight: 950 }}>{formatMoney(closure.totalPending ?? closure.total_pending ?? 0)}</div>
                        </div>
                        <div style={{ background: '#fff1f0', borderRadius: 14, padding: 10 }}>
                          <div style={{ fontSize: 10, color: '#8e8e93', fontWeight: 900 }}>Canceladas</div>
                          <div style={{ fontSize: 12, color: '#ff453a', fontWeight: 950 }}>{closure.cancelledBookings ?? closure.cancelled_bookings ?? 0}</div>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
                        <div style={{ background: '#fafafa', borderRadius: 14, padding: 10 }}><div style={{ fontSize: 10, color: '#8e8e93', fontWeight: 900 }}>Efectivo</div><div style={{ fontSize: 12, fontWeight: 950 }}>{formatMoney(closure.cashTotal ?? closure.cash_total ?? 0)}</div></div>
                        <div style={{ background: '#fafafa', borderRadius: 14, padding: 10 }}><div style={{ fontSize: 10, color: '#8e8e93', fontWeight: 900 }}>Transferencia</div><div style={{ fontSize: 12, fontWeight: 950 }}>{formatMoney(closure.transferTotal ?? closure.transfer_total ?? 0)}</div></div>
                        <div style={{ background: '#fafafa', borderRadius: 14, padding: 10 }}><div style={{ fontSize: 10, color: '#8e8e93', fontWeight: 900 }}>Tarjeta</div><div style={{ fontSize: 12, fontWeight: 950 }}>{formatMoney(closure.cardTotal ?? closure.card_total ?? 0)}</div></div>
                        <div style={{ background: '#fafafa', borderRadius: 14, padding: 10 }}><div style={{ fontSize: 10, color: '#8e8e93', fontWeight: 900 }}>Otro</div><div style={{ fontSize: 12, fontWeight: 950 }}>{formatMoney(closure.otherTotal ?? closure.other_total ?? 0)}</div></div>
                      </div>

                      {services.length > 0 && (
                        <div style={{ background: '#fafafa', borderRadius: 15, padding: 12 }}>
                          <div style={{ fontSize: 12, fontWeight: 950, marginBottom: 8 }}>Servicios incluidos</div>
                          <div style={{ display: 'grid', gap: 6 }}>
                            {services.map((service) => (
                              <div key={service.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12, color: '#6e6e73', fontWeight: 800 }}>
                                <span>{service.name} · {service.count} {service.count === 1 ? 'turno' : 'turnos'}</span>
                                <span>{formatMoney(service.collected ?? 0)} cobrado</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function AvailabilityTable({ availability, onChange }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', fontSize: 11, color: '#8e8e93', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>DÍA</th>
            <th style={{ textAlign: 'left', fontSize: 11, color: '#8e8e93', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>ESTADO</th>
            <th style={{ textAlign: 'left', fontSize: 11, color: '#8e8e93', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>INICIO</th>
            <th style={{ textAlign: 'left', fontSize: 11, color: '#8e8e93', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>CIERRE</th>
            <th style={{ textAlign: 'left', fontSize: 11, color: '#8e8e93', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>INTERVALO</th>
          </tr>
        </thead>

        <tbody>
          {DAYS.map((dayInfo) => {
            const day = availability.find((d) => d.dayOfWeek === dayInfo.dayOfWeek) || getDefaultAvailability()[dayInfo.dayOfWeek];

            return (
              <tr key={dayInfo.dayOfWeek}>
                <td style={{ padding: '12px 0', borderBottom: '1px solid #f5f5f5', fontSize: 14, fontWeight: 600 }}>
                  {dayInfo.label}
                </td>

                <td style={{ padding: '12px 0', borderBottom: '1px solid #f5f5f5' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: day.isActive ? '#188038' : '#8e8e93', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={day.isActive}
                      onChange={(e) => onChange(day.dayOfWeek, 'isActive', e.target.checked)}
                    />
                    {day.isActive ? 'Activo' : 'Inactivo'}
                  </label>
                </td>

                <td style={{ padding: '12px 8px 12px 0', borderBottom: '1px solid #f5f5f5' }}>
                  <input
                    type="time"
                    value={day.startTime}
                    disabled={!day.isActive}
                    onChange={(e) => onChange(day.dayOfWeek, 'startTime', e.target.value)}
                    style={{ ...inputStyle, margin: 0, opacity: day.isActive ? 1 : 0.45 }}
                  />
                </td>

                <td style={{ padding: '12px 8px 12px 0', borderBottom: '1px solid #f5f5f5' }}>
                  <input
                    type="time"
                    value={day.endTime}
                    disabled={!day.isActive}
                    onChange={(e) => onChange(day.dayOfWeek, 'endTime', e.target.value)}
                    style={{ ...inputStyle, margin: 0, opacity: day.isActive ? 1 : 0.45 }}
                  />
                </td>

                <td style={{ padding: '12px 0', borderBottom: '1px solid #f5f5f5' }}>
                  <select
                    value={day.slotDurationMinutes}
                    disabled={!day.isActive}
                    onChange={(e) => onChange(day.dayOfWeek, 'slotDurationMinutes', Number(e.target.value))}
                    style={{ ...inputStyle, margin: 0, opacity: day.isActive ? 1 : 0.45 }}
                  >
                    <option value={15}>15 min</option>
                    <option value={30}>30 min</option>
                    <option value={45}>45 min</option>
                    <option value={60}>60 min</option>
                    <option value={90}>90 min</option>
                    <option value={120}>120 min</option>
                  </select>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}


function ClientsSection() {
  const [bookings, setBookings] = useState([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedClientKey, setExpandedClientKey] = useState(null);
  const [showFrequentClients, setShowFrequentClients] = useState(false);
  const [clientNotes, setClientNotes] = useState({});
  const [noteDrafts, setNoteDrafts] = useState({});
  const [savingNoteKey, setSavingNoteKey] = useState(null);
  const [noteStatus, setNoteStatus] = useState({});

  let storedProfessional = {};

  try {
    storedProfessional = JSON.parse(localStorage.getItem('tuagendaya_professional')) || {};
  } catch {
    storedProfessional = {};
  }

  const businessName = storedProfessional.businessName || storedProfessional.business_name || storedProfessional.name || '';

  const getLocalDateKey = (date = new Date()) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const getBookingDateKey = (booking) => {
    const value = getBookingDateValue(booking);
    if (!value) return '';

    const raw = String(value).trim();

    const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    }

    const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (slashMatch) {
      const [, day, month, year] = slashMatch;
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return getLocalDateKey(parsed);
    }

    return '';
  };

  const getBookingSortValue = (booking) => {
    const dateKey = getBookingDateKey(booking) || '0000-00-00';
    const time = formatTime(booking.startTime ?? booking.start_time) || '00:00';
    return `${dateKey} ${time}`;
  };

  const fetchBookings = useCallback((showLoading = false) => {
    const token = localStorage.getItem('tuagendaya_token');

    if (showLoading) {
      setLoadingClients(true);
    }

    return fetch(`${API_BASE}/bookings/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setBookings(Array.isArray(data.bookings) ? data.bookings : []);
      })
      .catch(() => {
        if (showLoading) {
          setBookings([]);
        }
      })
      .finally(() => {
        if (showLoading) {
          setLoadingClients(false);
        }
      });
  }, []);

  const fetchClientNotes = useCallback(() => {
    const token = localStorage.getItem('tuagendaya_token');

    return fetch(`${API_BASE}/professionals/me/client-notes`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        const notesMap = {};
        const draftsMap = {};

        (Array.isArray(data.notes) ? data.notes : []).forEach((item) => {
          const key = item.clientKey ?? item.client_key;
          if (!key) return;
          notesMap[key] = item;
          draftsMap[key] = item.notes || '';
        });

        setClientNotes(notesMap);
        setNoteDrafts((current) => ({ ...draftsMap, ...current }));
      })
      .catch(() => {
        setClientNotes({});
      });
  }, []);

  useEffect(() => {
    fetchBookings(true);
    fetchClientNotes();

    const intervalId = window.setInterval(() => {
      fetchBookings(false);
    }, 10000);

    return () => window.clearInterval(intervalId);
  }, [fetchBookings, fetchClientNotes]);

  const clientsMap = new Map();

  bookings.forEach((booking) => {
    const clientName = String(booking.clientName ?? booking.client_name ?? '').trim();
    const clientPhone = String(booking.clientPhone ?? booking.client_phone ?? '').trim();

    if (!clientName && !clientPhone) return;

    const normalizedPhone = normalizePhoneForWhatsApp(clientPhone);
    const key = normalizedPhone || normalizeSearchText(clientName);

    if (!clientsMap.has(key)) {
      clientsMap.set(key, {
        key,
        name: clientName || 'Cliente sin nombre',
        phone: clientPhone,
        normalizedPhone,
        bookings: [],
      });
    }

    const client = clientsMap.get(key);

    if ((!client.name || client.name === 'Cliente sin nombre') && clientName) {
      client.name = clientName;
    }

    if (!client.phone && clientPhone) {
      client.phone = clientPhone;
      client.normalizedPhone = normalizedPhone;
    }

    client.bookings.push(booking);
  });

  clientsMap.forEach((client, key) => {
    const savedNote = clientNotes[key];
    client.notes = savedNote?.notes || '';
    client.noteUpdatedAt = savedNote?.updatedAt ?? savedNote?.updated_at ?? null;
  });

  const clients = Array.from(clientsMap.values()).map((client) => {
    const sortedBookings = [...client.bookings].sort((a, b) => getBookingSortValue(b).localeCompare(getBookingSortValue(a)));
    const lastBooking = sortedBookings[0] || null;
    const completedCount = sortedBookings.filter((booking) => booking.status === 'completed').length;
    const cancelledCount = sortedBookings.filter((booking) => booking.status === 'cancelled').length;
    const pendingOrConfirmedCount = sortedBookings.filter((booking) => booking.status === 'pending' || booking.status === 'confirmed').length;

    return {
      ...client,
      bookings: sortedBookings,
      lastBooking,
      completedCount,
      cancelledCount,
      pendingOrConfirmedCount,
    };
  });

  const filteredClients = clients
    .filter((client) => {
      const query = normalizeSearchText(search);
      if (!query) return true;

      return (
        normalizeSearchText(client.name).includes(query) ||
        normalizeSearchText(client.phone).includes(query) ||
        normalizeSearchText(client.normalizedPhone).includes(query)
      );
    })
    .sort((a, b) => {
      const aValue = a.lastBooking ? getBookingSortValue(a.lastBooking) : '0000-00-00 00:00';
      const bValue = b.lastBooking ? getBookingSortValue(b.lastBooking) : '0000-00-00 00:00';
      return bValue.localeCompare(aValue);
    });

  const totalBookings = bookings.length;
  const attendedClients = clients
    .filter((client) => client.completedCount > 0)
    .sort((a, b) => {
      if (b.completedCount !== a.completedCount) return b.completedCount - a.completedCount;
      const aValue = a.lastBooking ? getBookingSortValue(a.lastBooking) : '0000-00-00 00:00';
      const bValue = b.lastBooking ? getBookingSortValue(b.lastBooking) : '0000-00-00 00:00';
      return bValue.localeCompare(aValue);
    });
  const frequentClients = attendedClients.length;

  const buildClientGeneralMessage = (client) => {
    const safeName = client.name || 'te';
    const safeBusinessName = businessName || 'el negocio';

    return [
      `Hola ${safeName}, te escribimos de ${safeBusinessName}.`,
      '',
      'Gracias por reservar con nosotros.',
    ].join('\n');
  };

  const getClientDraftNote = (client) => {
    if (noteDrafts[client.key] !== undefined) return noteDrafts[client.key];
    return client.notes || '';
  };

  const handleClientNoteChange = (client, value) => {
    setNoteDrafts((current) => ({ ...current, [client.key]: value }));
    setNoteStatus((current) => ({ ...current, [client.key]: '' }));
  };

  const saveClientNote = async (client) => {
    const token = localStorage.getItem('tuagendaya_token');
    const draft = getClientDraftNote(client);

    setSavingNoteKey(client.key);
    setNoteStatus((current) => ({ ...current, [client.key]: '' }));

    try {
      const res = await fetch(`${API_BASE}/professionals/me/client-notes/${encodeURIComponent(client.key)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          clientName: client.name,
          clientPhone: client.phone,
          notes: draft,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'No se pudo guardar la nota');
      }

      const savedNote = data.note || {
        clientKey: client.key,
        client_key: client.key,
        notes: draft,
        updatedAt: new Date().toISOString(),
      };

      setClientNotes((current) => ({ ...current, [client.key]: savedNote }));
      setNoteStatus((current) => ({ ...current, [client.key]: 'Nota guardada' }));
    } catch (error) {
      setNoteStatus((current) => ({
        ...current,
        [client.key]: error.message || 'No se pudo guardar la nota',
      }));
    } finally {
      setSavingNoteKey(null);
    }
  };

  const summaryCardStyle = {
    background: '#fff',
    borderRadius: 18,
    padding: '16px 18px',
    boxShadow: '0 1px 8px rgba(0,0,0,0.05)',
    border: '0.5px solid #eeeeef',
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => setShowFrequentClients((current) => !current)}
          style={{
            ...summaryCardStyle,
            width: '100%',
            border: `1px solid ${showFrequentClients ? '#0071e3' : '#eeeeef'}`,
            cursor: 'pointer',
            fontFamily: 'inherit',
            textAlign: 'left',
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) auto',
            gap: 12,
            alignItems: 'center',
            background: showFrequentClients ? '#f0f7ff' : '#fff',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#30d158' }}>{frequentClients}</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 900, color: '#1a1a1a' }}>Clientes frecuentes</div>
                <div style={{ fontSize: 12, color: '#8e8e93', fontWeight: 700, marginTop: 2 }}>
                  Clientes que ya asistieron al menos una vez. Se actualiza automáticamente con cada reserva completada.
                </div>
              </div>
            </div>
          </div>

          <div style={{ color: '#0071e3', fontSize: 22, fontWeight: 900, transform: showFrequentClients ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.18s ease' }}>
            ⌄
          </div>
        </button>

        {showFrequentClients && (
          <div style={{ marginTop: 10, background: '#fff', borderRadius: 18, border: '0.5px solid #e8e8ed', overflow: 'hidden', boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
            {attendedClients.length === 0 ? (
              <div style={{ padding: 18, color: '#8e8e93', fontSize: 13, fontWeight: 700, textAlign: 'center' }}>
                Todavía no hay clientes con asistencias completadas.
              </div>
            ) : (
              attendedClients.map((client, index) => {
                const lastBooking = client.lastBooking;
                const lastDate = lastBooking ? formatDate(getBookingDateValue(lastBooking)) : 'Sin reservas';
                const lastTime = lastBooking ? formatTime(lastBooking.startTime ?? lastBooking.start_time) : '';

                return (
                  <div
                    key={`attended-${client.key}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '34px minmax(0, 1fr) auto',
                      gap: 12,
                      alignItems: 'center',
                      padding: '13px 16px',
                      borderTop: index === 0 ? 'none' : '0.5px solid #eeeeef',
                    }}
                  >
                    <div style={{ width: 34, height: 34, borderRadius: 12, background: '#edfff3', color: '#30d158', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900 }}>
                      {index + 1}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 900, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {client.name || 'Cliente sin nombre'}
                      </div>
                      <div style={{ fontSize: 12, color: '#6e6e73', fontWeight: 700, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {client.phone || 'Sin teléfono'} · Última asistencia: {lastDate}{lastTime ? ` · ${lastTime}` : ''}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color: '#30d158' }}>{client.completedCount}</div>
                      <div style={{ fontSize: 11, color: '#8e8e93', fontWeight: 800 }}>
                        {client.completedCount === 1 ? 'asistencia' : 'asistencias'}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      <div style={{ background: '#fff', borderRadius: 22, padding: '20px 24px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 900, color: '#1a1a1a' }}>Clientes</div>
            <div style={{ fontSize: 12, color: '#8e8e93', fontWeight: 600, marginTop: 4 }}>
              Se crean automáticamente con cada reserva. Podés ver historial y contactar por WhatsApp.
            </div>
          </div>

          <button
            type="button"
            onClick={() => exportClientsToCsv(filteredClients, 'clientes-tuagendaya.csv')}
            disabled={filteredClients.length === 0}
            style={{
              border: 'none',
              background: filteredClients.length === 0 ? '#f2f2f7' : '#0071e3',
              color: filteredClients.length === 0 ? '#8e8e93' : '#fff',
              borderRadius: 999,
              padding: '9px 13px',
              fontSize: 12,
              fontWeight: 900,
              fontFamily: 'inherit',
              cursor: filteredClients.length === 0 ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: filteredClients.length === 0 ? 'none' : '0 1px 6px rgba(0,113,227,0.18)',
            }}
          >
            Exportar clientes
          </button>
        </div>

        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nombre o teléfono"
          style={{ ...inputStyle, marginBottom: 16, borderRadius: 14, padding: '13px 14px', background: '#f9f9fb' }}
        />

        {loadingClients ? (
          <div style={{ textAlign: 'center', color: '#aeaeb2', padding: 34 }}>Cargando clientes...</div>
        ) : filteredClients.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#aeaeb2', padding: 34 }}>
            {clients.length === 0 ? 'Todavía no hay clientes. Se van a crear automáticamente cuando hagan reservas.' : 'No encontramos clientes con esa búsqueda.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredClients.map((client) => {
              const isExpanded = expandedClientKey === client.key;
              const lastBooking = client.lastBooking;
              const lastDate = lastBooking ? formatDate(getBookingDateValue(lastBooking)) : 'Sin reservas';
              const lastTime = lastBooking ? formatTime(lastBooking.startTime ?? lastBooking.start_time) : null;
              const lastService = lastBooking ? (lastBooking.serviceName ?? lastBooking.service_name ?? 'Servicio') : 'Sin servicio';
              const whatsappUrl = buildWhatsAppUrl(client.phone, buildClientGeneralMessage(client));

              return (
                <div
                  key={client.key}
                  style={{
                    border: `1px solid ${isExpanded ? '#0071e3' : '#e8e8ed'}`,
                    borderRadius: 18,
                    background: '#fff',
                    overflow: 'hidden',
                    boxShadow: isExpanded ? '0 8px 24px rgba(0,113,227,0.10)' : '0 1px 8px rgba(0,0,0,0.04)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedClientKey(isExpanded ? null : client.key)}
                    style={{
                      width: '100%',
                      border: 'none',
                      background: 'transparent',
                      padding: '15px 16px',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      display: 'grid',
                      gridTemplateColumns: '44px minmax(0, 1fr) auto',
                      gap: 12,
                      alignItems: 'center',
                      textAlign: 'left',
                    }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 14,
                        background: '#f2f2f7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#0071e3',
                        fontWeight: 900,
                        fontSize: 17,
                      }}
                    >
                      {String(client.name || '?').trim().charAt(0).toUpperCase() || '?'}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 900, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {client.name || 'Cliente sin nombre'}
                      </div>
                      <div style={{ fontSize: 12, color: '#6e6e73', fontWeight: 700, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {client.phone || 'Sin teléfono'} · {client.completedCount} {client.completedCount === 1 ? 'asistencia' : 'asistencias'} · {client.bookings.length} {client.bookings.length === 1 ? 'reserva' : 'reservas'}
                      </div>
                      <div style={{ fontSize: 11, color: '#8e8e93', fontWeight: 600, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        Última: {lastDate}{lastTime ? ` · ${lastTime}` : ''} · {lastService}
                      </div>
                      {client.notes && (
                        <div style={{ fontSize: 11, color: '#0071e3', fontWeight: 800, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          Nota interna guardada
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {client.completedCount >= 2 && (
                        <span style={{ fontSize: 11, color: '#188038', background: '#edfff3', padding: '5px 9px', borderRadius: 999, fontWeight: 900 }}>
                          Frecuente
                        </span>
                      )}
                      <span style={{ color: '#8e8e93', fontSize: 18, fontWeight: 800, transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.18s ease' }}>
                        ⌄
                      </span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div style={{ padding: '0 16px 16px 16px' }}>
                      <div style={{ borderTop: '0.5px solid #eeeeef', paddingTop: 14 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, marginBottom: 12 }}>
                          <div style={{ background: '#fafafa', borderRadius: 14, padding: 12 }}>
                            <div style={{ fontSize: 11, color: '#8e8e93', fontWeight: 800 }}>Total</div>
                            <div style={{ fontSize: 18, color: '#1a1a1a', fontWeight: 900, marginTop: 4 }}>{client.bookings.length}</div>
                          </div>

                          <div style={{ background: '#fafafa', borderRadius: 14, padding: 12 }}>
                            <div style={{ fontSize: 11, color: '#8e8e93', fontWeight: 800 }}>Completadas</div>
                            <div style={{ fontSize: 18, color: '#5e5ce6', fontWeight: 900, marginTop: 4 }}>{client.completedCount}</div>
                          </div>

                          <div style={{ background: '#fafafa', borderRadius: 14, padding: 12 }}>
                            <div style={{ fontSize: 11, color: '#8e8e93', fontWeight: 800 }}>Canceladas</div>
                            <div style={{ fontSize: 18, color: '#ff453a', fontWeight: 900, marginTop: 4 }}>{client.cancelledCount}</div>
                          </div>
                        </div>

                        {whatsappUrl && (
                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              textDecoration: 'none',
                              padding: '10px 14px',
                              borderRadius: 12,
                              background: '#25d366',
                              color: '#fff',
                              fontSize: 13,
                              fontWeight: 900,
                              marginBottom: 12,
                            }}
                          >
                            Enviar WhatsApp
                          </a>
                        )}

                        <div style={{ background: '#fafafa', borderRadius: 16, padding: 14, marginBottom: 14, border: '0.5px solid #eeeeef' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 8 }}>
                            <div>
                              <div style={{ fontSize: 13, color: '#1a1a1a', fontWeight: 900 }}>Notas internas</div>
                              <div style={{ fontSize: 11, color: '#8e8e93', fontWeight: 700, marginTop: 2 }}>
                                Solo las ve el profesional. No se muestran al cliente.
                              </div>
                            </div>
                            {client.noteUpdatedAt && (
                              <div style={{ fontSize: 11, color: '#8e8e93', fontWeight: 700, textAlign: 'right' }}>
                                Guardada
                              </div>
                            )}
                          </div>

                          <textarea
                            value={getClientDraftNote(client)}
                            onChange={(event) => handleClientNoteChange(client, event.target.value)}
                            placeholder="Ej: prefiere horario de mañana, no asistió una vez, paga en efectivo..."
                            maxLength={3000}
                            style={{
                              ...inputStyle,
                              minHeight: 92,
                              resize: 'vertical',
                              borderRadius: 14,
                              background: '#fff',
                              lineHeight: 1.45,
                              fontFamily: 'inherit',
                            }}
                          />

                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginTop: 10 }}>
                            <div style={{ fontSize: 11, color: noteStatus[client.key] === 'Nota guardada' ? '#188038' : '#8e8e93', fontWeight: 800 }}>
                              {noteStatus[client.key] || `${getClientDraftNote(client).length}/3000 caracteres`}
                            </div>
                            <button
                              type="button"
                              onClick={() => saveClientNote(client)}
                              disabled={savingNoteKey === client.key}
                              style={{
                                border: 'none',
                                borderRadius: 12,
                                padding: '10px 14px',
                                background: savingNoteKey === client.key ? '#d1d1d6' : '#0071e3',
                                color: '#fff',
                                fontSize: 13,
                                fontWeight: 900,
                                cursor: savingNoteKey === client.key ? 'not-allowed' : 'pointer',
                                fontFamily: 'inherit',
                              }}
                            >
                              {savingNoteKey === client.key ? 'Guardando...' : 'Guardar nota'}
                            </button>
                          </div>
                        </div>

                        <div style={{ fontSize: 12, color: '#8e8e93', fontWeight: 900, marginBottom: 8 }}>Historial de reservas</div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {client.bookings.slice(0, 8).map((booking) => {
                            const dateStr = formatDate(getBookingDateValue(booking));
                            const timeStr = formatTime(booking.startTime ?? booking.start_time);
                            const endStr = formatTime(booking.endTime ?? booking.end_time);
                            const serviceName = booking.serviceName ?? booking.service_name ?? 'Servicio no especificado';
                            const staffName = booking.staffName ?? booking.staff_name;
                            const status = booking.status || 'pending';
                            const statusColor = { pending: '#ff9f0a', confirmed: '#30d158', completed: '#5e5ce6', cancelled: '#ff453a' }[status] || '#8e8e93';
                            const statusLabel = { pending: 'Pendiente', confirmed: 'Confirmada', completed: 'Completada', cancelled: 'Cancelada' }[status] || status;

                            return (
                              <div key={booking.id} style={{ background: '#fafafa', borderRadius: 14, padding: '10px 12px', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 10, alignItems: 'center' }}>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontSize: 13, fontWeight: 900, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {dateStr}{timeStr ? ` · ${timeStr}${endStr ? ` - ${endStr}` : ''}` : ''}
                                  </div>
                                  <div style={{ fontSize: 12, color: '#6e6e73', fontWeight: 700, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {serviceName}{staffName ? ` · ${staffName}` : ''}
                                  </div>
                                </div>

                                <div style={{ fontSize: 11, color: statusColor, background: '#fff', border: `0.5px solid ${statusColor}33`, padding: '5px 9px', borderRadius: 999, fontWeight: 900 }}>
                                  {statusLabel}
                                </div>
                              </div>
                            );
                          })}

                          {client.bookings.length > 8 && (
                            <div style={{ textAlign: 'center', fontSize: 12, color: '#8e8e93', fontWeight: 700, padding: 8 }}>
                              Mostrando las últimas 8 reservas de este cliente.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


function AvailabilitySection() {
  const [availability, setAvailability] = useState(getDefaultAvailability());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchAvailability = () => {
    const token = localStorage.getItem('tuagendaya_token');

    setLoading(true);
    setError('');

    fetch(`${API_BASE}/professionals/me/availability`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.availability) && data.availability.length > 0) {
          setAvailability(data.availability.map(normalizeAvailabilityItem));
        } else {
          setAvailability(getDefaultAvailability());
        }
      })
      .catch(() => {
        setAvailability(getDefaultAvailability());
        setError('No se pudo cargar la disponibilidad.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAvailability();
  }, []);

  const updateDay = (dayOfWeek, field, value) => {
    setAvailability((prev) =>
      prev.map((day) =>
        day.dayOfWeek === dayOfWeek ? { ...day, [field]: value } : day
      )
    );
  };

  const handleSave = async () => {
    const token = localStorage.getItem('tuagendaya_token');

    setSaving(true);
    setMessage('');
    setError('');

    try {
      const res = await fetch(`${API_BASE}/professionals/me/availability`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ availability }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'No se pudo guardar la disponibilidad.');
      } else {
        if (Array.isArray(data.availability)) {
          setAvailability(data.availability.map(normalizeAvailabilityItem));
        }
        setMessage('Disponibilidad general guardada correctamente.');
      }
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ background: '#fff', borderRadius: 20, padding: 24, textAlign: 'center', color: '#aeaeb2' }}>
        Cargando disponibilidad...
      </div>
    );
  }

  return (
    <div style={{ background: '#fff', borderRadius: 20, padding: '20px 24px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#1a1a1a' }}>Disponibilidad general</div>
        <div style={{ fontSize: 13, color: '#6e6e73', marginTop: 4 }}>
          Esta disponibilidad queda como base. Para varios profesionales, configurá horarios individuales en la pestaña Profesionales.
        </div>
      </div>

      <AvailabilityTable availability={availability} onChange={updateDay} />

      {message && (
        <div style={{ background: '#edfff3', border: '0.5px solid #b7f5c8', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: '#188038', marginTop: 14 }}>
          {message}
        </div>
      )}

      {error && (
        <div style={{ background: '#fff2f2', border: '0.5px solid #ffcdd2', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: '#c62828', marginTop: 14 }}>
          {error}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        style={{ width: '100%', marginTop: 16, padding: '13px', borderRadius: 12, border: 'none', background: saving ? '#aeaeb2' : '#0071e3', color: '#fff', fontSize: 15, fontWeight: 600, fontFamily: 'inherit', cursor: saving ? 'not-allowed' : 'pointer' }}
      >
        {saving ? 'Guardando...' : 'Guardar disponibilidad general'}
      </button>
    </div>
  );
}

function StaffSection() {
  const [staff, setStaff] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [availability, setAvailability] = useState(getDefaultAvailability());

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    color: '#0071e3',
  });

  const [editingId, setEditingId] = useState(null);
  const [editing, setEditing] = useState({});

  const [loadingStaff, setLoadingStaff] = useState(true);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const token = localStorage.getItem('tuagendaya_token');

  const fetchStaff = () => {
    setLoadingStaff(true);
    setError('');

    fetch(`${API_BASE}/staff`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        const normalized = (data.staff || []).map(normalizeStaff);
        setStaff(normalized);

        if (normalized.length > 0) {
          setSelectedStaffId((current) => current || String(normalized[0].id));
        }
      })
      .catch(() => {
        setStaff([]);
        setError('No se pudieron cargar los profesionales.');
      })
      .finally(() => setLoadingStaff(false));
  };

  const fetchStaffAvailability = (staffId) => {
    if (!staffId) return;

    setLoadingAvailability(true);
    setError('');

    fetch(`${API_BASE}/staff/${staffId}/availability`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.availability) && data.availability.length > 0) {
          setAvailability(data.availability.map(normalizeAvailabilityItem));
        } else {
          setAvailability(getDefaultAvailability());
        }
      })
      .catch(() => {
        setAvailability(getDefaultAvailability());
        setError('No se pudo cargar la disponibilidad del profesional.');
      })
      .finally(() => setLoadingAvailability(false));
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  useEffect(() => {
    if (selectedStaffId) {
      fetchStaffAvailability(selectedStaffId);
    }
  }, [selectedStaffId]);

  const resetForm = () => {
    setForm({
      name: '',
      phone: '',
      email: '',
      color: '#0071e3',
    });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!form.name.trim()) {
      setError('El nombre del profesional es obligatorio.');
      return;
    }

    setSaving(true);

    try {
      const res = await fetch(`${API_BASE}/staff`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          color: form.color,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'No se pudo crear el profesional.');
      } else {
        setMessage('Profesional agregado correctamente.');
        resetForm();

        const newStaff = normalizeStaff(data.staffMember || data.staff_member || {});
        setSelectedStaffId(newStaff.id ? String(newStaff.id) : '');
        fetchStaff();
      }
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (member) => {
    setEditingId(member.id);
    setEditing({
      name: member.name,
      phone: member.phone || '',
      email: member.email || '',
      color: member.color || '#0071e3',
      isActive: member.isActive,
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditing({});
  };

  const saveEditing = async (staffId) => {
    setError('');
    setMessage('');

    if (!String(editing.name || '').trim()) {
      setError('El nombre del profesional es obligatorio.');
      return;
    }

    setSaving(true);

    try {
      const res = await fetch(`${API_BASE}/staff/${staffId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: String(editing.name || '').trim(),
          phone: String(editing.phone || '').trim(),
          email: String(editing.email || '').trim(),
          color: editing.color || '#0071e3',
          isActive: Boolean(editing.isActive),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'No se pudo actualizar el profesional.');
      } else {
        setMessage('Profesional actualizado correctamente.');
        cancelEditing();
        fetchStaff();
      }
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setSaving(false);
    }
  };

  const disableStaff = async (staffId) => {
    const confirmDisable = window.confirm('¿Querés desactivar este profesional? No se borran las reservas viejas.');
    if (!confirmDisable) return;

    setError('');
    setMessage('');
    setSaving(true);

    try {
      const res = await fetch(`${API_BASE}/staff/${staffId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'No se pudo desactivar el profesional.');
      } else {
        setMessage('Profesional desactivado.');
        fetchStaff();
      }
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setSaving(false);
    }
  };

  const updateDay = (dayOfWeek, field, value) => {
    setAvailability((prev) =>
      prev.map((day) =>
        day.dayOfWeek === dayOfWeek ? { ...day, [field]: value } : day
      )
    );
  };

  const saveAvailability = async () => {
    if (!selectedStaffId) return;

    setError('');
    setMessage('');
    setSaving(true);

    try {
      const res = await fetch(`${API_BASE}/staff/${selectedStaffId}/availability`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ availability }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'No se pudo guardar la disponibilidad.');
      } else {
        if (Array.isArray(data.availability)) {
          setAvailability(data.availability.map(normalizeAvailabilityItem));
        }
        setMessage('Horarios del profesional guardados correctamente.');
      }
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setSaving(false);
    }
  };

  const selectedStaff = staff.find((member) => String(member.id) === String(selectedStaffId));

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: '20px 24px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#1a1a1a' }}>Profesionales del negocio</div>
          <div style={{ fontSize: 13, color: '#6e6e73', marginTop: 4 }}>
            Agregá profesionales internos y configurá horarios independientes para cada uno.
          </div>
        </div>

        <form onSubmit={handleCreate} style={{ background: '#f2f2f7', borderRadius: 16, padding: 16, marginBottom: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Agregar profesional</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1.2fr 0.7fr', gap: 10 }}>
            <div>
              <label style={smallLabelStyle}>Nombre *</label>
              <input
                style={inputStyle}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ej: Juan Pérez"
              />
            </div>

            <div>
              <label style={smallLabelStyle}>Teléfono</label>
              <input
                style={inputStyle}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="099..."
              />
            </div>

            <div>
              <label style={smallLabelStyle}>Email</label>
              <input
                style={inputStyle}
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="opcional"
              />
            </div>

            <div>
              <label style={smallLabelStyle}>Color</label>
              <select
                style={inputStyle}
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
              >
                {STAFF_COLORS.map((color) => (
                  <option key={color} value={color}>{color}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            style={{ width: '100%', marginTop: 12, padding: '12px', borderRadius: 12, border: 'none', background: saving ? '#aeaeb2' : '#0071e3', color: '#fff', fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}
          >
            {saving ? 'Guardando...' : 'Agregar profesional'}
          </button>
        </form>

        {message && (
          <div style={{ background: '#edfff3', border: '0.5px solid #b7f5c8', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: '#188038', marginBottom: 12 }}>
            {message}
          </div>
        )}

        {error && (
          <div style={{ background: '#fff2f2', border: '0.5px solid #ffcdd2', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: '#c62828', marginBottom: 12 }}>
            {error}
          </div>
        )}

        {loadingStaff ? (
          <div style={{ textAlign: 'center', color: '#aeaeb2', padding: 28 }}>Cargando profesionales...</div>
        ) : staff.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#aeaeb2', padding: 28 }}>Todavía no hay profesionales cargados.</div>
        ) : (
          staff.map((member) => {
            const isEditing = editingId === member.id;

            return (
              <div
                key={member.id}
                style={{
                  border: String(selectedStaffId) === String(member.id) ? '2px solid #0071e3' : '1px solid #e8e8ed',
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 10,
                  background: member.isActive ? '#fafafa' : '#fffafa',
                  opacity: member.isActive ? 1 : 0.65,
                }}
              >
                {isEditing ? (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1.2fr 0.7fr', gap: 10, marginBottom: 10 }}>
                      <div>
                        <label style={smallLabelStyle}>Nombre</label>
                        <input
                          style={inputStyle}
                          value={editing.name}
                          onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                        />
                      </div>

                      <div>
                        <label style={smallLabelStyle}>Teléfono</label>
                        <input
                          style={inputStyle}
                          value={editing.phone}
                          onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                        />
                      </div>

                      <div>
                        <label style={smallLabelStyle}>Email</label>
                        <input
                          style={inputStyle}
                          type="email"
                          value={editing.email}
                          onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                        />
                      </div>

                      <div>
                        <label style={smallLabelStyle}>Color</label>
                        <select
                          style={inputStyle}
                          value={editing.color}
                          onChange={(e) => setEditing({ ...editing, color: e.target.value })}
                        >
                          {STAFF_COLORS.map((color) => (
                            <option key={color} value={color}>{color}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#1a1a1a', marginBottom: 12 }}>
                      <input
                        type="checkbox"
                        checked={editing.isActive}
                        onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })}
                      />
                      Profesional activo
                    </label>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => saveEditing(member.id)}
                        disabled={saving}
                        style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: '#0071e3', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Guardar
                      </button>

                      <button
                        type="button"
                        onClick={cancelEditing}
                        style={{ flex: 1, padding: '10px', borderRadius: 10, border: '0.5px solid #d0d0d5', background: '#fff', color: '#6e6e73', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <button
                        type="button"
                        onClick={() => setSelectedStaffId(String(member.id))}
                        style={{ flex: 1, border: 'none', background: 'transparent', padding: 0, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 12, height: 12, borderRadius: 99, background: member.color, display: 'inline-block' }} />
                          <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a' }}>
                            {member.name}
                          </div>
                        </div>

                        {member.phone && (
                          <div style={{ fontSize: 12, color: '#6e6e73', marginTop: 4 }}>Teléfono: {member.phone}</div>
                        )}

                        {member.email && (
                          <div style={{ fontSize: 12, color: '#6e6e73', marginTop: 2 }}>Email: {member.email}</div>
                        )}
                      </button>

                      <div style={{ fontSize: 11, fontWeight: 700, color: member.isActive ? '#188038' : '#ff453a', background: member.isActive ? '#edfff3' : '#fff2f2', padding: '5px 10px', borderRadius: 20, height: 18 }}>
                        {member.isActive ? 'Activo' : 'Inactivo'}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <button
                        type="button"
                        onClick={() => setSelectedStaffId(String(member.id))}
                        style={{ flex: 1, padding: '9px', borderRadius: 10, border: '0.5px solid #d0d0d5', background: String(selectedStaffId) === String(member.id) ? '#eef6ff' : '#fff', color: '#0071e3', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Ver horarios
                      </button>

                      <button
                        type="button"
                        onClick={() => startEditing(member)}
                        style={{ flex: 1, padding: '9px', borderRadius: 10, border: '0.5px solid #d0d0d5', background: '#fff', color: '#1a1a1a', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        onClick={() => disableStaff(member.id)}
                        disabled={!member.isActive || saving}
                        style={{ flex: 1, padding: '9px', borderRadius: 10, border: 'none', background: member.isActive ? '#ff453a' : '#aeaeb2', color: '#fff', fontWeight: 700, cursor: member.isActive ? 'pointer' : 'not-allowed' }}
                      >
                        Eliminar
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      <div style={{ background: '#fff', borderRadius: 20, padding: '20px 24px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#1a1a1a' }}>
            Horarios del profesional
          </div>
          <div style={{ fontSize: 13, color: '#6e6e73', marginTop: 4 }}>
            {selectedStaff
              ? `Configurando disponibilidad de ${selectedStaff.name}.`
              : 'Seleccioná un profesional para configurar sus horarios.'}
          </div>
        </div>

        {!selectedStaffId ? (
          <div style={{ textAlign: 'center', color: '#aeaeb2', padding: 28 }}>
            Seleccioná o agregá un profesional.
          </div>
        ) : loadingAvailability ? (
          <div style={{ textAlign: 'center', color: '#aeaeb2', padding: 28 }}>
            Cargando horarios...
          </div>
        ) : (
          <>
            <AvailabilityTable availability={availability} onChange={updateDay} />

            <button
              onClick={saveAvailability}
              disabled={saving}
              style={{ width: '100%', marginTop: 16, padding: '13px', borderRadius: 12, border: 'none', background: saving ? '#aeaeb2' : '#0071e3', color: '#fff', fontSize: 15, fontWeight: 600, fontFamily: 'inherit', cursor: saving ? 'not-allowed' : 'pointer' }}
            >
              {saving ? 'Guardando...' : 'Guardar horarios del profesional'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ServicesSection() {
  const [services, setServices] = useState([]);
  const [form, setForm] = useState({
    name: '',
    description: '',
    durationMinutes: 30,
    price: '',
  });
  const [editingId, setEditingId] = useState(null);
  const [editing, setEditing] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const { serviceExample, descriptionExample } = getProfessionExamples();
  const token = localStorage.getItem('tuagendaya_token');

  const fetchServices = () => {
    setLoading(true);
    setError('');

    fetch(`${API_BASE}/professionals/me/services`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setServices((data.services || []).map(normalizeService)))
      .catch(() => {
        setServices([]);
        setError('No se pudieron cargar los servicios.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      durationMinutes: 30,
      price: '',
    });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!form.name.trim()) {
      setError('El nombre del servicio es obligatorio.');
      return;
    }

    setSaving(true);

    try {
      const res = await fetch(`${API_BASE}/professionals/me/services`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim(),
          durationMinutes: Number(form.durationMinutes),
          price: form.price === '' ? null : Number(form.price),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'No se pudo crear el servicio.');
      } else {
        setMessage('Servicio creado correctamente.');
        resetForm();
        fetchServices();
      }
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (service) => {
    setEditingId(service.id);
    setEditing({
      name: service.name,
      description: service.description || '',
      durationMinutes: service.durationMinutes || 30,
      price: service.price || '',
      isActive: service.isActive,
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditing({});
  };

  const saveEditing = async (serviceId) => {
    setError('');
    setMessage('');
    setSaving(true);

    try {
      const res = await fetch(`${API_BASE}/professionals/me/services/${serviceId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: String(editing.name || '').trim(),
          description: String(editing.description || '').trim(),
          durationMinutes: Number(editing.durationMinutes),
          price: editing.price === '' ? null : Number(editing.price),
          isActive: Boolean(editing.isActive),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'No se pudo actualizar el servicio.');
      } else {
        setMessage('Servicio actualizado correctamente.');
        cancelEditing();
        fetchServices();
      }
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setSaving(false);
    }
  };

  const deleteService = async (serviceId) => {
    const confirmDelete = window.confirm('¿Querés eliminar este servicio? Esta acción lo quita de la lista de servicios. Las reservas ya creadas se mantienen.');
    if (!confirmDelete) return;

    setError('');
    setMessage('');
    setSaving(true);

    try {
      const res = await fetch(`${API_BASE}/professionals/me/services/${serviceId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'No se pudo eliminar el servicio.');
      } else {
        setMessage('Servicio eliminado correctamente.');
        fetchServices();
      }
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ background: '#fff', borderRadius: 20, padding: '20px 24px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#1a1a1a' }}>Mis servicios</div>
        <div style={{ fontSize: 13, color: '#6e6e73', marginTop: 4 }}>
          Agregá, modificá o eliminá servicios. La duración cambia automáticamente los horarios disponibles.
        </div>
      </div>

      <form onSubmit={handleCreate} style={{ background: '#f2f2f7', borderRadius: 16, padding: 16, marginBottom: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Agregar servicio</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div>
            <label style={smallLabelStyle}>Nombre *</label>
            <input
              style={inputStyle}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={serviceExample}
            />
          </div>

          <div>
            <label style={smallLabelStyle}>Duración</label>
            <input
              style={inputStyle}
              type="number"
              min="5"
              step="5"
              value={form.durationMinutes}
              onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
            />
          </div>

          <div>
            <label style={smallLabelStyle}>Precio</label>
            <input
              style={inputStyle}
              type="number"
              min="0"
              step="1"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              placeholder="Opcional"
            />
          </div>
        </div>

        <label style={smallLabelStyle}>Descripción opcional</label>
        <input
          style={{ ...inputStyle, marginBottom: 12 }}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder={descriptionExample}
        />

        <button
          type="submit"
          disabled={saving}
          style={{ width: '100%', padding: '12px', borderRadius: 12, border: 'none', background: saving ? '#aeaeb2' : '#0071e3', color: '#fff', fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}
        >
          {saving ? 'Guardando...' : 'Crear servicio'}
        </button>
      </form>

      {message && (
        <div style={{ background: '#edfff3', border: '0.5px solid #b7f5c8', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: '#188038', marginBottom: 12 }}>
          {message}
        </div>
      )}

      {error && (
        <div style={{ background: '#fff2f2', border: '0.5px solid #ffcdd2', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: '#c62828', marginBottom: 12 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', color: '#aeaeb2', padding: 28 }}>Cargando servicios...</div>
      ) : services.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#aeaeb2', padding: 28 }}>Todavía no tenés servicios.</div>
      ) : (
        services.map((service) => {
          const isEditing = editingId === service.id;

          return (
            <div
              key={service.id}
              style={{
                border: '1px solid #e8e8ed',
                borderRadius: 16,
                padding: 16,
                marginBottom: 10,
                background: service.isActive ? '#fafafa' : '#fffafa',
                opacity: service.isActive ? 1 : 0.65,
              }}
            >
              {isEditing ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div>
                      <label style={smallLabelStyle}>Nombre</label>
                      <input
                        style={inputStyle}
                        value={editing.name}
                        onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                      />
                    </div>

                    <div>
                      <label style={smallLabelStyle}>Duración</label>
                      <input
                        style={inputStyle}
                        type="number"
                        min="5"
                        step="5"
                        value={editing.durationMinutes}
                        onChange={(e) => setEditing({ ...editing, durationMinutes: e.target.value })}
                      />
                    </div>

                    <div>
                      <label style={smallLabelStyle}>Precio</label>
                      <input
                        style={inputStyle}
                        type="number"
                        min="0"
                        step="1"
                        value={editing.price}
                        onChange={(e) => setEditing({ ...editing, price: e.target.value })}
                      />
                    </div>
                  </div>

                  <label style={smallLabelStyle}>Descripción</label>
                  <input
                    style={{ ...inputStyle, marginBottom: 10 }}
                    value={editing.description}
                    onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  />

                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#1a1a1a', marginBottom: 12 }}>
                    <input
                      type="checkbox"
                      checked={editing.isActive}
                      onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })}
                    />
                    Servicio activo
                  </label>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => saveEditing(service.id)}
                      disabled={saving}
                      style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: '#0071e3', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Guardar
                    </button>

                    <button
                      type="button"
                      onClick={cancelEditing}
                      style={{ flex: 1, padding: '10px', borderRadius: 10, border: '0.5px solid #d0d0d5', background: '#fff', color: '#6e6e73', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Cancelar
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a' }}>
                        {service.name}
                      </div>

                      {service.description && (
                        <div style={{ fontSize: 12, color: '#6e6e73', marginTop: 3 }}>
                          {service.description}
                        </div>
                      )}

                      <div style={{ fontSize: 12, color: '#0071e3', marginTop: 6 }}>
                        Duración: {service.durationMinutes} min
                        {service.price !== '' && service.price !== null && service.price !== undefined ? ` · $${service.price}` : ''}
                      </div>
                    </div>

                    <div style={{ fontSize: 11, fontWeight: 700, color: service.isActive ? '#188038' : '#ff453a', background: service.isActive ? '#edfff3' : '#fff2f2', padding: '5px 10px', borderRadius: 20, height: 18 }}>
                      {service.isActive ? 'Activo' : 'Inactivo'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button
                      type="button"
                      onClick={() => startEditing(service)}
                      style={{ flex: 1, padding: '9px', borderRadius: 10, border: '0.5px solid #d0d0d5', background: '#fff', color: '#1a1a1a', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteService(service.id)}
                      disabled={saving}
                      style={{ flex: 1, padding: '9px', borderRadius: 10, border: 'none', background: '#ff453a', color: '#fff', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}
                    >
                      Eliminar
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}


function normalizeProfessionalFromApi(item) {
  if (!item) return {};

  return {
    id: item.id,
    name: item.name || '',
    businessName: item.businessName ?? item.business_name ?? '',
    business_name: item.business_name ?? item.businessName ?? '',
    email: item.email || '',
    phone: item.phone || '',
    profession: item.profession || '',
    address: item.address || '',
    slug: item.slug || '',
    logoUrl: item.logoUrl ?? item.logo_url ?? '',
    logo_url: item.logo_url ?? item.logoUrl ?? '',
    status: item.status || '',
    createdAt: item.createdAt ?? item.created_at,
    created_at: item.created_at ?? item.createdAt,
    updatedAt: item.updatedAt ?? item.updated_at,
    updated_at: item.updated_at ?? item.updatedAt,
  };
}


function getLogoVisualModeFromImage(event, setter) {
  const image = event.currentTarget || event.target;
  const naturalWidth = image?.naturalWidth || 0;
  const naturalHeight = image?.naturalHeight || 0;

  if (!naturalWidth || !naturalHeight) {
    setter('square');
    return;
  }

  const ratio = naturalWidth / naturalHeight;

  if (ratio >= 2.1) {
    setter('wide');
    return;
  }

  if (ratio <= 0.78) {
    setter('tall');
    return;
  }

  setter('square');
}

function getDashboardBusinessLogoBoxStyle(mode) {
  const base = {
    background: '#fff',
    border: '0.5px solid #e8e8ed',
    borderRadius: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    alignSelf: 'flex-end',
  };

  if (mode === 'wide') {
    return {
      ...base,
      width: 230,
      minWidth: 230,
      height: 86,
      padding: '10px 18px',
    };
  }

  if (mode === 'tall') {
    return {
      ...base,
      width: 152,
      minWidth: 152,
      height: 106,
      padding: 12,
    };
  }

  return {
    ...base,
    width: 178,
    minWidth: 178,
    height: 98,
    padding: 12,
  };
}

function getDashboardBusinessLogoImageStyle(mode) {
  if (mode === 'wide') {
    return {
      width: '100%',
      height: 'auto',
      maxHeight: 62,
      objectFit: 'contain',
      display: 'block',
    };
  }

  if (mode === 'tall') {
    return {
      width: 'auto',
      height: '100%',
      maxWidth: '72%',
      objectFit: 'contain',
      display: 'block',
    };
  }

  return {
    width: '82%',
    height: '82%',
    objectFit: 'contain',
    display: 'block',
  };
}

function getProfilePreviewLogoBoxStyle(mode) {
  const base = {
    background: '#fff',
    border: '0.5px solid #e8e8ed',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  };

  if (mode === 'wide') {
    return { ...base, minHeight: 128 };
  }

  if (mode === 'tall') {
    return { ...base, minHeight: 170 };
  }

  return { ...base, minHeight: 150 };
}

function getProfilePreviewLogoImageStyle(mode) {
  if (mode === 'wide') {
    return {
      width: '100%',
      maxWidth: 380,
      height: 'auto',
      maxHeight: 90,
      objectFit: 'contain',
      display: 'block',
    };
  }

  if (mode === 'tall') {
    return {
      width: 'auto',
      height: 122,
      maxWidth: 180,
      objectFit: 'contain',
      display: 'block',
    };
  }

  return {
    width: 122,
    height: 122,
    objectFit: 'contain',
    display: 'block',
  };
}

function BusinessProfileSection({ professional, onProfileUpdated }) {
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    businessName: professional?.businessName || professional?.business_name || '',
    phone: professional?.phone || '',
    address: professional?.address || '',
    logoUrl: professional?.logoUrl || professional?.logo_url || '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [previewLogoMode, setPreviewLogoMode] = useState('square');
  const [planBookings, setPlanBookings] = useState([]);
  const [loadingPlan, setLoadingPlan] = useState(true);

  const token = localStorage.getItem('tuagendaya_token');

  const fetchProfile = () => {
    setLoading(true);
    setError('');

    fetch(`${API_BASE}/professionals/me/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.professional) {
          const normalized = normalizeProfessionalFromApi(data.professional);

          setForm({
            businessName: normalized.businessName || '',
            phone: normalized.phone || '',
            address: normalized.address || '',
            logoUrl: normalized.logoUrl || '',
          });

          onProfileUpdated(normalized);
        }
      })
      .catch(() => {
        setError('No se pudo cargar el perfil del negocio.');
      })
      .finally(() => setLoading(false));
  };

  const fetchPlanBookings = () => {
    if (!token) {
      setLoadingPlan(false);
      return;
    }

    setLoadingPlan(true);

    fetch(`${API_BASE}/bookings/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setPlanBookings(Array.isArray(data.bookings) ? data.bookings : []);
      })
      .catch(() => {
        setPlanBookings([]);
      })
      .finally(() => setLoadingPlan(false));
  };

  useEffect(() => {
    fetchProfile();
    fetchPlanBookings();
  }, []);

  useEffect(() => {
    setPreviewLogoMode('square');
  }, [form.logoUrl]);

  const isValidLogoValue = (value) => {
    const cleanValue = String(value || '').trim();

    if (!cleanValue) return true;

    return (
      cleanValue.startsWith('http://') ||
      cleanValue.startsWith('https://') ||
      cleanValue.startsWith('data:image/png;base64,') ||
      cleanValue.startsWith('data:image/jpeg;base64,') ||
      cleanValue.startsWith('data:image/webp;base64,')
    );
  };

  const handleLogoFileChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setMessage('');
    setError('');

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      setError('El logo debe ser una imagen PNG, JPG o WebP.');
      event.target.value = '';
      return;
    }

    const maxSizeMb = 1;
    const maxSizeBytes = maxSizeMb * 1024 * 1024;

    if (file.size > maxSizeBytes) {
      setError('El logo no puede pesar más de 1 MB. Exportalo más liviano y volvé a cargarlo.');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      setForm((current) => ({ ...current, logoUrl: dataUrl }));
      setMessage('Logo cargado. Guardá el perfil para aplicar el cambio.');
    };

    reader.onerror = () => {
      setError('No se pudo leer el archivo del logo.');
    };

    reader.readAsDataURL(file);
  };

  const clearLogo = () => {
    setForm((current) => ({ ...current, logoUrl: '' }));
    setMessage('Logo quitado. Guardá el perfil para aplicar el cambio.');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!form.businessName.trim()) {
      setError('El nombre del negocio es obligatorio.');
      return;
    }

    if (!isValidLogoValue(form.logoUrl)) {
      setError('El logo debe ser una URL válida o una imagen cargada desde archivo.');
      return;
    }

    setSaving(true);

    try {
      const res = await fetch(`${API_BASE}/professionals/me/profile`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessName: form.businessName.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
          logoUrl: form.logoUrl.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'No se pudo guardar el perfil.');
      } else {
        const normalized = normalizeProfessionalFromApi(data.professional);
        localStorage.setItem('tuagendaya_professional', JSON.stringify(normalized));
        onProfileUpdated(normalized);
        setMessage('Perfil del negocio guardado correctamente.');
      }
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setSaving(false);
    }
  };

  const getBookingDateValue = (booking) => {
    const raw = booking?.bookingDate || booking?.booking_date || booking?.date || booking?.fecha || '';
    const clean = String(raw || '').trim();

    if (!clean) return '';

    const isoMatch = clean.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

    const parsed = new Date(clean);
    if (!Number.isNaN(parsed.getTime())) {
      const year = parsed.getFullYear();
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const day = String(parsed.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    return '';
  };

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const planName = professional?.plan || professional?.plan_name || 'Profesional';
  const monthlyLimit = Number(professional?.monthlyLimit || professional?.monthly_limit || 1000);
  const monthlyUsed = planBookings.filter((booking) => getBookingDateValue(booking).startsWith(currentMonthKey)).length;
  const monthlyPercent = monthlyLimit > 0 ? Math.min(100, Math.round((monthlyUsed / monthlyLimit) * 100)) : 0;
  const publicSlug = professional?.slug || '';
  const publicLink = publicSlug ? `https://tuagendaya-web.onrender.com/reservar/${publicSlug}` : '';
  const statusText = professional?.status === 'suspended' ? 'Suspendido' : 'Activo';
  const statusColor = professional?.status === 'suspended' ? '#ff453a' : '#30d158';

  const copyPublicLinkFromProfile = async () => {
    if (!publicLink) return;

    try {
      await navigator.clipboard.writeText(publicLink);
      setMessage('Link público copiado correctamente.');
    } catch {
      setError('No se pudo copiar el link.');
    }
  };

  if (loading) {
    return (
      <div style={{ background: '#fff', borderRadius: 20, padding: 24, textAlign: 'center', color: '#aeaeb2' }}>
        Cargando perfil del negocio...
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: '20px 24px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 900, color: '#1a1a1a' }}>Estado del plan</div>
            <div style={{ fontSize: 13, color: '#6e6e73', marginTop: 4, lineHeight: 1.45 }}>
              Controlá el estado de tu cuenta, el uso mensual y el link público de reservas.
            </div>
          </div>
          <div style={{ padding: '7px 11px', borderRadius: 999, background: statusColor === '#30d158' ? '#edfff3' : '#fff2f2', color: statusColor, fontSize: 12, fontWeight: 900, whiteSpace: 'nowrap' }}>
            {statusText}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, marginBottom: 14 }}>
          <div style={{ background: '#f2f2f7', borderRadius: 16, padding: '14px 16px', border: '0.5px solid #e8e8ed' }}>
            <div style={{ fontSize: 12, color: '#6e6e73', fontWeight: 800 }}>Plan actual</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#1a1a1a', marginTop: 4 }}>{planName}</div>
          </div>

          <div style={{ background: '#eef6ff', borderRadius: 16, padding: '14px 16px', border: '0.5px solid #d8eaff' }}>
            <div style={{ fontSize: 12, color: '#6e6e73', fontWeight: 800 }}>Uso mensual</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#0071e3', marginTop: 4 }}>
              {loadingPlan ? '...' : `${monthlyUsed}/${monthlyLimit}`}
            </div>
          </div>

          <div style={{ background: '#f7f7fb', borderRadius: 16, padding: '14px 16px', border: '0.5px solid #e8e8ed' }}>
            <div style={{ fontSize: 12, color: '#6e6e73', fontWeight: 800 }}>Estado</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: statusColor, marginTop: 4 }}>{statusText}</div>
          </div>
        </div>

        <div style={{ width: '100%', height: 9, borderRadius: 999, background: '#f2f2f7', overflow: 'hidden', marginBottom: 12 }}>
          <div style={{ width: `${monthlyPercent}%`, height: '100%', borderRadius: 999, background: monthlyPercent >= 90 ? '#ff453a' : '#0071e3' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 10, alignItems: 'center', background: '#f7f7fb', border: '0.5px solid #e8e8ed', borderRadius: 16, padding: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, color: '#8e8e93', fontWeight: 800, marginBottom: 3 }}>Link público</div>
            <div style={{ fontSize: 13, color: publicLink ? '#1a1a1a' : '#8e8e93', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {publicLink || 'Todavía no hay link público disponible'}
            </div>
          </div>

          <button
            type="button"
            onClick={copyPublicLinkFromProfile}
            disabled={!publicLink}
            style={{
              padding: '9px 13px',
              borderRadius: 12,
              border: 'none',
              background: publicLink ? '#0071e3' : '#d1d1d6',
              color: '#fff',
              fontSize: 12,
              fontWeight: 900,
              fontFamily: 'inherit',
              cursor: publicLink ? 'pointer' : 'not-allowed',
              whiteSpace: 'nowrap',
            }}
          >
            Copiar link
          </button>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 20, padding: '20px 24px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#1a1a1a' }}>Perfil del negocio</div>
          <div style={{ fontSize: 13, color: '#6e6e73', marginTop: 4 }}>
            Configurá los datos que aparecen en tu panel y en la página pública de reservas.
          </div>
        </div>

        <form onSubmit={handleSave}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={smallLabelStyle}>Nombre del negocio *</label>
              <input
                style={inputStyle}
                value={form.businessName}
                onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                placeholder="Nombre comercial"
              />
            </div>

            <div>
              <label style={smallLabelStyle}>Teléfono</label>
              <input
                style={inputStyle}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="099 123 456"
              />
            </div>
          </div>

          <label style={smallLabelStyle}>Dirección</label>
          <input
            style={{ ...inputStyle, marginBottom: 12 }}
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Dirección del negocio"
          />

          <label style={smallLabelStyle}>Logo del negocio</label>

          <div
            style={{
              background: '#f2f2f7',
              borderRadius: 18,
              padding: 16,
              marginBottom: 12,
              border: '0.5px solid #e8e8ed',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) auto',
                gap: 14,
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', marginBottom: 4 }}>
                  Cargar logo desde archivo
                </div>

                <div style={{ fontSize: 12, color: '#6e6e73', lineHeight: 1.45 }}>
                  Dimensiones recomendadas: 800 × 300 px. Formato recomendado: PNG con fondo transparente. Peso máximo: 1 MB.
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleLogoFileChange}
                  style={{ display: 'none' }}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 12,
                    border: 'none',
                    background: '#0071e3',
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 800,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Seleccionar archivo
                </button>

                {form.logoUrl && (
                  <button
                    type="button"
                    onClick={clearLogo}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 12,
                      border: '0.5px solid #d0d0d5',
                      background: '#fff',
                      color: '#ff453a',
                      fontSize: 13,
                      fontWeight: 800,
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Quitar logo
                  </button>
                )}
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <label style={smallLabelStyle}>O pegar URL del logo</label>
              <input
                style={{ ...inputStyle, marginBottom: 0 }}
                value={form.logoUrl.startsWith('data:image/') ? 'Logo cargado desde archivo' : form.logoUrl}
                onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                placeholder="https://..."
                disabled={form.logoUrl.startsWith('data:image/')}
              />
            </div>
          </div>

          {form.logoUrl ? (
            <div style={getProfilePreviewLogoBoxStyle(previewLogoMode)}>
              <div style={{ fontSize: 12, color: '#6e6e73', marginBottom: 10, fontWeight: 700 }}>Vista previa adaptable del logo</div>
              <img
                src={form.logoUrl}
                alt="Logo del negocio"
                onLoad={(event) => getLogoVisualModeFromImage(event, setPreviewLogoMode)}
                style={getProfilePreviewLogoImageStyle(previewLogoMode)}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          ) : (
            <div style={{ background: '#f2f2f7', borderRadius: 16, padding: 16, marginBottom: 12, color: '#8e8e93', fontSize: 13 }}>
              Cuando cargues un logo, se va a mostrar acá, en el recuadro superior del panel y en la página pública de reservas.
            </div>
          )}

          {message && (
            <div style={{ background: '#edfff3', border: '0.5px solid #b7f5c8', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: '#188038', marginBottom: 12 }}>
              {message}
            </div>
          )}

          {error && (
            <div style={{ background: '#fff2f2', border: '0.5px solid #ffcdd2', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: '#c62828', marginBottom: 12 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: saving ? '#aeaeb2' : '#0071e3', color: '#fff', fontSize: 15, fontWeight: 800, fontFamily: 'inherit', cursor: saving ? 'not-allowed' : 'pointer' }}
          >
            {saving ? 'Guardando...' : 'Guardar perfil del negocio'}
          </button>
        </form>
      </div>

      <div style={{ background: '#fff', borderRadius: 20, padding: '20px 24px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 16, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#1a1a1a' }}>WhatsApp Business</div>
            <div style={{ fontSize: 13, color: '#6e6e73', marginTop: 5, lineHeight: 1.45 }}>
              Si contás con WhatsApp Business, más adelante vas a poder enlazar tu cuenta para enviar confirmaciones automáticas.
              Por ahora, cada reserva tendrá un botón para abrir WhatsApp con el mensaje listo y enviarlo manualmente.
            </div>
          </div>

          <button
            type="button"
            disabled
            style={{
              padding: '11px 16px',
              borderRadius: 14,
              border: '0.5px solid #d0d0d5',
              background: '#f2f2f7',
              color: '#8e8e93',
              fontSize: 13,
              fontWeight: 800,
              fontFamily: 'inherit',
              cursor: 'not-allowed',
              whiteSpace: 'nowrap',
            }}
          >
            Enlazar próximamente
          </button>
        </div>
      </div>
    </div>
  );
}


function ConfigurationSection() {
  const [openPanel, setOpenPanel] = useState(null);

  const panels = [
    {
      key: 'services',
      title: 'Servicios',
      description: 'Creá, editá y eliminá los servicios que ve el cliente al reservar.',
      action: 'Gestionar servicios',
    },
    {
      key: 'staff',
      title: 'Profesionales',
      description: 'Agregá integrantes del negocio y configurá su disponibilidad individual.',
      action: 'Gestionar profesionales',
    },
    {
      key: 'availability',
      title: 'Disponibilidad',
      description: 'Definí días, horarios y duración base de los turnos.',
      action: 'Gestionar horarios',
    },
  ];

  const quickCardStyle = (key) => ({
    background: openPanel === key ? '#eef6ff' : '#fff',
    border: openPanel === key ? '1.5px solid #0071e3' : '0.5px solid #e8e8ed',
    borderRadius: 18,
    padding: 16,
    boxShadow: openPanel === key ? '0 6px 18px rgba(0,113,227,0.12)' : '0 1px 8px rgba(0,0,0,0.04)',
    cursor: 'pointer',
    textAlign: 'left',
    fontFamily: 'inherit',
    transition: 'all 0.18s ease',
    minHeight: 116,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  });

  const quickTitleStyle = {
    fontSize: 15,
    fontWeight: 900,
    color: '#1a1a1a',
    marginBottom: 5,
  };

  const quickTextStyle = {
    fontSize: 13,
    color: '#6e6e73',
    lineHeight: 1.45,
    margin: 0,
  };

  const actionStyle = (key) => ({
    marginTop: 12,
    fontSize: 12,
    fontWeight: 900,
    color: openPanel === key ? '#0071e3' : '#8e8e93',
  });

  const renderOpenPanel = () => {
    if (openPanel === 'services') {
      return <ServicesSection />;
    }

    if (openPanel === 'staff') {
      return <StaffSection />;
    }

    if (openPanel === 'availability') {
      return <AvailabilitySection />;
    }

    return null;
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ background: '#fff', borderRadius: 22, padding: '22px 24px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: 19, fontWeight: 900, color: '#1a1a1a', marginBottom: 6 }}>
          Configuración de agenda
        </div>
        <div style={{ fontSize: 13, color: '#6e6e73', lineHeight: 1.45 }}>
          Elegí qué querés configurar. Todo queda ordenado en un solo lugar, sin llenar la pantalla de información innecesaria.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginTop: 18 }} className="config-summary-grid">
          {panels.map((panel) => (
            <button
              key={panel.key}
              type="button"
              onClick={() => setOpenPanel((current) => (current === panel.key ? null : panel.key))}
              style={quickCardStyle(panel.key)}
            >
              <div>
                <div style={quickTitleStyle}>{panel.title}</div>
                <p style={quickTextStyle}>{panel.description}</p>
              </div>

              <div style={actionStyle(panel.key)}>
                {openPanel === panel.key ? 'Ocultar' : panel.action}
              </div>
            </button>
          ))}
        </div>
      </div>

      {renderOpenPanel()}
    </div>
  );
}

function Dashboard({ professional, onLogout, onProfileUpdated }) {
  const [activeTab, setActiveTab] = useState('reservas');
  const [copiedPublicLink, setCopiedPublicLink] = useState(false);
  const [businessLogoMode, setBusinessLogoMode] = useState('square');

  const publicBookingUrl = professional?.slug
    ? `https://tuagendaya-web.onrender.com/reservar/${professional.slug}`
    : '';

  const businessLogoUrl = professional?.logoUrl || professional?.logo_url || '';
  const businessName = professional?.businessName || professional?.business_name || '';

  useEffect(() => {
    setBusinessLogoMode('square');
  }, [businessLogoUrl]);

  const handleCopyPublicLink = async () => {
    if (!publicBookingUrl) return;

    try {
      await navigator.clipboard.writeText(publicBookingUrl);
      setCopiedPublicLink(true);
      setTimeout(() => setCopiedPublicLink(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = publicBookingUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedPublicLink(true);
      setTimeout(() => setCopiedPublicLink(false), 2000);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('tuagendaya_token');
    localStorage.removeItem('tuagendaya_professional');
    onLogout();
  };

  const tabStyle = (key) => ({
    flex: 1,
    padding: '14px 10px',
    borderRadius: 14,
    border: 'none',
    background: activeTab === key ? '#0071e3' : '#fff',
    color: activeTab === key ? '#fff' : '#1a1a1a',
    fontSize: 14,
    fontWeight: 800,
    cursor: 'pointer',
    fontFamily: 'inherit',
    boxShadow: activeTab === key ? '0 1px 8px rgba(0,113,227,0.25)' : '0 1px 8px rgba(0,0,0,0.04)',
  });

  return (
    <div className="dashboard-panel" style={{ minHeight: '100vh', background: '#f2f2f7', padding: '20px 16px', fontFamily: APP_FONT }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&display=swap');

        .dashboard-panel,
        .dashboard-panel * {
          font-family: ${APP_FONT} !important;
        }

        button, input, select, textarea {
          font-family: inherit;
        }

        @media (max-width: 720px) {
          html, body, #root {
            width: 100%;
            max-width: 100%;
            overflow-x: hidden;
            background: #f2f2f7;
          }

          .dashboard-panel {
            width: 100% !important;
            max-width: 100vw !important;
            overflow-x: hidden !important;
            box-sizing: border-box !important;
            padding: calc(env(safe-area-inset-top, 0px) + 24px) 8px calc(env(safe-area-inset-bottom, 0px) + 118px) !important;
            background: #f2f2f7 !important;
          }

          .dashboard-panel > div {
            width: 100% !important;
            max-width: 100% !important;
            margin-left: auto !important;
            margin-right: auto !important;
            box-sizing: border-box !important;
          }

          .dashboard-header-card {
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            flex-direction: column;
            align-items: stretch !important;
            gap: 14px !important;
            padding: 22px 14px 16px !important;
            border-radius: 24px !important;
            margin: 0 0 14px 0 !important;
            overflow: hidden !important;
          }

          .dashboard-header-card img[alt="Tu Agenda Ya"] {
            height: 34px !important;
            max-width: 100% !important;
          }

          .dashboard-header-side {
            width: 100%;
            min-width: 0 !important;
            align-items: stretch !important;
            gap: 10px !important;
          }

          .dashboard-header-side button {
            align-self: stretch !important;
            min-height: 42px !important;
            border-radius: 14px !important;
          }

          .dashboard-business-logo-box {
            width: 100% !important;
            min-width: 0 !important;
            height: 88px !important;
            align-self: stretch !important;
            border-radius: 20px !important;
            box-sizing: border-box !important;
          }

          .dashboard-tabs {
            position: fixed !important;
            left: 10px !important;
            right: 10px !important;
            bottom: calc(env(safe-area-inset-bottom, 0px) + 10px) !important;
            z-index: 1000 !important;
            display: grid !important;
            grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
            gap: 6px !important;
            padding: 8px !important;
            margin: 0 !important;
            border-radius: 22px !important;
            background: rgba(255, 255, 255, 0.94) !important;
            box-shadow: 0 10px 34px rgba(0,0,0,0.18) !important;
            backdrop-filter: blur(18px);
            -webkit-backdrop-filter: blur(18px);
            overflow: visible !important;
          }

          .dashboard-tabs button {
            min-height: 46px !important;
            padding: 9px 4px !important;
            border-radius: 16px !important;
            font-size: 11px !important;
            line-height: 1.1 !important;
            white-space: normal !important;
            box-shadow: none !important;
          }

          .dashboard-public-link {
            align-items: flex-start !important;
            flex-direction: column !important;
          }

          .dashboard-public-link > div {
            width: 100% !important;
            max-width: 100% !important;
          }

          .dashboard-public-link button {
            min-height: 36px !important;
            padding: 8px 12px !important;
            border-radius: 12px !important;
          }

          .config-summary-grid {
            grid-template-columns: 1fr !important;
          }

          .dashboard-panel div[style*="grid-template-columns"] {
            grid-template-columns: 1fr !important;
          }

          .dashboard-panel div[style*="padding: 20px 24px"],
          .dashboard-panel div[style*="padding: 20px 24px;"],
          .dashboard-panel div[style*="padding: 22px"],
          .dashboard-panel div[style*="padding: 24px"] {
            padding: 16px !important;
          }

          .dashboard-panel button {
            min-height: 42px;
            touch-action: manipulation;
          }

          .dashboard-panel input,
          .dashboard-panel select,
          .dashboard-panel textarea {
            min-height: 42px;
            font-size: 16px !important;
          }
        }
      `}</style>

      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div className="dashboard-header-card" style={{ background: '#fff', borderRadius: 24, padding: '24px 28px', marginBottom: 18, boxShadow: '0 1px 10px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'stretch', justifyContent: 'space-between', gap: 28 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ marginBottom: 14 }}>
              <TuAgendaLogo height={46} />
            </div>

            <div style={{ fontSize: 14, color: '#6e6e73', marginTop: 0, lineHeight: 1.35, fontWeight: 500 }}>
              Hola, {professional?.name || 'profesional'}
            </div>

            {businessName && (
              <div style={{ fontSize: 13, color: '#3a3a3c', marginTop: 5, lineHeight: 1.35, fontWeight: 600 }}>
                {businessName}
              </div>
            )}

            {professional?.address && (
              <div style={{ fontSize: 13, color: '#8e8e93', marginTop: 5, lineHeight: 1.35, fontWeight: 500 }}>
                Dirección: {professional.address}
              </div>
            )}

            {professional?.slug && (
              <div className="dashboard-public-link" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                <div style={{ fontSize: 13, color: '#8e8e93', wordBreak: 'break-word', lineHeight: 1.35, fontWeight: 500 }}>
                  Link público: <strong>{publicBookingUrl}</strong>
                </div>

                <button
                  type="button"
                  onClick={handleCopyPublicLink}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 9,
                    border: '0.5px solid #d0d0d5',
                    background: copiedPublicLink ? '#edfff3' : '#fff',
                    color: copiedPublicLink ? '#188038' : '#0071e3',
                    fontSize: 12,
                    fontWeight: 700,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                  }}
                >
                  {copiedPublicLink ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            )}
          </div>

          <div className="dashboard-header-side" style={{ minWidth: 190, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between', gap: 14 }}>
            <div className="dashboard-business-logo-box" style={getDashboardBusinessLogoBoxStyle(businessLogoMode)}>
              {businessLogoUrl ? (
                <img
                  src={businessLogoUrl}
                  alt={businessName || 'Logo del negocio'}
                  onLoad={(event) => getLogoVisualModeFromImage(event, setBusinessLogoMode)}
                  style={getDashboardBusinessLogoImageStyle(businessLogoMode)}
                />
              ) : (
                <div style={{ fontSize: 12, color: '#aeaeb2', fontWeight: 700, textAlign: 'center' }}>
                  Logo del negocio
                </div>
              )}
            </div>

            <button
              onClick={handleLogout}
              style={{ padding: '8px 16px', borderRadius: 10, border: '0.5px solid #e0e0e5', background: 'transparent', fontSize: 13, color: '#6e6e73', cursor: 'pointer', fontFamily: 'inherit', alignSelf: 'flex-end' }}
            >
              Cerrar sesión
            </button>
          </div>
        </div>

        <div className="dashboard-tabs" style={{ display: 'flex', gap: 10, marginBottom: 16, overflowX: 'auto' }}>
          <button style={tabStyle('reservas')} onClick={() => setActiveTab('reservas')}>Reservas</button>
          <button style={tabStyle('clientes')} onClick={() => setActiveTab('clientes')}>Clientes</button>
          <button style={tabStyle('caja')} onClick={() => setActiveTab('caja')}>Caja</button>
          <button style={tabStyle('configuracion')} onClick={() => setActiveTab('configuracion')}>Configuración</button>
          <button style={tabStyle('perfil')} onClick={() => setActiveTab('perfil')}>Perfil</button>
        </div>

        {activeTab === 'reservas' && <ReservationsSection />}
        {activeTab === 'clientes' && <ClientsSection />}
        {activeTab === 'caja' && <CashSection />}
        {activeTab === 'configuracion' && <ConfigurationSection />}
        {activeTab === 'perfil' && (
          <BusinessProfileSection
            professional={professional}
            onProfileUpdated={onProfileUpdated}
          />
        )}
      </div>
    </div>
  );
}


function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('tuagendaya_admin_token');
    if (token) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo iniciar sesión admin');
      }

      localStorage.setItem('tuagendaya_admin_token', data.token);
      localStorage.setItem('tuagendaya_admin_user', JSON.stringify(data.admin || { email }));
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Error iniciando sesión admin');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f2f2f7', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: APP_FONT }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        button, input { font-family: ${APP_FONT}; }
      `}</style>

      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 420, background: '#fff', borderRadius: 28, padding: 30, boxShadow: '0 12px 32px rgba(0,0,0,0.08)' }}>
        <div
          style={{
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
          }}
        >
          <TuAgendaLogo height={44} />
        </div>

        <h1 style={{ fontSize: 24, margin: '0 0 6px', color: '#1a1a1a', fontWeight: 900 }}>Panel dueño</h1>
        <p style={{ margin: '0 0 22px', color: '#6e6e73', lineHeight: 1.45, fontSize: 14 }}>
          Entrá como administrador para ver todos los negocios registrados en TuAgendaYa.
        </p>

        <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#6e6e73', marginBottom: 6 }}>Email admin</label>
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          placeholder="Email"
          autoComplete="email"
          style={{ width: '100%', border: '1px solid #dcdce3', borderRadius: 14, padding: '13px 14px', fontSize: 15, outline: 'none', marginBottom: 14 }}
        />

        <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#6e6e73', marginBottom: 6 }}>Contraseña</label>
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          placeholder="Contraseña"
          autoComplete="current-password"
          style={{ width: '100%', border: '1px solid #dcdce3', borderRadius: 14, padding: '13px 14px', fontSize: 15, outline: 'none', marginBottom: 16 }}
        />

        {error && (
          <div style={{ background: '#fff0f0', color: '#d92d20', borderRadius: 14, padding: 12, fontSize: 13, fontWeight: 700, marginBottom: 14 }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', border: 'none', borderRadius: 15, background: loading ? '#9ecbff' : '#0071e3', color: '#fff', padding: '14px 16px', fontSize: 15, fontWeight: 900, cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Entrando...' : 'Entrar al panel admin'}
        </button>
      </form>
    </div>
  );
}

function AdminDashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [professionals, setProfessionals] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [selectedBusinessBookings, setSelectedBusinessBookings] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const token = localStorage.getItem('tuagendaya_admin_token');

  const adminFetch = useCallback(async (path, options = {}) => {
    const currentToken = localStorage.getItem('tuagendaya_admin_token');

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentToken}`,
        ...(options.headers || {}),
      },
    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem('tuagendaya_admin_token');
      localStorage.removeItem('tuagendaya_admin_user');
      navigate('/admin/login', { replace: true });
      throw new Error(data.error || 'Sesión admin vencida');
    }

    if (!response.ok) {
      throw new Error(data.error || 'Error de administración');
    }

    return data;
  }, [navigate]);

  const loadAdminData = useCallback(async () => {
    setError('');

    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (status !== 'all') params.set('status', status);

      const [statsData, professionalsData] = await Promise.all([
        adminFetch('/admin/stats'),
        adminFetch(`/admin/professionals?${params.toString()}`),
      ]);

      setStats(statsData);
      setProfessionals(professionalsData.professionals || []);
    } catch (err) {
      setError(err.message || 'Error cargando panel admin');
    } finally {
      setLoading(false);
    }
  }, [adminFetch, search, status]);

  useEffect(() => {
    if (!token) {
      navigate('/admin/login', { replace: true });
      return;
    }

    loadAdminData();
  }, [token, navigate, loadAdminData]);

  useEffect(() => {
    if (!token) return;
    const timer = setInterval(loadAdminData, 10000);
    return () => clearInterval(timer);
  }, [token, loadAdminData]);

  const handleLogout = () => {
    localStorage.removeItem('tuagendaya_admin_token');
    localStorage.removeItem('tuagendaya_admin_user');
    navigate('/admin/login', { replace: true });
  };

  const updateStatus = async (professional, nextStatus) => {
    const actionLabel = nextStatus === 'suspended' ? 'suspender' : 'activar';
    const businessName = professional.businessName || professional.name || 'este negocio';

    const confirmed = window.confirm(`¿Seguro que querés ${actionLabel} ${businessName}?`);
    if (!confirmed) return;

    try {
      await adminFetch(`/admin/professionals/${professional.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });

      setSelectedBusiness((current) => {
        if (!current || current.id !== professional.id) return current;
        return { ...current, status: nextStatus };
      });

      await loadAdminData();
    } catch (err) {
      alert(err.message || 'No se pudo actualizar el negocio');
    }
  };

  const openBusinessDetail = async (professional) => {
    setDetailError('');
    setDetailLoading(true);
    setSelectedBusiness(professional);
    setSelectedBusinessBookings([]);

    try {
      const data = await adminFetch(`/admin/professionals/${professional.id}`);
      setSelectedBusiness(data.professional || professional);
      setSelectedBusinessBookings(data.latestBookings || []);
    } catch (err) {
      setDetailError(err.message || 'No se pudo cargar el detalle del negocio');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeBusinessDetail = () => {
    setSelectedBusiness(null);
    setSelectedBusinessBookings([]);
    setDetailError('');
    setDetailLoading(false);
  };

  const copyText = async (text, label = 'Copiado') => {
    if (!text) return;

    try {
      await navigator.clipboard?.writeText(text);
      alert(label);
    } catch {
      alert('No se pudo copiar automáticamente');
    }
  };

  const statCards = [
    { label: 'Negocios', value: stats?.professionals?.total || 0, color: '#0071e3', bg: '#eef6ff' },
    { label: 'Activos', value: stats?.professionals?.active || 0, color: '#21c55d', bg: '#edfff3' },
    { label: 'Suspendidos', value: stats?.professionals?.suspended || 0, color: '#ff3b30', bg: '#fff0f0' },
    { label: 'Reservas totales', value: stats?.bookings?.total || 0, color: '#5856d6', bg: '#f1f0ff' },
    { label: 'Reservas este mes', value: stats?.bookings?.monthly || 0, color: '#0071e3', bg: '#eef6ff' },
    { label: 'Reservas hoy', value: stats?.bookings?.today || 0, color: '#ff9500', bg: '#fff7e8' },
    { label: 'Clientes', value: stats?.clients?.total || 0, color: '#111827', bg: '#f4f4f8' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f2f2f7', padding: '22px 16px', fontFamily: APP_FONT }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        button, input, select { font-family: ${APP_FONT}; }
        @media (max-width: 760px) {
          .admin-grid { grid-template-columns: 1fr !important; }
          .admin-header { flex-direction: column !important; align-items: stretch !important; }
          .admin-filters { grid-template-columns: 1fr !important; }
          .admin-business-metrics { grid-template-columns: 1fr !important; }
          .admin-business-actions { grid-template-columns: 1fr !important; }
          .admin-detail-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ maxWidth: 1040, margin: '0 auto' }}>
        <div className="admin-header" style={{ background: '#fff', borderRadius: 26, padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18, boxShadow: '0 1px 10px rgba(0,0,0,0.06)', marginBottom: 18 }}>
          <div>
            <TuAgendaLogo height={42} />
            <h1 style={{ margin: '18px 0 6px', color: '#1a1a1a', fontSize: 25, fontWeight: 900 }}>Panel dueño de TuAgendaYa</h1>
            <p style={{ margin: 0, color: '#6e6e73', fontSize: 14, lineHeight: 1.45 }}>Control general de negocios, reservas y clientes registrados.</p>
          </div>

          <button onClick={handleLogout} style={{ border: '1px solid #e0e0e5', background: '#fff', borderRadius: 14, padding: '10px 16px', color: '#6e6e73', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
            Cerrar sesión
          </button>
        </div>

        {error && (
          <div style={{ background: '#fff0f0', color: '#d92d20', borderRadius: 18, padding: 14, fontSize: 14, fontWeight: 800, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div className="admin-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 18 }}>
          {statCards.map((card) => (
            <div key={card.label} style={{ background: card.bg, borderRadius: 18, padding: 16, border: '1px solid rgba(0,0,0,0.04)' }}>
              <div style={{ color: card.color, fontSize: 24, fontWeight: 900, marginBottom: 6 }}>{card.value}</div>
              <div style={{ color: '#6e6e73', fontSize: 12, fontWeight: 800 }}>{card.label}</div>
            </div>
          ))}
        </div>

        <div style={{ background: '#fff', borderRadius: 24, padding: 22, boxShadow: '0 1px 10px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <h2 style={{ margin: '0 0 6px', color: '#1a1a1a', fontSize: 20, fontWeight: 900 }}>Negocios registrados</h2>
              <p style={{ margin: 0, color: '#6e6e73', fontSize: 13 }}>Ver detalle, copiar link público, activar o suspender negocios.</p>
            </div>
          </div>

          <div className="admin-filters" style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: 10, marginBottom: 16 }}>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por negocio, email, slug o rubro"
              style={{ width: '100%', border: '1px solid #dcdce3', borderRadius: 14, padding: '12px 14px', outline: 'none', fontSize: 14 }}
            />
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              style={{ width: '100%', border: '1px solid #dcdce3', borderRadius: 14, padding: '12px 14px', outline: 'none', fontSize: 14, background: '#fff' }}
            >
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="suspended">Suspendidos</option>
            </select>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#8e8e93', fontSize: 15 }}>Cargando negocios...</div>
          ) : professionals.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#8e8e93', fontSize: 15 }}>No hay negocios para mostrar.</div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {professionals.map((professional) => {
                const publicUrl = professional.slug ? `https://tuagendaya-web.onrender.com/reservar/${professional.slug}` : '';
                const isActive = professional.status !== 'suspended';
                const planName = professional.plan || 'Profesional';
                const monthlyLimit = Number(professional.monthlyLimit || professional.monthly_limit || 1000);
                const monthlyUsed = Number(professional.monthlyBookingsCount || professional.monthly_bookings_count || 0);
                const monthlyPercent = monthlyLimit > 0 ? Math.min(100, Math.round((monthlyUsed / monthlyLimit) * 100)) : 0;

                return (
                  <div key={professional.id} style={{ border: '1px solid #e8e8ed', borderRadius: 18, padding: 16, background: '#fff', display: 'grid', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ color: '#1a1a1a', fontSize: 16, fontWeight: 900 }}>
                          {professional.businessName || professional.name || 'Negocio sin nombre'}
                        </div>
                        <div style={{ color: '#6e6e73', fontSize: 13, marginTop: 4 }}>
                          {professional.email || 'Sin email'} · {professional.profession || 'Sin rubro'}
                        </div>
                        {publicUrl && (
                          <a href={publicUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 6, color: '#0071e3', fontSize: 13, fontWeight: 800, textDecoration: 'none' }}>
                            Abrir link público
                          </a>
                        )}
                      </div>

                      <span style={{ borderRadius: 999, padding: '6px 10px', fontSize: 12, fontWeight: 900, background: isActive ? '#edfff3' : '#fff0f0', color: isActive ? '#188038' : '#ff3b30' }}>
                        {isActive ? 'Activo' : 'Suspendido'}
                      </span>
                    </div>

                    <div className="admin-business-metrics" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
                      <div style={{ background: '#eef6ff', borderRadius: 14, padding: 12 }}>
                        <div style={{ fontSize: 15, fontWeight: 900, color: '#0071e3' }}>{planName}</div>
                        <div style={{ fontSize: 12, color: '#6e6e73', fontWeight: 800 }}>Plan</div>
                      </div>
                      <div style={{ background: '#f7f7fb', borderRadius: 14, padding: 12 }}>
                        <div style={{ fontSize: 18, fontWeight: 900, color: '#1a1a1a' }}>{monthlyUsed}/{monthlyLimit}</div>
                        <div style={{ fontSize: 12, color: '#8e8e93', fontWeight: 800 }}>Reservas del mes</div>
                        <div style={{ marginTop: 8, height: 6, borderRadius: 999, background: '#e5e5ea', overflow: 'hidden' }}>
                          <div style={{ width: `${monthlyPercent}%`, height: '100%', borderRadius: 999, background: monthlyPercent >= 90 ? '#ff3b30' : '#0071e3' }} />
                        </div>
                      </div>
                      <div style={{ background: '#f7f7fb', borderRadius: 14, padding: 12 }}>
                        <div style={{ fontSize: 18, fontWeight: 900, color: '#1a1a1a' }}>{professional.bookingsCount || 0}</div>
                        <div style={{ fontSize: 12, color: '#8e8e93', fontWeight: 800 }}>Reservas totales</div>
                      </div>
                      <div style={{ background: '#f7f7fb', borderRadius: 14, padding: 12 }}>
                        <div style={{ fontSize: 18, fontWeight: 900, color: '#1a1a1a' }}>{professional.clientsCount || 0}</div>
                        <div style={{ fontSize: 12, color: '#8e8e93', fontWeight: 800 }}>Clientes</div>
                      </div>
                    </div>

                    <div className="admin-business-actions" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                      <button
                        type="button"
                        onClick={() => openBusinessDetail(professional)}
                        style={{ border: 'none', borderRadius: 14, padding: '11px 14px', background: '#0071e3', color: '#fff', fontWeight: 900, cursor: 'pointer' }}
                      >
                        Ver detalle
                      </button>
                      <button
                        type="button"
                        onClick={() => updateStatus(professional, isActive ? 'suspended' : 'active')}
                        style={{ border: 'none', borderRadius: 14, padding: '11px 14px', background: isActive ? '#ff3b30' : '#21c55d', color: '#fff', fontWeight: 900, cursor: 'pointer' }}
                      >
                        {isActive ? 'Suspender negocio' : 'Activar negocio'}
                      </button>
                      <button
                        type="button"
                        onClick={() => copyText(publicUrl, 'Link público copiado')}
                        disabled={!publicUrl}
                        style={{ border: '1px solid #dcdce3', borderRadius: 14, padding: '11px 14px', background: '#fff', color: '#0071e3', fontWeight: 900, cursor: publicUrl ? 'pointer' : 'not-allowed' }}
                      >
                        Copiar link
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selectedBusiness && (
        <div
          role="presentation"
          onClick={closeBusinessDetail}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.32)',
            zIndex: 9999,
            padding: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            role="presentation"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: 'min(920px, 100%)',
              maxHeight: '88vh',
              overflowY: 'auto',
              background: '#fff',
              borderRadius: 28,
              padding: 24,
              boxShadow: '0 18px 60px rgba(0,0,0,0.22)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 13, color: '#8e8e93', fontWeight: 900, marginBottom: 4 }}>Detalle del negocio</div>
                <h2 style={{ margin: 0, fontSize: 24, color: '#1a1a1a', fontWeight: 900 }}>{selectedBusiness.businessName || selectedBusiness.name || 'Negocio'}</h2>
                <p style={{ margin: '8px 0 0', color: '#6e6e73', fontSize: 14 }}>{selectedBusiness.email || 'Sin email'} · {selectedBusiness.profession || 'Sin rubro'}</p>
              </div>
              <button type="button" onClick={closeBusinessDetail} style={{ border: '1px solid #e1e1e8', background: '#fff', borderRadius: 14, padding: '9px 13px', fontWeight: 900, cursor: 'pointer' }}>
                Cerrar
              </button>
            </div>

            {detailError && (
              <div style={{ background: '#fff0f0', color: '#d92d20', borderRadius: 16, padding: 13, fontSize: 14, fontWeight: 800, marginBottom: 14 }}>
                {detailError}
              </div>
            )}

            {detailLoading ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#8e8e93', fontWeight: 800 }}>Cargando detalle...</div>
            ) : (
              <>
                <div className="admin-detail-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 10, marginBottom: 16 }}>
                  <div style={{ background: '#eef6ff', borderRadius: 16, padding: 14 }}>
                    <div style={{ fontSize: 15, fontWeight: 900, color: '#0071e3' }}>{selectedBusiness.plan || 'Profesional'}</div>
                    <div style={{ color: '#8e8e93', fontSize: 12, fontWeight: 800 }}>Plan</div>
                  </div>
                  <div style={{ background: '#f7f7fb', borderRadius: 16, padding: 14 }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: '#1a1a1a' }}>{Number(selectedBusiness.monthlyBookingsCount || selectedBusiness.monthly_bookings_count || 0)}/{Number(selectedBusiness.monthlyLimit || selectedBusiness.monthly_limit || 1000)}</div>
                    <div style={{ color: '#8e8e93', fontSize: 12, fontWeight: 800 }}>Reservas del mes</div>
                  </div>
                  <div style={{ background: '#f7f7fb', borderRadius: 16, padding: 14 }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: '#0071e3' }}>{selectedBusiness.bookingsCount || 0}</div>
                    <div style={{ color: '#8e8e93', fontSize: 12, fontWeight: 800 }}>Reservas totales</div>
                  </div>
                  <div style={{ background: '#f7f7fb', borderRadius: 16, padding: 14 }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: '#111827' }}>{selectedBusiness.clientsCount || 0}</div>
                    <div style={{ color: '#8e8e93', fontSize: 12, fontWeight: 800 }}>Clientes</div>
                  </div>
                  <div style={{ background: selectedBusiness.status === 'suspended' ? '#fff0f0' : '#edfff3', borderRadius: 16, padding: 14 }}>
                    <div style={{ fontSize: 15, fontWeight: 900, color: selectedBusiness.status === 'suspended' ? '#ff3b30' : '#188038' }}>{selectedBusiness.status === 'suspended' ? 'Suspendido' : 'Activo'}</div>
                    <div style={{ color: '#8e8e93', fontSize: 12, fontWeight: 800 }}>Estado</div>
                  </div>
                  <div style={{ background: '#f7f7fb', borderRadius: 16, padding: 14 }}>
                    <div style={{ fontSize: 15, fontWeight: 900, color: '#1a1a1a' }}>{selectedBusiness.createdAt ? new Date(selectedBusiness.createdAt).toLocaleDateString('es-UY') : '-'}</div>
                    <div style={{ color: '#8e8e93', fontSize: 12, fontWeight: 800 }}>Registro</div>
                  </div>
                </div>

                <div style={{ border: '1px solid #e8e8ed', borderRadius: 18, padding: 16, marginBottom: 16 }}>
                  <h3 style={{ margin: '0 0 10px', fontSize: 16, fontWeight: 900, color: '#1a1a1a' }}>Datos del negocio</h3>
                  <div style={{ display: 'grid', gap: 7, color: '#6e6e73', fontSize: 14, lineHeight: 1.35 }}>
                    <div><strong style={{ color: '#1a1a1a' }}>Dueño:</strong> {selectedBusiness.name || '-'}</div>
                    <div><strong style={{ color: '#1a1a1a' }}>Teléfono:</strong> {selectedBusiness.phone || '-'}</div>
                    <div><strong style={{ color: '#1a1a1a' }}>Dirección:</strong> {selectedBusiness.address || '-'}</div>
                    <div><strong style={{ color: '#1a1a1a' }}>Slug:</strong> {selectedBusiness.slug || '-'}</div>
                    <div><strong style={{ color: '#1a1a1a' }}>Plan:</strong> {selectedBusiness.plan || 'Profesional'}</div>
                    <div><strong style={{ color: '#1a1a1a' }}>Límite mensual:</strong> {Number(selectedBusiness.monthlyLimit || selectedBusiness.monthly_limit || 1000)} reservas</div>
                    <div><strong style={{ color: '#1a1a1a' }}>Reservas usadas este mes:</strong> {Number(selectedBusiness.monthlyBookingsCount || selectedBusiness.monthly_bookings_count || 0)}</div>
                    <div><strong style={{ color: '#1a1a1a' }}>Link público:</strong> {selectedBusiness.slug ? `https://tuagendaya-web.onrender.com/reservar/${selectedBusiness.slug}` : '-'}</div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
                    <button
                      type="button"
                      onClick={() => updateStatus(selectedBusiness, selectedBusiness.status === 'suspended' ? 'active' : 'suspended')}
                      style={{ border: 'none', borderRadius: 14, padding: '11px 14px', background: selectedBusiness.status === 'suspended' ? '#21c55d' : '#ff3b30', color: '#fff', fontWeight: 900, cursor: 'pointer' }}
                    >
                      {selectedBusiness.status === 'suspended' ? 'Activar negocio' : 'Suspender negocio'}
                    </button>
                    <button
                      type="button"
                      onClick={() => copyText(selectedBusiness.slug ? `https://tuagendaya-web.onrender.com/reservar/${selectedBusiness.slug}` : '', 'Link público copiado')}
                      style={{ border: '1px solid #dcdce3', borderRadius: 14, padding: '11px 14px', background: '#fff', color: '#0071e3', fontWeight: 900, cursor: 'pointer' }}
                    >
                      Copiar link público
                    </button>
                  </div>
                </div>

                <div style={{ border: '1px solid #e8e8ed', borderRadius: 18, padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginBottom: 12 }}>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#1a1a1a' }}>Últimas reservas</h3>
                    <span style={{ color: '#8e8e93', fontSize: 12, fontWeight: 800 }}>Máximo 50</span>
                  </div>

                  {selectedBusinessBookings.length === 0 ? (
                    <div style={{ padding: 20, color: '#8e8e93', fontSize: 14, textAlign: 'center' }}>Este negocio todavía no tiene reservas.</div>
                  ) : (
                    <div style={{ display: 'grid', gap: 8 }}>
                      {selectedBusinessBookings.map((booking) => (
                        <div key={booking.id} style={{ background: '#f7f7fb', borderRadius: 14, padding: 12, display: 'grid', gap: 4 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                            <strong style={{ color: '#1a1a1a', fontSize: 14 }}>{booking.client_name || 'Cliente sin nombre'}</strong>
                            <span style={{ fontSize: 12, color: '#6e6e73', fontWeight: 800 }}>{booking.status || 'pending'}</span>
                          </div>
                          <div style={{ color: '#6e6e73', fontSize: 13 }}>
                            {booking.service_name || 'Servicio'} · {booking.staff_name || 'Sin profesional asignado'}
                          </div>
                          <div style={{ color: '#8e8e93', fontSize: 12, fontWeight: 800 }}>
                            {formatDate(booking.booking_date)} · {formatTime(booking.start_time) || '--:--'} a {formatTime(booking.end_time) || '--:--'} · {booking.client_phone || 'Sin teléfono'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ProfesionalPage() {
  const [professional, setProfessional] = useState(() => {
    const token = localStorage.getItem('tuagendaya_token');
    if (!token) return null;

    try {
      return JSON.parse(localStorage.getItem('tuagendaya_professional'));
    } catch {
      return {};
    }
  });

  const handleProfessionalUpdate = (updatedProfessional) => {
    const normalized = normalizeProfessionalFromApi({
      ...(professional || {}),
      ...(updatedProfessional || {}),
    });

    setProfessional(normalized);
    localStorage.setItem('tuagendaya_professional', JSON.stringify(normalized));
  };

  if (!professional) {
    return <LoginForm onLogin={(prof) => setProfessional(normalizeProfessionalFromApi(prof || {}))} />;
  }

  return (
    <Dashboard
      professional={professional}
      onLogout={() => setProfessional(null)}
      onProfileUpdated={handleProfessionalUpdate}
    />
  );
}


function MobileViewportController() {
  useEffect(() => {
    const viewportContent = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';
    let viewport = document.querySelector('meta[name="viewport"]');

    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.setAttribute('name', 'viewport');
      document.head.appendChild(viewport);
    }

    viewport.setAttribute('content', viewportContent);

    const styleId = 'tuagendaya-mobile-zoom-fix';
    let style = document.getElementById(styleId);

    if (!style) {
      style = document.createElement('style');
      style.id = styleId;
      document.head.appendChild(style);
    }

    style.innerHTML = `
      html {
        -webkit-text-size-adjust: 100%;
        text-size-adjust: 100%;
        width: 100%;
        overflow-x: hidden;
      }

      body {
        width: 100%;
        min-width: 0;
        overflow-x: hidden;
        overscroll-behavior-x: none;
      }

      #root {
        width: 100%;
        min-width: 0;
        overflow-x: hidden;
      }

      *, *::before, *::after {
        box-sizing: border-box;
      }

      button,
      a,
      [role="button"],
      input,
      textarea,
      select {
        touch-action: manipulation;
      }

      @media (max-width: 768px) {
        input,
        textarea,
        select {
          font-size: 16px !important;
          line-height: 1.35 !important;
        }

        input::placeholder,
        textarea::placeholder {
          font-size: 16px !important;
          color: #a8a8b0 !important;
          opacity: 1 !important;
          font-weight: 500 !important;
        }

        button {
          min-height: 44px;
        }
      }
    `;
  }, []);

  return null;
}


function LandingPage() {
  const navigate = useNavigate();

  const howItWorks = [
    {
      title: 'Creá tu cuenta',
      text: 'Registrás tu negocio, elegís tu rubro y dejás tu link público listo para compartir.',
    },
    {
      title: 'Configurá tu agenda',
      text: 'Cargás servicios con precio y duración, disponibilidad y profesionales del negocio.',
    },
    {
      title: 'Compartís tu link',
      text: 'Tus clientes entran desde el celular y reservan sin escribirte para consultar horarios.',
    },
    {
      title: 'Gestionás todo',
      text: 'Ves reservas, clientes, historial, WhatsApp, asistencias y estadísticas desde un panel tipo app.',
    },
  ];

  const included = [
    'Link público propio para reservas',
    'Servicios con precio y duración',
    'Profesionales del negocio',
    'Calendario y horarios disponibles',
    'Clientes automáticos e historial',
    'Notas internas por cliente',
    'Reservas de hoy, próximas y archivadas',
    'WhatsApp manual con mensaje listo',
    'Estadísticas simples del negocio',
    'Panel instalable como app en celular',
  ];

  const businessTypes = [
    'Barberías',
    'Peluquerías',
    'Odontólogos',
    'Psicólogos',
    'Estéticas',
    'Manicura y uñas',
    'Veterinarias',
    'Clínicas',
    'Entrenadores',
    'Fotógrafos',
    'Consultorios',
    'Servicios profesionales',
  ];

  const faqs = [
    {
      q: '¿El cliente necesita descargar una app?',
      a: 'No. El cliente reserva desde un link web del negocio. El profesional sí puede instalar el panel como app en su celular.',
    },
    {
      q: '¿WhatsApp automático está incluido?',
      a: 'WhatsApp manual queda incluido. El automático se activa cuando el negocio conecta WhatsApp Business.',
    },
    {
      q: '¿Puedo tener varios profesionales?',
      a: 'Sí. Podés agregar profesionales del negocio y que el cliente elija con quién reservar.',
    },
    {
      q: '¿Qué pasa con las reservas viejas?',
      a: 'Se archivan automáticamente por fecha para que tengas historial sin ensuciar la agenda del día.',
    },
  ];

  const quickStats = [
    ['Reservas hoy', '4'],
    ['Confirmadas', '3'],
    ['Canceladas', '0'],
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #f7fbff 0%, #f5f5f7 38%, #ffffff 100%)',
        color: '#111827',
        fontFamily: APP_FONT,
        overflowX: 'hidden',
      }}
    >
      <style>
        {`
          .landing-shell {
            max-width: 1180px;
            margin: 0 auto;
            padding: 24px 22px 56px;
          }

          .landing-glass {
            background: rgba(255,255,255,0.88);
            border: 1px solid rgba(226,232,240,0.95);
            box-shadow: 0 18px 48px rgba(15,23,42,0.06);
          }

          .landing-button-primary,
          .landing-button-secondary {
            border-radius: 18px;
            padding: 15px 22px;
            font-size: 16px;
            font-weight: 850;
            font-family: inherit;
            cursor: pointer;
            transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
          }

          .landing-button-primary:hover,
          .landing-button-secondary:hover,
          .landing-card:hover {
            transform: translateY(-1px);
          }

          @media (max-width: 760px) {
            .landing-shell { padding: 16px 13px 34px !important; }
            .landing-nav { top: 8px !important; border-radius: 22px !important; padding: 12px 14px !important; }
            .landing-nav-actions { display: none !important; }
            .landing-hero { grid-template-columns: 1fr !important; padding: 24px 17px !important; border-radius: 30px !important; gap: 22px !important; }
            .landing-title { font-size: 36px !important; line-height: 1.08 !important; letter-spacing: -0.8px !important; font-weight: 880 !important; }
            .landing-subtitle { font-size: 16px !important; line-height: 1.62 !important; letter-spacing: 0 !important; }
            .landing-actions { grid-template-columns: 1fr !important; }
            .landing-preview { min-height: auto !important; padding: 8px !important; border-radius: 28px !important; }
            .landing-preview-inner { min-height: auto !important; border-radius: 24px !important; }
            .landing-grid-4,
            .landing-grid-3,
            .landing-grid-2,
            .landing-plan { grid-template-columns: 1fr !important; }
            .landing-section { border-radius: 28px !important; padding: 20px !important; }
            .landing-section-title { font-size: 26px !important; line-height: 1.16 !important; letter-spacing: -0.35px !important; }
            .landing-floating-cta { left: 13px !important; right: 13px !important; bottom: 14px !important; display: grid !important; grid-template-columns: 1fr 1fr !important; }
          }
        `}
      </style>

      <main className="landing-shell">
        <nav
          className="landing-nav landing-glass"
          style={{
            position: 'sticky',
            top: 12,
            zIndex: 20,
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            borderRadius: 28,
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            marginBottom: 22,
          }}
        >
          <button
            type="button"
            onClick={() => navigate('/')}
            style={{
              border: 'none',
              background: 'transparent',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <TuAgendaLogo height={35} />
          </button>

          <div className="landing-nav-actions" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={() => navigate('/profesional/login')}
              style={{
                border: '1px solid #d7dce5',
                background: '#fff',
                color: '#111827',
                borderRadius: 999,
                padding: '10px 16px',
                fontSize: 14,
                fontWeight: 850,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Ingresar
            </button>
            <button
              type="button"
              onClick={() => navigate('/profesional/register')}
              style={{
                border: 'none',
                background: '#0071e3',
                color: '#fff',
                borderRadius: 999,
                padding: '11px 18px',
                fontSize: 14,
                fontWeight: 950,
                cursor: 'pointer',
                fontFamily: 'inherit',
                boxShadow: '0 10px 24px rgba(0,113,227,0.22)',
              }}
            >
              Crear cuenta
            </button>
          </div>
        </nav>

        <section
          className="landing-hero landing-glass"
          style={{
            display: 'grid',
            gridTemplateColumns: '1.05fr 0.95fr',
            gap: 24,
            alignItems: 'center',
            borderRadius: 40,
            padding: 36,
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: '#eaf4ff',
                color: '#0066cc',
                borderRadius: 999,
                padding: '8px 12px',
                fontSize: 13,
                fontWeight: 820,
                letterSpacing: '0.1px',
                marginBottom: 18,
              }}
            >
              Agenda online para negocios y profesionales
            </div>

            <h1
              className="landing-title"
              style={{
                margin: 0,
                fontSize: 56,
                lineHeight: 1.08,
                letterSpacing: '-1.15px',
                fontWeight: 880,
                color: '#0f172a',
              }}
            >
              Tu agenda, tus clientes y tus reservas en un solo lugar.
            </h1>

            <p
              className="landing-subtitle"
              style={{
                margin: '20px 0 0',
                color: '#5f6470',
                fontSize: 18,
                lineHeight: 1.66,
                letterSpacing: '0px',
                maxWidth: 610,
                fontWeight: 600,
              }}
            >
              Creá tu link de reservas, configurá servicios y horarios, gestioná clientes, historial, WhatsApp y estadísticas desde un panel profesional instalable como app.
            </p>

            <div className="landing-actions" style={{ display: 'grid', gridTemplateColumns: 'auto auto', gap: 12, marginTop: 26, maxWidth: 460 }}>
              <button
                className="landing-button-primary"
                type="button"
                onClick={() => navigate('/profesional/register')}
                style={{
                  border: 'none',
                  background: '#0071e3',
                  color: '#fff',
                  boxShadow: '0 14px 30px rgba(0,113,227,0.24)',
                }}
              >
                Crear cuenta
              </button>
              <button
                className="landing-button-secondary"
                type="button"
                onClick={() => navigate('/profesional/login')}
                style={{
                  border: '1px solid #d7dce5',
                  background: '#fff',
                  color: '#111827',
                }}
              >
                Ingresar
              </button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 22 }}>
              {['Hasta 1000 reservas/mes', 'WhatsApp manual', 'Clientes e historial', 'App instalable'].map((item) => (
                <span
                  key={item}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e5e7eb',
                    borderRadius: 999,
                    padding: '8px 11px',
                    color: '#475569',
                    fontSize: 13,
                    fontWeight: 760,
                    letterSpacing: '0.05px',
                  }}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div
            className="landing-preview"
            style={{
              minHeight: 470,
              background: 'linear-gradient(180deg, rgba(234,244,255,0.88), rgba(255,255,255,0.98))',
              border: '1px solid #0071e3',
              borderRadius: 34,
              padding: 10,
              boxShadow: '0 18px 42px rgba(0,113,227,0.12), 0 22px 50px rgba(15,23,42,0.06)',
              overflow: 'hidden',
            }}
          >
            <div className="landing-preview-inner" style={{ background: '#f8fafc', borderRadius: 28, padding: 18, height: '100%', minHeight: 430, border: '0.5px solid rgba(226,232,240,0.95)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 12, color: '#64748b', fontWeight: 820, letterSpacing: '0.1px' }}>Panel profesional</div>
                  <div style={{ fontSize: 23, color: '#0f172a', fontWeight: 880, letterSpacing: '-0.25px' }}>Reservas de hoy</div>
                </div>
                <div style={{ width: 52, height: 52, borderRadius: 18, background: '#eaf4ff', display: 'grid', placeItems: 'center', color: '#0071e3', fontWeight: 950 }}>4</div>
              </div>

              {[
                ['09:30', 'Juan Pérez', 'Consulta inicial', 'Confirmada'],
                ['10:20', 'Ana Silva', 'Limpieza dental', 'Pendiente'],
                ['11:10', 'Carlos Díaz', 'Control', 'Confirmada'],
              ].map((row) => (
                <div key={row[0]} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 20, padding: 14, marginBottom: 10, boxShadow: '0 4px 14px rgba(15,23,42,0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 13, color: '#0071e3', fontWeight: 950 }}>{row[0]}</div>
                      <div style={{ fontSize: 16, color: '#111827', fontWeight: 950 }}>{row[1]}</div>
                      <div style={{ fontSize: 13, color: '#64748b', fontWeight: 750 }}>{row[2]}</div>
                    </div>
                    <span style={{ alignSelf: 'flex-start', borderRadius: 999, padding: '6px 9px', background: row[3] === 'Confirmada' ? '#ecfdf5' : '#fffbeb', color: row[3] === 'Confirmada' ? '#047857' : '#b45309', fontSize: 11, fontWeight: 950 }}>{row[3]}</span>
                  </div>
                </div>
              ))}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
                {quickStats.slice(0, 2).map(([label, value]) => (
                  <div key={label} style={{ background: '#fff', borderRadius: 20, padding: 14, border: '1px solid #e5e7eb' }}>
                    <div style={{ color: '#64748b', fontSize: 12, fontWeight: 900 }}>{label}</div>
                    <div style={{ color: '#0f172a', fontSize: 25, fontWeight: 950 }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="landing-section" style={{ marginTop: 24 }}>
          <div className="landing-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14 }}>
            {[
              ['Reservas online', 'Tus clientes eligen servicio, profesional, día y hora desde tu link público.'],
              ['Panel tipo app', 'Gestionás todo desde celular o computadora, con experiencia simple y ordenada.'],
              ['Clientes automáticos', 'Cada reserva alimenta una ficha de cliente con historial, asistencias y notas.'],
              ['WhatsApp listo', 'Abrís WhatsApp con el mensaje armado para confirmar o contactar al cliente.'],
            ].map(([title, text]) => (
              <article key={title} className="landing-card" style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 26, padding: 20, boxShadow: '0 10px 30px rgba(15,23,42,0.04)' }}>
                <h3 style={{ margin: '0 0 8px', fontSize: 18, color: '#0f172a', fontWeight: 860, letterSpacing: '-0.08px' }}>{title}</h3>
                <p style={{ margin: 0, color: '#64748b', fontSize: 14, lineHeight: 1.55, fontWeight: 600, letterSpacing: '0px' }}>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section landing-glass" style={{ marginTop: 24, borderRadius: 34, padding: 26 }}>
          <h2 className="landing-section-title" style={{ margin: '0 0 16px', color: '#0f172a', fontSize: 31, lineHeight: 1.18, letterSpacing: '-0.45px', fontWeight: 880 }}>Cómo funciona</h2>
          <div className="landing-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
            {howItWorks.map((step, index) => (
              <div key={step.title} style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 23, padding: 17 }}>
                <div style={{ width: 36, height: 36, borderRadius: 14, background: '#0071e3', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 950, marginBottom: 11 }}>{index + 1}</div>
                <div style={{ color: '#111827', fontSize: 16, lineHeight: 1.25, fontWeight: 950 }}>{step.title}</div>
                <p style={{ margin: '7px 0 0', color: '#64748b', lineHeight: 1.5, fontSize: 13.5, fontWeight: 650 }}>{step.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="landing-plan" style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'stretch' }}>
          <div style={{ background: '#0f172a', color: '#fff', borderRadius: 34, padding: 28, boxShadow: '0 18px 48px rgba(15,23,42,0.16)' }}>
            <div style={{ color: '#93c5fd', fontSize: 14, fontWeight: 950, marginBottom: 8 }}>Plan Profesional</div>
            <h2 style={{ margin: 0, fontSize: 36, letterSpacing: '-1.1px', fontWeight: 950 }}>Una agenda completa, simple de vender y fácil de usar.</h2>
            <p style={{ color: '#cbd5e1', lineHeight: 1.58, fontSize: 15, fontWeight: 650 }}>
              Hasta 1000 reservas mensuales, servicios con precio y duración, profesionales, clientes, historial, WhatsApp manual, estadísticas y panel instalable como app.
            </p>
            <button
              type="button"
              onClick={() => navigate('/profesional/register')}
              style={{ marginTop: 14, border: 'none', borderRadius: 18, background: '#fff', color: '#0f172a', padding: '14px 18px', fontSize: 15, fontWeight: 950, fontFamily: 'inherit', cursor: 'pointer' }}
            >
              Empezar ahora
            </button>
          </div>

          <div className="landing-glass" style={{ borderRadius: 34, padding: 26 }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 22, color: '#0f172a', fontWeight: 950 }}>Qué incluye</h3>
            <div style={{ display: 'grid', gap: 9 }}>
              {included.map((item) => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#334155', fontSize: 14, fontWeight: 750 }}>
                  <span style={{ width: 22, height: 22, borderRadius: 8, background: '#eaf4ff', color: '#0071e3', display: 'grid', placeItems: 'center', fontWeight: 950, flex: '0 0 auto' }}>✓</span>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-section landing-glass" style={{ marginTop: 24, borderRadius: 34, padding: 26 }}>
          <h2 className="landing-section-title" style={{ margin: '0 0 10px', color: '#0f172a', fontSize: 31, lineHeight: 1.18, letterSpacing: '-0.45px', fontWeight: 880 }}>Para quién es</h2>
          <p style={{ margin: '0 0 18px', color: '#64748b', fontSize: 15, lineHeight: 1.55, fontWeight: 650 }}>
            Pensado para negocios y profesionales que viven de turnos, horarios y atención al cliente.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {businessTypes.map((item) => (
              <span key={item} style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 999, padding: '10px 13px', color: '#334155', fontWeight: 850, fontSize: 13 }}>{item}</span>
            ))}
          </div>
        </section>

        <section className="landing-section" style={{ marginTop: 24 }}>
          <div className="landing-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {faqs.map((item) => (
              <article key={item.q} className="landing-card" style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 27, padding: 22, boxShadow: '0 10px 30px rgba(15,23,42,0.04)' }}>
                <h3 style={{ margin: '0 0 8px', color: '#0f172a', fontSize: 17, fontWeight: 950 }}>{item.q}</h3>
                <p style={{ margin: 0, color: '#64748b', lineHeight: 1.55, fontSize: 14, fontWeight: 650 }}>{item.a}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          style={{
            marginTop: 24,
            borderRadius: 34,
            background: 'linear-gradient(135deg, #0071e3 0%, #005bb8 100%)',
            color: '#fff',
            padding: 30,
            textAlign: 'center',
            boxShadow: '0 18px 48px rgba(0,113,227,0.22)',
          }}
        >
          <h2 style={{ margin: 0, fontSize: 34, letterSpacing: '-1px', fontWeight: 950 }}>Empezá a recibir reservas online.</h2>
          <p style={{ margin: '10px auto 20px', maxWidth: 620, color: 'rgba(255,255,255,0.86)', fontSize: 16, lineHeight: 1.55, fontWeight: 650 }}>
            Creá tu cuenta profesional, configurá tus servicios y compartí tu link con tus clientes.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => navigate('/profesional/register')}
              style={{ border: 'none', borderRadius: 18, background: '#fff', color: '#0f172a', padding: '15px 20px', fontSize: 16, fontWeight: 950, fontFamily: 'inherit', cursor: 'pointer' }}
            >
              Crear cuenta
            </button>
            <button
              type="button"
              onClick={() => navigate('/profesional/login')}
              style={{ border: '1px solid rgba(255,255,255,0.55)', borderRadius: 18, background: 'rgba(255,255,255,0.12)', color: '#fff', padding: '15px 20px', fontSize: 16, fontWeight: 900, fontFamily: 'inherit', cursor: 'pointer' }}
            >
              Ya tengo cuenta
            </button>
          </div>
        </section>
      </main>

      <div
        className="landing-floating-cta"
        style={{
          display: 'none',
          position: 'fixed',
          zIndex: 50,
          padding: 8,
          borderRadius: 22,
          background: 'rgba(255,255,255,0.92)',
          border: '1px solid rgba(226,232,240,0.95)',
          boxShadow: '0 16px 42px rgba(15,23,42,0.16)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          gap: 8,
        }}
      >
        <button
          type="button"
          onClick={() => navigate('/profesional/login')}
          style={{ border: '1px solid #d7dce5', borderRadius: 16, background: '#fff', color: '#111827', padding: '12px 10px', fontSize: 14, fontWeight: 900, fontFamily: 'inherit' }}
        >
          Ingresar
        </button>
        <button
          type="button"
          onClick={() => navigate('/profesional/register')}
          style={{ border: 'none', borderRadius: 16, background: '#0071e3', color: '#fff', padding: '12px 10px', fontSize: 14, fontWeight: 950, fontFamily: 'inherit' }}
        >
          Crear cuenta
        </button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <>
      <MobileViewportController />
      <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/profesional/login" element={<ProfesionalPage />} />
      <Route path="/profesional/register" element={<RegisterPage />} />
      <Route path="/profesional/dashboard" element={<ProfesionalPage />} />
      <Route path="/admin-app" element={<AdminLoginPage />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
      <Route path="/reservar/:slug" element={<BookPage />} />
        <Route path="/:slug" element={<BookPage />} />
      </Routes>
    </>
  );
}

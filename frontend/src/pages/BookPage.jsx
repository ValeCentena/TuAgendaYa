import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';

const API_BASE = 'https://tuagendaya-api.onrender.com/api';

const MONTH_NAMES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

const WEEK_DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];


const PHONE_COUNTRIES = [
  { code: 'UY', flag: '🇺🇾', name: 'Uruguay', dialCode: '598', placeholder: '93405195' },
  { code: 'AR', flag: '🇦🇷', name: 'Argentina', dialCode: '54', placeholder: '91123456789' },
  { code: 'BR', flag: '🇧🇷', name: 'Brasil', dialCode: '55', placeholder: '11987654321' },
  { code: 'PY', flag: '🇵🇾', name: 'Paraguay', dialCode: '595', placeholder: '981123456' },
  { code: 'CL', flag: '🇨🇱', name: 'Chile', dialCode: '56', placeholder: '912345678' },
  { code: 'BO', flag: '🇧🇴', name: 'Bolivia', dialCode: '591', placeholder: '71234567' },
  { code: 'PE', flag: '🇵🇪', name: 'Perú', dialCode: '51', placeholder: '912345678' },
  { code: 'CO', flag: '🇨🇴', name: 'Colombia', dialCode: '57', placeholder: '3001234567' },
  { code: 'EC', flag: '🇪🇨', name: 'Ecuador', dialCode: '593', placeholder: '991234567' },
  { code: 'VE', flag: '🇻🇪', name: 'Venezuela', dialCode: '58', placeholder: '4121234567' },
  { code: 'MX', flag: '🇲🇽', name: 'México', dialCode: '52', placeholder: '5512345678' },
  { code: 'US', flag: '🇺🇸', name: 'Estados Unidos', dialCode: '1', placeholder: '3051234567' },
  { code: 'ES', flag: '🇪🇸', name: 'España', dialCode: '34', placeholder: '612345678' },
  { code: 'PT', flag: '🇵🇹', name: 'Portugal', dialCode: '351', placeholder: '912345678' },
  { code: 'IT', flag: '🇮🇹', name: 'Italia', dialCode: '39', placeholder: '3123456789' },
  { code: 'FR', flag: '🇫🇷', name: 'Francia', dialCode: '33', placeholder: '612345678' },
  { code: 'DE', flag: '🇩🇪', name: 'Alemania', dialCode: '49', placeholder: '15123456789' },
  { code: 'GB', flag: '🇬🇧', name: 'Reino Unido', dialCode: '44', placeholder: '7123456789' },
  { code: 'CA', flag: '🇨🇦', name: 'Canadá', dialCode: '1', placeholder: '4161234567' },
];

function getPhoneCountry(countryCode) {
  return PHONE_COUNTRIES.find((country) => country.code === countryCode) || PHONE_COUNTRIES[0];
}

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function buildInternationalPhone(countryCode, localPhone) {
  const country = getPhoneCountry(countryCode);
  let digits = onlyDigits(localPhone);

  if (!digits) return '';

  // Si el cliente pegó el número completo con prefijo, lo dejamos bien armado.
  if (digits.startsWith(country.dialCode)) {
    return digits;
  }

  // Uruguay: si escribe 093405195, sacamos el 0 para WhatsApp: 59893405195.
  if (country.code === 'UY' && digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  return `${country.dialCode}${digits}`;
}

function addMinutes(timeStr, minutes) {
  const [h, m] = timeStr.split(':').map(Number);
  const total = h * 60 + m + Number(minutes || 30);
  const hh = String(Math.floor(total / 60) % 24).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function toLocalDateString(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function parseLocalDate(value) {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function getMonthStart(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function isSameMonth(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function isBeforeMonth(a, b) {
  if (a.getFullYear() < b.getFullYear()) return true;
  if (a.getFullYear() > b.getFullYear()) return false;
  return a.getMonth() < b.getMonth();
}

function isSameDay(a, b) {
  return (
    a &&
    b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
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
    color: item.color || '#0071e3',
    isActive: Boolean(item.isActive ?? item.is_active ?? true),
  };
}

export default function BookPage() {
  const { slug } = useParams();
  const pageTopRef = useRef(null);

  const now = new Date();
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const today = toLocalDateString(todayDate);
  const currentMonthStart = getMonthStart(todayDate);

  const [business, setBusiness] = useState(null);

  const [services, setServices] = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [loadingServices, setLoadingServices] = useState(true);

  const [staff, setStaff] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [loadingStaff, setLoadingStaff] = useState(true);

  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientPhoneCountry, setClientPhoneCountry] = useState('UY');
  const [phoneCountryOpen, setPhoneCountryOpen] = useState(false);
  const phoneCountryRef = useRef(null);
  const [clientComment, setClientComment] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [slots, setSlots] = useState([]);

  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(currentMonthStart);

  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const selectedService = services.find((service) => String(service.id) === String(selectedServiceId));
  const selectedStaff = staff.find((member) => String(member.id) === String(selectedStaffId));
  const hasStaffChoice = staff.length > 1;

  const selectedDuration = selectedService?.durationMinutes || 30;
  const selectedEndTime = selectedTime ? addMinutes(selectedTime, selectedDuration) : '';
  const selectedDateObject = parseLocalDate(bookingDate);
  const selectedPhoneCountry = getPhoneCountry(clientPhoneCountry);
  const fullClientPhone = buildInternationalPhone(clientPhoneCountry, clientPhone);

  useEffect(() => {
    function handleClickOutside(event) {
      if (!phoneCountryRef.current) return;

      if (!phoneCountryRef.current.contains(event.target)) {
        setPhoneCountryOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    setLoadingServices(true);
    setError('');

    fetch(`${API_BASE}/professionals/public/${slug}/services`)
      .then((r) => r.json())
      .then((data) => {
        const activeServices = (data.services || [])
          .map(normalizeService)
          .filter((service) => service.isActive);

        setServices(activeServices);

        if (activeServices.length > 0) {
          setSelectedServiceId(String(activeServices[0].id));
        }
      })
      .catch(() => {
        setServices([]);
        setError('No se pudieron cargar los servicios.');
      })
      .finally(() => setLoadingServices(false));
  }, [slug]);

  useEffect(() => {
    setLoadingStaff(true);
    setError('');

    fetch(`${API_BASE}/bookings/public/${slug}/staff`)
      .then((r) => r.json())
      .then((data) => {
        const activeStaff = (data.staff || [])
          .map(normalizeStaff)
          .filter((member) => member.isActive);

        setBusiness(data.business || null);
        setStaff(activeStaff);

        if (activeStaff.length > 0) {
          setSelectedStaffId(String(activeStaff[0].id));
        } else {
          setSelectedStaffId('');
        }
      })
      .catch(() => {
        setStaff([]);
        setBusiness(null);
        setError('No se pudieron cargar los profesionales.');
      })
      .finally(() => setLoadingStaff(false));
  }, [slug]);

  useEffect(() => {
    const needsStaffChoice = staff.length > 1;

    if (!bookingDate || !selectedServiceId || (needsStaffChoice && !selectedStaffId)) {
      setSlots([]);
      setSelectedTime('');
      return;
    }

    setSelectedTime('');
    setSlots([]);
    setLoadingSlots(true);

    const params = new URLSearchParams({
      date: bookingDate,
      serviceId: String(selectedServiceId),
    });

    if (selectedStaffId) {
      params.set('staffId', String(selectedStaffId));
    }

    fetch(`${API_BASE}/bookings/public/${slug}/slots?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => setSlots(data.slots || []))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [bookingDate, selectedServiceId, selectedStaffId, staff.length, slug]);

  const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 16,
    border: '1px solid #e5e5ea',
    fontSize: 15,
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
    marginBottom: 8,
    background: '#fff',
    color: '#1a1a1a',
    boxShadow: '0 1px 0 rgba(0,0,0,0.02)',
  };

  const labelStyle = {
    fontSize: 12,
    color: '#6e6e73',
    marginBottom: 6,
    display: 'block',
    fontWeight: 700,
  };

  const sectionStyle = {
    background: '#f5f5f8',
    borderRadius: 22,
    padding: '16px',
    marginBottom: 14,
    border: '1px solid rgba(0,0,0,0.03)',
  };

  const sectionTitleStyle = {
    fontSize: 13,
    fontWeight: 800,
    color: '#1a1a1a',
    marginBottom: 10,
    letterSpacing: '-0.01em',
  };

  const refreshSlots = () => {
    const needsStaffChoice = staff.length > 1;

    if (!bookingDate || !selectedServiceId || (needsStaffChoice && !selectedStaffId)) return;

    setSelectedTime('');
    setLoadingSlots(true);

    const params = new URLSearchParams({
      date: bookingDate,
      serviceId: String(selectedServiceId),
    });

    if (selectedStaffId) {
      params.set('staffId', String(selectedStaffId));
    }

    fetch(`${API_BASE}/bookings/public/${slug}/slots?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => setSlots(data.slots || []))
      .catch(() => {})
      .finally(() => setLoadingSlots(false));
  };

  const formatDate = (d) => {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  };

  const formatLongDate = (value) => {
    const date = parseLocalDate(value);
    if (!date) return '';

    const day = date.getDate();
    const month = MONTH_NAMES[date.getMonth()];
    const year = date.getFullYear();

    return `${day} de ${month} de ${year}`;
  };

  const openCalendar = () => {
    if (!canChooseDate) return;

    if (bookingDate) {
      const selected = parseLocalDate(bookingDate);
      if (selected && !isBeforeMonth(getMonthStart(selected), currentMonthStart)) {
        setCalendarMonth(getMonthStart(selected));
      }
    } else {
      setCalendarMonth(currentMonthStart);
    }

    setCalendarOpen((value) => !value);
  };

  const goToPreviousMonth = () => {
    const previous = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1);
    if (isBeforeMonth(previous, currentMonthStart)) return;
    setCalendarMonth(previous);
  };

  const goToNextMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1));
  };

  const selectCalendarDate = (date) => {
    if (date < todayDate) return;

    const value = toLocalDateString(date);
    setBookingDate(value);
    setSelectedTime('');
    setCalendarOpen(false);
  };

  const buildCalendarDays = () => {
    const firstDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const lastDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0);
    const mondayBasedStart = (firstDay.getDay() + 6) % 7;
    const days = [];

    for (let i = 0; i < mondayBasedStart; i += 1) {
      days.push(null);
    }

    for (let day = 1; day <= lastDay.getDate(); day += 1) {
      days.push(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day));
    }

    while (days.length % 7 !== 0) {
      days.push(null);
    }

    return days;
  };

  const renderCalendar = () => {
    const days = buildCalendarDays();
    const canGoPrevious = !isSameMonth(calendarMonth, currentMonthStart) && !isBeforeMonth(calendarMonth, currentMonthStart);

    return (
      <div
        style={{
          marginTop: 8,
          background: 'linear-gradient(180deg, #ffffff 0%, #fbfbfd 100%)',
          borderRadius: 22,
          padding: 10,
          border: '1px solid rgba(0,0,0,0.06)',
          boxShadow: '0 12px 26px rgba(0,0,0,0.06)',
          maxWidth: 390,
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <button
            type="button"
            onClick={goToPreviousMonth}
            disabled={!canGoPrevious}
            aria-label="Mes anterior"
            style={{
              width: 26,
              height: 26,
              borderRadius: 13,
              border: '1px solid rgba(0,0,0,0.05)',
              background: canGoPrevious ? '#f5f5f7' : '#fbfbfd',
              color: canGoPrevious ? '#1a1a1a' : '#c7c7cc',
              fontSize: 16,
              cursor: canGoPrevious ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit',
            }}
          >
            ‹
          </button>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 850, color: '#111827', letterSpacing: '-0.03em' }}>
              {MONTH_NAMES[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
            </div>
            <div style={{ fontSize: 10.5, color: '#8e8e93', marginTop: 1 }}>
              Solo fechas disponibles desde hoy
            </div>
          </div>

          <button
            type="button"
            onClick={goToNextMonth}
            aria-label="Mes siguiente"
            style={{
              width: 26,
              height: 26,
              borderRadius: 13,
              border: '1px solid rgba(0,0,0,0.05)',
              background: '#f5f5f7',
              color: '#1a1a1a',
              fontSize: 16,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            ›
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 4, marginBottom: 3 }}>
          {WEEK_DAYS.map((day, index) => (
            <div
              key={`${day}-${index}`}
              style={{
                textAlign: 'center',
                fontSize: 10,
                fontWeight: 800,
                color: '#8e8e93',
                padding: '3px 0',
              }}
            >
              {day}
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 4 }}>
          {days.map((date, index) => {
            if (!date) {
              return <div key={`empty-${index}`} style={{ height: 30 }} />;
            }

            const isPast = date < todayDate;
            const isToday = isSameDay(date, todayDate);
            const isSelected = isSameDay(date, selectedDateObject);

            return (
              <button
                key={toLocalDateString(date)}
                type="button"
                disabled={isPast}
                onClick={() => selectCalendarDate(date)}
                style={{
                  height: 30,
                  borderRadius: 12,
                  border: isSelected ? '1px solid #0071e3' : isToday ? '1px solid #0071e3' : '1px solid rgba(0,0,0,0.06)',
                  background: isSelected ? '#0071e3' : isPast ? '#fbfbfd' : '#ffffff',
                  color: isSelected ? '#fff' : isPast ? '#c7c7cc' : '#1a1a1a',
                  fontSize: 12.5,
                  fontWeight: isSelected || isToday ? 850 : 700,
                  fontFamily: 'inherit',
                  cursor: isPast ? 'not-allowed' : 'pointer',
                  transition: 'transform 0.12s, background 0.12s, color 0.12s',
                }}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedServiceId) {
      setError('Seleccioná un servicio.');
      return;
    }

    if (hasStaffChoice && !selectedStaffId) {
      setError('Seleccioná un profesional.');
      return;
    }

    if (!clientName.trim()) {
      setError('El nombre es requerido.');
      return;
    }

    if (!clientPhone.trim()) {
      setError('El teléfono es requerido.');
      return;
    }

    if (!fullClientPhone || fullClientPhone.length < 8) {
      setError('Revisá el teléfono. Elegí el prefijo del país y escribí el número sin el prefijo.');
      return;
    }

    if (!bookingDate) {
      setError('La fecha del turno es requerida.');
      return;
    }

    if (!selectedTime) {
      setError('Seleccioná un horario disponible.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/bookings/public/${slug}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: clientName.trim(),
          clientPhone: fullClientPhone,
          comment: clientComment.trim(),
          bookingDate,
          startTime: selectedTime,
          serviceId: Number(selectedServiceId),
          ...(selectedStaffId ? { staffId: Number(selectedStaffId) } : {}),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'No se pudo confirmar la reserva.');

        if (res.status === 409) {
          refreshSlots();
        }
      } else {
        setSuccess(true);
        setCalendarOpen(false);
        window.setTimeout(() => {
          pageTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 80);
      }
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSuccess(false);
    setClientName('');
    setClientPhoneCountry('UY');
    setClientPhone('');
    setClientComment('');
    setBookingDate('');
    setSelectedTime('');
    setSlots([]);
    setError('');
    setCalendarOpen(false);
    setCalendarMonth(currentMonthStart);

    window.setTimeout(() => {
      pageTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);

    if (services.length > 0) {
      setSelectedServiceId(String(services[0].id));
    }

    if (staff.length > 0) {
      setSelectedStaffId(String(staff[0].id));
    } else {
      setSelectedStaffId('');
    }
  };

  const availableSlots = slots.filter((slot) => slot.available);
  const hasSlots = slots.length > 0;
  const businessName = business?.businessName || business?.name || 'TuAgendaYa';

  const canChooseDate = Boolean(selectedServiceId && (!hasStaffChoice || selectedStaffId));

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f2f2f7',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '22px 14px',
        fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", sans-serif',
      }}
    >
      <style>{`
        @keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .slot-btn { transition: background 0.12s, color 0.12s, transform 0.1s, border 0.12s; }
        .slot-btn:active { transform: scale(0.96); }
        .service-card { transition: transform 0.12s, border 0.12s, background 0.12s, box-shadow 0.12s; }
        .service-card:active { transform: scale(0.98); }
        .date-row { transition: background 0.12s, border 0.12s, transform 0.12s; }
        .date-row:active { transform: scale(0.99); }
      `}</style>

      <div
        ref={pageTopRef}
        style={{
          background: '#fff',
          borderRadius: 30,
          padding: '34px 30px',
          border: '1px solid rgba(0,0,0,0.05)',
          width: '100%',
          maxWidth: 520,
          animation: 'slideUp 250ms cubic-bezier(0.16,1,0.3,1) both',
          boxShadow: '0 18px 60px rgba(0,0,0,0.08)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          {business?.logoUrl ? (
            <img
              src={business.logoUrl}
              alt={businessName}
              style={{ maxWidth: 180, maxHeight: 78, objectFit: 'contain', marginBottom: 8 }}
            />
          ) : (
            <div style={{ fontSize: 30, fontWeight: 850, letterSpacing: '-0.05em', color: '#0071e3', marginBottom: 4 }}>
              {businessName}
            </div>
          )}

          <div style={{ fontSize: 14, fontWeight: 800, color: '#1a1a1a', letterSpacing: '-0.02em' }}>Reservar turno</div>

          {business?.address && (
            <div style={{ fontSize: 12, color: '#6e6e73', marginTop: 6 }}>{business.address}</div>
          )}

          <div style={{ fontSize: 13, color: '#6e6e73', marginTop: 4 }}>@{slug}</div>
        </div>

        {success ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 44, marginBottom: 8 }}>✓</div>

            <div style={{ fontSize: 17, fontWeight: 800, color: '#30d158', marginBottom: 8 }}>
              Reserva recibida
            </div>

            <div style={{ background: '#f5f5f8', borderRadius: 20, padding: '16px', marginBottom: 16, textAlign: 'left' }}>
              <div style={{ fontSize: 12, color: '#6e6e73', marginBottom: 8, fontWeight: 700 }}>Resumen del turno</div>

              <div style={{ fontSize: 15, fontWeight: 800, color: '#1a1a1a', marginBottom: 6 }}>
                {clientName}
              </div>

              {selectedService && (
                <div style={{ fontSize: 13, color: '#0071e3', marginBottom: 5, fontWeight: 650 }}>
                  {selectedService.name} · {selectedService.durationMinutes} min
                  {selectedService.price ? ` · $${selectedService.price}` : ''}
                </div>
              )}

              {selectedStaff && (
                <div style={{ fontSize: 13, color: '#6e6e73', marginBottom: 5 }}>
                  Profesional: <strong>{selectedStaff.name}</strong>
                </div>
              )}

              <div style={{ fontSize: 13, color: '#6e6e73' }}>
                {formatDate(bookingDate)} · {selectedTime} a {selectedEndTime}
              </div>
            </div>

            <div style={{ fontSize: 13, color: '#6e6e73', marginBottom: 20 }}>
              El negocio se pondrá en contacto con vos para confirmar.
            </div>

            <button
              onClick={handleReset}
              style={{ padding: '12px 24px', borderRadius: 16, border: 'none', background: '#0071e3', color: '#fff', fontSize: 14, fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer' }}
            >
              Hacer otra reserva
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={sectionStyle}>
              <div style={sectionTitleStyle}>Elegí un servicio</div>

              {loadingServices ? (
                <div style={{ textAlign: 'center', color: '#aeaeb2', fontSize: 13, padding: '12px 0' }}>
                  Cargando servicios...
                </div>
              ) : services.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#ff453a', fontSize: 13, padding: '12px 0' }}>
                  Este profesional todavía no tiene servicios activos.
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gap: 9,
                    maxHeight: 252,
                    overflowY: services.length > 3 ? 'auto' : 'visible',
                    paddingRight: services.length > 3 ? 6 : 0,
                    WebkitOverflowScrolling: 'touch',
                    scrollbarWidth: 'thin',
                  }}
                >
                  {services.map((service) => {
                    const isSelected = String(selectedServiceId) === String(service.id);

                    return (
                      <button
                        key={service.id}
                        type="button"
                        className="service-card"
                        onClick={() => {
                          setSelectedServiceId(String(service.id));
                          setSelectedTime('');
                          setSlots([]);
                        }}
                        style={{
                          textAlign: 'left',
                          padding: '14px 15px',
                          borderRadius: 18,
                          border: isSelected ? '2px solid #0071e3' : '1px solid #e1e1e6',
                          background: isSelected ? '#eef6ff' : '#fff',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          boxShadow: isSelected ? '0 8px 22px rgba(0,113,227,0.12)' : 'none',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                          <div>
                            <div style={{ fontSize: 15, fontWeight: 800, color: '#1a1a1a', letterSpacing: '-0.02em' }}>
                              {service.name}
                            </div>

                            {service.description && (
                              <div style={{ fontSize: 13, color: '#6e6e73', marginTop: 3 }}>
                                {service.description}
                              </div>
                            )}
                          </div>

                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 800, color: '#0071e3' }}>
                              {service.durationMinutes} min
                            </div>

                            {service.price && (
                              <div style={{ fontSize: 11.5, color: '#6e6e73', marginTop: 2 }}>
                                ${service.price}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {hasStaffChoice && (
              <div style={sectionStyle}>
                <div style={sectionTitleStyle}>Elegí un profesional</div>

                {loadingStaff ? (
                  <div style={{ textAlign: 'center', color: '#aeaeb2', fontSize: 13, padding: '12px 0' }}>
                    Cargando profesionales...
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 9 }}>
                    {staff.map((member) => {
                      const isSelected = String(selectedStaffId) === String(member.id);

                      return (
                        <button
                          key={member.id}
                          type="button"
                          className="service-card"
                          onClick={() => {
                            setSelectedStaffId(String(member.id));
                            setSelectedTime('');
                            setSlots([]);
                          }}
                          style={{
                            textAlign: 'left',
                            padding: '14px 15px',
                            borderRadius: 18,
                            border: isSelected ? '2px solid #0071e3' : '1px solid #e1e1e6',
                            background: isSelected ? '#eef6ff' : '#fff',
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            boxShadow: isSelected ? '0 8px 22px rgba(0,113,227,0.12)' : 'none',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ width: 12, height: 12, borderRadius: 99, background: member.color, display: 'inline-block' }} />
                            <div style={{ fontSize: 15, fontWeight: 800, color: '#1a1a1a', letterSpacing: '-0.02em' }}>
                              {member.name}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div style={sectionStyle}>
              <div style={sectionTitleStyle}>Elegí fecha y horario</div>

              <label style={labelStyle}>Fecha del turno *</label>

              <button
                type="button"
                className="date-row"
                disabled={!canChooseDate}
                onClick={openCalendar}
                style={{
                  width: '100%',
                  border: calendarOpen ? '1.5px solid #0071e3' : '1px solid rgba(0,0,0,0.07)',
                  background: canChooseDate ? 'linear-gradient(180deg, #ffffff 0%, #fbfbfd 100%)' : '#f7f7f9',
                  borderRadius: 20,
                  padding: '11px 13px',
                  fontFamily: 'inherit',
                  cursor: canChooseDate ? 'pointer' : 'not-allowed',
                  textAlign: 'left',
                  display: 'flex',
                  boxShadow: calendarOpen ? '0 10px 24px rgba(0,113,227,0.10)' : '0 8px 18px rgba(0,0,0,0.04)',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: bookingDate ? '#1a1a1a' : '#8e8e93', letterSpacing: '-0.02em' }}>
                    {bookingDate ? formatLongDate(bookingDate) : 'Tocá acá para elegir una fecha'}
                  </div>
                  <div style={{ fontSize: 12, color: '#8e8e93', marginTop: 3 }}>
                    No se pueden seleccionar fechas anteriores
                  </div>
                </div>

                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    background: calendarOpen ? '#0071e3' : '#f2f2f7',
                    color: calendarOpen ? '#fff' : '#0071e3',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    fontWeight: 800,
                  }}
                >
                  {calendarOpen ? '−' : '+'}
                </div>
              </button>

              {calendarOpen && renderCalendar()}

              {bookingDate && canChooseDate && (
                <div
                  style={{
                    marginTop: 10,
                    maxWidth: 390,
                    marginLeft: 'auto',
                    marginRight: 'auto',
                    background: 'linear-gradient(180deg, #ffffff 0%, #fbfbfd 100%)',
                    border: '1px solid rgba(0,0,0,0.06)',
                    borderRadius: 20,
                    padding: 12,
                    boxShadow: '0 8px 18px rgba(0,0,0,0.04)',
                    boxSizing: 'border-box',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 850, color: '#1a1a1a' }}>Horarios disponibles</div>
                      {selectedService && (
                        <div style={{ fontSize: 11.5, color: '#6e6e73', marginTop: 2 }}>
                          {selectedService.name}{selectedStaff ? ` · ${selectedStaff.name}` : ''} · {selectedService.durationMinutes} min
                        </div>
                      )}
                    </div>

                    {selectedTime && (
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#0071e3', whiteSpace: 'nowrap' }}>
                        {selectedTime} a {selectedEndTime}
                      </div>
                    )}
                  </div>

                  {loadingSlots ? (
                    <div style={{ textAlign: 'center', color: '#aeaeb2', fontSize: 13, padding: '12px 0' }}>
                      Cargando horarios...
                    </div>
                  ) : !hasSlots ? (
                    <div style={{ textAlign: 'center', color: '#aeaeb2', fontSize: 13, padding: '12px 0' }}>
                      No hay horarios disponibles para esta fecha.
                    </div>
                  ) : (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, minmax(78px, 1fr))',
                        gap: 8,
                        maxHeight: 158,
                        overflowY: slots.length > 12 ? 'auto' : 'visible',
                        paddingRight: slots.length > 12 ? 4 : 0,
                        WebkitOverflowScrolling: 'touch',
                      }}
                    >
                      {slots.map((slot) => {
                        const isSelected = selectedTime === slot.time;
                        const isAvailable = slot.available;

                        return (
                          <button
                            key={slot.time}
                            type="button"
                            className="slot-btn"
                            disabled={!isAvailable}
                            onClick={() => isAvailable && setSelectedTime(slot.time)}
                            style={{
                              height: 42,
                              padding: '0 10px',
                              borderRadius: 16,
                              border: isSelected
                                ? '2px solid #0071e3'
                                : isAvailable
                                  ? '1px solid #e1e1e6'
                                  : '1px solid #eeeeee',
                              background: isSelected
                                ? '#0071e3'
                                : isAvailable
                                  ? '#ffffff'
                                  : '#fbfbfd',
                              color: isSelected
                                ? '#fff'
                                : isAvailable
                                  ? '#1a1a1a'
                                  : '#c7c7cc',
                              fontSize: 14,
                              fontWeight: 760,
                              fontFamily: 'inherit',
                              cursor: isAvailable ? 'pointer' : 'not-allowed',
                              textDecoration: isAvailable ? 'none' : 'line-through',
                              boxShadow: isSelected ? '0 8px 18px rgba(0,113,227,0.18)' : '0 4px 10px rgba(0,0,0,0.035)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              lineHeight: 1,
                              letterSpacing: '-0.02em',
                              boxSizing: 'border-box',
                            }}
                          >
                            {slot.time}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {hasSlots && availableSlots.length === 0 && (
                    <div style={{ fontSize: 12, color: '#ff453a', marginTop: 10 }}>
                      Todos los horarios están ocupados para esta fecha.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={sectionStyle}>
              <div style={sectionTitleStyle}>Tus datos</div>

              <label style={labelStyle}>Nombre completo *</label>

              <input
                style={inputStyle}
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Tu nombre"
                required
              />

              <label style={labelStyle}>Teléfono *</label>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '78px minmax(0, 1fr)',
                  gap: 8,
                  alignItems: 'stretch',
                  marginBottom: 8,
                }}
              >
                <div ref={phoneCountryRef} style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => setPhoneCountryOpen((value) => !value)}
                    aria-label="Elegir prefijo del país"
                    style={{
                      width: '100%',
                      minWidth: 0,
                      height: 44,
                      padding: '0 9px',
                      borderRadius: 15,
                      border: phoneCountryOpen ? '1px solid #0071e3' : '1px solid #e5e5ea',
                      background: '#fff',
                      color: '#1a1a1a',
                      fontSize: 14,
                      fontWeight: 500,
                      fontFamily: 'inherit',
                      outline: 'none',
                      boxSizing: 'border-box',
                      cursor: 'pointer',
                      boxShadow: phoneCountryOpen ? '0 0 0 3px rgba(0,113,227,0.08)' : '0 1px 0 rgba(0,0,0,0.02)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 5,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span style={{ fontSize: 14, lineHeight: 1 }}>{selectedPhoneCountry.flag}</span>
                    <span>+{selectedPhoneCountry.dialCode}</span>
                    <span style={{ color: '#8e8e93', fontSize: 10, marginLeft: 1 }}>▾</span>
                  </button>

                  {phoneCountryOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        zIndex: 80,
                        top: 'calc(100% + 7px)',
                        left: 0,
                        width: 230,
                        maxHeight: 230,
                        overflowY: 'auto',
                        background: '#fff',
                        border: '1px solid #e5e5ea',
                        borderRadius: 16,
                        boxShadow: '0 16px 36px rgba(0,0,0,0.16)',
                        padding: 6,
                        WebkitOverflowScrolling: 'touch',
                      }}
                    >
                      {PHONE_COUNTRIES.map((country) => {
                        const isSelected = country.code === clientPhoneCountry;

                        return (
                          <button
                            key={country.code}
                            type="button"
                            onClick={() => {
                              setClientPhoneCountry(country.code);
                              setPhoneCountryOpen(false);
                            }}
                            style={{
                              width: '100%',
                              border: 'none',
                              borderRadius: 12,
                              background: isSelected ? '#eef6ff' : '#fff',
                              color: '#1a1a1a',
                              padding: '10px 10px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 10,
                              cursor: 'pointer',
                              fontFamily: 'inherit',
                              textAlign: 'left',
                            }}
                          >
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                              <span>{country.flag}</span>
                              <span style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {country.name}
                              </span>
                            </span>
                            <span style={{ color: '#0071e3', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
                              +{country.dialCode}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <input
                  style={{ ...inputStyle, height: 44, marginBottom: 0 }}
                  value={clientPhone}
                  onChange={(e) => setClientPhone(onlyDigits(e.target.value))}
                  placeholder={selectedPhoneCountry.placeholder}
                  inputMode="numeric"
                  autoComplete="tel-national"
                  required
                />
              </div>

              <div style={{ fontSize: 11.5, color: '#8e8e93', margin: '-1px 0 10px', lineHeight: 1.35 }}>
                Escribí solo el número, sin prefijo.
              </div>

              <label style={labelStyle}>Comentario opcional</label>

              <textarea
                style={{ ...inputStyle, resize: 'vertical', minHeight: 74, marginBottom: 0 }}
                value={clientComment}
                onChange={(e) => setClientComment(e.target.value)}
                placeholder="¿Algo que quieras aclarar?"
              />
            </div>

            {error && (
              <div style={{ background: '#fff2f2', border: '1px solid #ffcdd2', borderRadius: 16, padding: '12px 14px', fontSize: 13, color: '#c62828', marginBottom: 8 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !selectedServiceId || (hasStaffChoice && !selectedStaffId) || !selectedTime}
              style={{
                width: '100%',
                padding: '15px',
                borderRadius: 18,
                border: 'none',
                background: loading || !selectedServiceId || (hasStaffChoice && !selectedStaffId) || !selectedTime ? '#aeaeb2' : '#0071e3',
                color: '#fff',
                fontSize: 16,
                fontWeight: 850,
                fontFamily: 'inherit',
                cursor: loading || !selectedServiceId || (hasStaffChoice && !selectedStaffId) || !selectedTime ? 'not-allowed' : 'pointer',
                boxShadow: loading || !selectedServiceId || (hasStaffChoice && !selectedStaffId) || !selectedTime ? 'none' : '0 12px 24px rgba(0,113,227,0.18)',
              }}
            >
              {loading ? 'Reservando...' : 'Confirmar reserva'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

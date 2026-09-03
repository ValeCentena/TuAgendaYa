import { useState, useEffect, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { CapacitorContacts } from '@capgo/capacitor-contacts';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
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


function PasswordInputField({
  value,
  onChange,
  placeholder = 'Contraseña',
  autoComplete = 'current-password',
  required = false,
  style = {},
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div style={{ position: 'relative', marginBottom: style?.marginBottom ?? 12 }}>
      <input
        style={{
          ...style,
          marginBottom: 0,
          paddingRight: 52,
        }}
        type={showPassword ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
      />

      <button
        type="button"
        onClick={() => setShowPassword((current) => !current)}
        aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
        title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
        style={{
          position: 'absolute',
          right: 10,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 34,
          height: 34,
          borderRadius: 999,
          border: 'none',
          background: '#f2f2f7',
          color: '#0071e3',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          fontWeight: 950,
          fontSize: 15,
          fontFamily: 'inherit',
        }}
      >
        {showPassword ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M10.58 10.58A2 2 0 0 0 13.42 13.42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M9.88 5.09A9.77 9.77 0 0 1 12 4.85c5.25 0 8.78 4.42 9.76 5.85a2.1 2.1 0 0 1 0 2.6 18.2 18.2 0 0 1-2.22 2.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M6.1 6.84A18.9 18.9 0 0 0 2.24 10.7a2.1 2.1 0 0 0 0 2.6C3.22 14.73 6.75 19.15 12 19.15c1.39 0 2.68-.31 3.86-.81" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M2.24 10.7C3.22 9.27 6.75 4.85 12 4.85s8.78 4.42 9.76 5.85a2.1 2.1 0 0 1 0 2.6C20.78 14.73 17.25 19.15 12 19.15S3.22 14.73 2.24 13.3a2.1 2.1 0 0 1 0-2.6Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
          </svg>
        )}
      </button>
    </div>
  );
}

function ChangePasswordCard({ title = 'Cambiar contraseña', description = 'Actualizá tu contraseña de acceso.', endpoint, token }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const canSubmit = currentPassword && newPassword && repeatPassword && !saving;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    if (newPassword.length < 8) {
      setError('La nueva contraseña debe tener mínimo 8 caracteres.');
      return;
    }

    if (newPassword !== repeatPassword) {
      setError('La repetición no coincide con la nueva contraseña.');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo cambiar la contraseña.');
      }

      setCurrentPassword('');
      setNewPassword('');
      setRepeatPassword('');
      setMessage('Contraseña actualizada correctamente.');
    } catch (err) {
      setError(err.message || 'No se pudo cambiar la contraseña.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: '#fff',
        border: '0.5px solid #ececf2',
        borderRadius: 20,
        padding: 16,
        boxShadow: '0 4px 14px rgba(0,0,0,0.035)',
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 950, color: '#1a1a1a', letterSpacing: '-0.01em', marginBottom: 4 }}>
        {title}
      </div>
      <div style={{ fontSize: 12.5, color: '#6e6e73', fontWeight: 700, lineHeight: 1.4, marginBottom: 12 }}>
        {description}
      </div>

      <label style={smallLabelStyle}>Contraseña actual</label>
      <PasswordInputField
        value={currentPassword}
        onChange={(event) => setCurrentPassword(event.target.value)}
        placeholder="Contraseña actual"
        autoComplete="current-password"
        required
        style={{ ...inputStyle, marginBottom: 10 }}
      />

      <label style={smallLabelStyle}>Nueva contraseña</label>
      <PasswordInputField
        value={newPassword}
        onChange={(event) => setNewPassword(event.target.value)}
        placeholder="Mínimo 8 caracteres"
        autoComplete="new-password"
        required
        style={{ ...inputStyle, marginBottom: 10 }}
      />

      <label style={smallLabelStyle}>Repetir nueva contraseña</label>
      <PasswordInputField
        value={repeatPassword}
        onChange={(event) => setRepeatPassword(event.target.value)}
        placeholder="Repetir nueva contraseña"
        autoComplete="new-password"
        required
        style={{ ...inputStyle, marginBottom: 10 }}
      />

      {error && <div style={{ color: '#ff453a', fontSize: 12.5, fontWeight: 850, marginBottom: 10 }}>{error}</div>}
      {message && <div style={{ color: '#188038', fontSize: 12.5, fontWeight: 850, marginBottom: 10 }}>{message}</div>}

      <button
        type="submit"
        disabled={!canSubmit}
        style={{
          width: '100%',
          border: 'none',
          borderRadius: 14,
          padding: '12px 14px',
          background: canSubmit ? '#0071e3' : '#aeaeb2',
          color: '#fff',
          fontSize: 14,
          fontWeight: 950,
          fontFamily: 'inherit',
          cursor: canSubmit ? 'pointer' : 'not-allowed',
        }}
      >
        {saving ? 'Guardando...' : 'Cambiar contraseña'}
      </button>
    </form>
  );
}


const smallLabelStyle = {
  fontSize: 11,
  color: '#6e6e73',
  marginBottom: 4,
  display: 'block',
  fontWeight: 600,
};


function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

function getPushBrowserSupport() {
  if (typeof window === 'undefined') {
    return { supported: false, reason: 'browser_unavailable' };
  }

  if (!('serviceWorker' in navigator)) {
    return { supported: false, reason: 'service_worker_unavailable' };
  }

  if (!('PushManager' in window)) {
    return { supported: false, reason: 'push_manager_unavailable' };
  }

  if (!('Notification' in window)) {
    return { supported: false, reason: 'notification_unavailable' };
  }

  return { supported: true, reason: '' };
}

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


function isNativeIosApp() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
}

function getLocalNotificationId(prefix, value) {
  const text = String(value ?? '');
  let hash = 0;

  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
  }

  const positiveHash = Math.abs(hash || 1) % 400000000;
  return prefix + positiveHash;
}

function getBookingStartDateTime(booking) {
  const dateKey = getDateKeyFromValue(getBookingDateValue(booking));
  const timeValue = formatTime(booking?.startTime ?? booking?.start_time);

  if (!dateKey || !timeValue) return null;

  const [year, month, day] = dateKey.split('-').map(Number);
  const [hour, minute] = timeValue.split(':').map(Number);

  if (!year || !month || !day || Number.isNaN(hour) || Number.isNaN(minute)) return null;

  const date = new Date(year, month - 1, day, hour, minute, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function showNativeNewBookingNotification(booking, totalNew = 1) {
  if (!isNativeIosApp()) return;

  const permission = await LocalNotifications.checkPermissions();
  if (permission.display !== 'granted') return;

  const clientName = String(booking?.clientName ?? booking?.client_name ?? 'Cliente').trim() || 'Cliente';
  const serviceName = String(booking?.serviceName ?? booking?.service_name ?? 'Reserva').trim() || 'Reserva';
  const dateText = formatDate(getBookingDateValue(booking));
  const timeText = formatTime(booking?.startTime ?? booking?.start_time) || 'Sin hora';
  const extraText = Number(totalNew) > 1 ? ` (+${Number(totalNew) - 1} más)` : '';

  await LocalNotifications.schedule({
    notifications: [
      {
        id: getLocalNotificationId(1000000000, booking?.id ?? Date.now()),
        title: Number(totalNew) > 1 ? `${totalNew} reservas nuevas` : 'Nueva reserva',
        body: `${clientName} · ${serviceName} · ${dateText} ${timeText}${extraText}`,
        schedule: { at: new Date(Date.now() + 1000) },
        extra: {
          tuagendayaType: 'new-booking',
          bookingId: booking?.id ?? null,
        },
      },
    ],
  });
}

async function syncNativeBookingReminderNotifications(bookings = []) {
  if (!isNativeIosApp()) return;

  const permission = await LocalNotifications.checkPermissions();
  if (permission.display !== 'granted') return;

  const pending = await LocalNotifications.getPending();
  const previousReminderNotifications = (pending.notifications || []).filter((notification) =>
    notification?.extra?.tuagendayaType === 'booking-reminder'
    || (Number(notification?.id) >= 1500000000 && Number(notification?.id) < 1900000000)
  );

  if (previousReminderNotifications.length > 0) {
    await LocalNotifications.cancel({
      notifications: previousReminderNotifications.map((notification) => ({ id: notification.id })),
    });
  }

  const now = Date.now();
  const reminders = [];

  for (const booking of bookings) {
    const status = String(booking?.status || '').trim().toLowerCase();
    if (status === 'cancelled' || status === 'canceled' || status === 'completed' || status === 'no_show' || status === 'no-show') continue;

    const startDate = getBookingStartDateTime(booking);
    if (!startDate) continue;

    const reminderAt = new Date(startDate.getTime() - (60 * 60 * 1000));
    if (reminderAt.getTime() <= now) continue;

    const clientName = String(booking?.clientName ?? booking?.client_name ?? 'Cliente').trim() || 'Cliente';
    const serviceName = String(booking?.serviceName ?? booking?.service_name ?? 'Reserva').trim() || 'Reserva';
    const timeText = formatTime(booking?.startTime ?? booking?.start_time) || '';

    reminders.push({
      id: getLocalNotificationId(1500000000, booking?.id ?? `${getBookingDateValue(booking)}-${timeText}-${clientName}`),
      title: 'Cita en 1 hora',
      body: `${clientName} · ${serviceName}${timeText ? ` · ${timeText}` : ''}`,
      schedule: { at: reminderAt },
      extra: {
        tuagendayaType: 'booking-reminder',
        bookingId: booking?.id ?? null,
      },
    });
  }

  if (reminders.length > 0) {
    await LocalNotifications.schedule({ notifications: reminders });
  }
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
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const viewMonthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  const canGoBack = allowPast || viewMonthKey > currentMonthKey;

  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = firstDay.getDay();
  const monthTitle = viewDate.toLocaleDateString('es-UY', {
    month: 'long',
    year: 'numeric',
  });
  const capitalizedMonth =
    monthTitle.charAt(0).toUpperCase() + monthTitle.slice(1);

  return (
    <div
      className="tay-almanac"
      style={{
        width: '100%',
        maxWidth: 326,
        background: '#fff',
        border: '1px solid rgba(15,23,42,.07)',
        borderRadius: 16,
        padding: 9,
        boxShadow: '0 5px 16px rgba(15,23,42,.05)',
        boxSizing: 'border-box',
      }}
    >
      <div
        className="tay-almanac-header"
        style={{
          display: 'grid',
          gridTemplateColumns: '32px 1fr 32px',
          alignItems: 'center',
          gap: 6,
          marginBottom: 7,
        }}
      >
        <button
          className="tay-almanac-nav"
          type="button"
          disabled={!canGoBack}
          onClick={() => {
            if (!canGoBack) return;
            setViewDate(
              (current) =>
                new Date(current.getFullYear(), current.getMonth() - 1, 1)
            );
          }}
          aria-label="Mes anterior"
          style={{
            width: 30,
            height: 30,
            borderRadius: 9,
            border: '1px solid rgba(15,23,42,.06)',
            background: canGoBack ? '#f7f8fa' : '#fbfbfc',
            color: canGoBack ? '#0071e3' : '#d0d0d5',
            fontSize: 16,
            fontWeight: 950,
            fontFamily: 'inherit',
            cursor: canGoBack ? 'pointer' : 'default',
          }}
        >
          ‹
        </button>

        <div
          style={{
            textAlign: 'center',
            fontSize: 12.5,
            fontWeight: 950,
            color: '#111827',
            letterSpacing: '-0.02em',
          }}
        >
          {capitalizedMonth}
        </div>

        <button
          className="tay-almanac-nav"
          type="button"
          onClick={() =>
            setViewDate(
              (current) =>
                new Date(current.getFullYear(), current.getMonth() + 1, 1)
            )
          }
          aria-label="Mes siguiente"
          style={{
            width: 30,
            height: 30,
            borderRadius: 9,
            border: '1px solid rgba(15,23,42,.06)',
            background: '#f7f8fa',
            color: '#0071e3',
            fontSize: 16,
            fontWeight: 950,
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}
        >
          ›
        </button>
      </div>

      <div
        className="tay-almanac-weekdays"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 3,
          marginBottom: 3,
        }}
      >
        {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((day, index) => (
          <div
            key={`${day}-${index}`}
            style={{
              textAlign: 'center',
              fontSize: 8.8,
              color: '#8e8e93',
              fontWeight: 900,
              padding: '1px 0',
            }}
          >
            {day}
          </div>
        ))}
      </div>

      <div
        className="tay-almanac-days"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
          gap: 3,
        }}
      >
        {Array.from({ length: startOffset }).map((_, index) => (
          <div key={`empty-${index}`} />
        ))}

        {Array.from({ length: daysInMonth }).map((_, index) => {
          const day = index + 1;
          const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const selected = key === value;
          const disabled = !allowPast && key < todayKey;

          return (
            <button
              className="tay-almanac-day"
              key={key}
              type="button"
              disabled={disabled}
              onClick={() => onChange(key)}
              style={{
                aspectRatio: '1 / 1',
                minHeight: 28,
                borderRadius: 9,
                border: selected
                  ? '1px solid #0071e3'
                  : '1px solid transparent',
                background: selected
                  ? '#0071e3'
                  : disabled
                    ? '#fafafa'
                    : '#f7f8fa',
                color: selected
                  ? '#fff'
                  : disabled
                    ? '#c7c7cc'
                    : '#1a1a1a',
                fontSize: 10.5,
                fontWeight: 900,
                fontFamily: 'inherit',
                cursor: disabled ? 'default' : 'pointer',
                boxShadow: selected
                  ? '0 5px 12px rgba(0,113,227,.18)'
                  : 'none',
              }}
            >
              {day}
            </button>
          );
        })}
      </div>

      <div
        style={{
          marginTop: 6,
          textAlign: 'center',
          minHeight: 16,
          fontSize: 10.2,
          color: value ? '#0071e3' : '#8e8e93',
          fontWeight: 800,
        }}
      >
        {value ? `Fecha elegida: ${formatDate(value)}` : placeholder}
      </div>
    </div>
  );
}

const PAYMENT_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'paid', label: 'Pagado' },
  { value: 'cancelled', label: 'Cancelado' },
];

const PAYMENT_METHOD_OPTIONS = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'online', label: 'Pago online' },
  { value: 'other', label: 'Otro' },
];

const paymentStatusLabel = {
  pending: 'Por cobrar',
  paid: 'Pagado',
  cancelled: 'Cancelado',
};

const paymentMethodLabel = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  online: 'Pago online',
  other: 'Otro',
};

const paymentStatusColor = {
  pending: '#ff9f0a',
  paid: '#30d158',
  cancelled: '#ff453a',
};

const paymentStatusBg = {
  pending: '#fff8ee',
  paid: '#edfff3',
  cancelled: '#fff2f2',
};

function getBookingPaymentStatus(booking) {
  const bookingStatus = String(booking?.status || '').trim();
  const paymentStatus = String(booking?.paymentStatus ?? booking?.payment_status ?? 'pending').trim() || 'pending';

  if (bookingStatus === 'cancelled') return 'cancelled';
  if (paymentStatus === 'cancelled' && bookingStatus !== 'cancelled') return 'pending';
  return paymentStatus === 'deposit' ? 'pending' : paymentStatus;
}

function getBookingPaymentMethod(booking) {
  return String(booking?.paymentMethod ?? booking?.payment_method ?? 'cash').trim() || 'cash';
}

function getBookingAmountPaid(booking) {
  const value = booking?.amountPaid ?? booking?.amount_paid ?? '';
  return value === null || value === undefined ? '' : String(value);
}

function getBookingTipAmount(booking) {
  const value = booking?.tipAmount ?? booking?.tip_amount ?? 0;
  return value === null || value === undefined || value === '' ? '0' : String(value);
}

function getBookingTipMethod(booking) {
  return String(booking?.tipMethod ?? booking?.tip_method ?? getBookingPaymentMethod(booking)).trim() || getBookingPaymentMethod(booking);
}

const PAYMENT_METHODS_STORAGE_KEY = 'tuagendaya_accepted_payment_methods';
const PAYMENT_METHODS_UPDATED_EVENT = 'tuagendaya:payment-methods-updated';

function normalizeAcceptedPaymentMethodsList(value) {
  const allowed = ['cash', 'transfer', 'online', 'other'];
  const raw = Array.isArray(value)
    ? value
    : String(value || '').split(',');

  const clean = raw
    .map((method) => String(method || '').trim())
    .map((method) => (method === 'card' ? 'online' : method))
    .filter((method) => allowed.includes(method));

  return clean.length > 0 ? clean : ['cash'];
}

function saveConfiguredPaymentMethodsForCash(methods) {
  const clean = normalizeAcceptedPaymentMethodsList(methods);

  try {
    localStorage.setItem(PAYMENT_METHODS_STORAGE_KEY, JSON.stringify(clean));

    const storedProfessional = JSON.parse(localStorage.getItem('tuagendaya_professional') || '{}');
    const nextProfessional = {
      ...storedProfessional,
      acceptedPaymentMethods: clean,
      accepted_payment_methods: clean,
      settings: {
        ...(storedProfessional.settings || {}),
        acceptedPaymentMethods: clean,
        accepted_payment_methods: clean,
      },
    };

    localStorage.setItem('tuagendaya_professional', JSON.stringify(nextProfessional));
  } catch {
    // localStorage puede fallar en modo privado. La app sigue funcionando con estado local.
  }

  window.dispatchEvent(new CustomEvent(PAYMENT_METHODS_UPDATED_EVENT, { detail: { methods: clean } }));
  window.dispatchEvent(new Event('tuagendaya:setup-updated'));

  return clean;
}

function getConfiguredPaymentMethodsForCash() {
  try {
    const storedDirect = JSON.parse(localStorage.getItem(PAYMENT_METHODS_STORAGE_KEY) || 'null');

    if (Array.isArray(storedDirect) && storedDirect.length > 0) {
      return normalizeAcceptedPaymentMethodsList(storedDirect);
    }
  } catch {
    // ignorar y probar con professional
  }

  try {
    const storedProfessional = JSON.parse(localStorage.getItem('tuagendaya_professional') || '{}');
    const raw =
      storedProfessional.acceptedPaymentMethods ??
      storedProfessional.accepted_payment_methods ??
      storedProfessional.settings?.acceptedPaymentMethods ??
      storedProfessional.settings?.accepted_payment_methods ??
      [];

    return normalizeAcceptedPaymentMethodsList(raw);
  } catch {
    return ['cash', 'transfer', 'online'];
  }
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

function getClientIdentityKey(clientName, clientPhone) {
  const normalizedPhone = normalizePhoneForWhatsApp(clientPhone);

  if (normalizedPhone) {
    return `phone:${normalizedPhone}`;
  }

  const normalizedName = normalizeSearchText(clientName);

  if (normalizedName) {
    return `name:${normalizedName}`;
  }

  return '';
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
    'Cobrado',
    'Propina',
    'Metodo propina',
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
    booking.amountPaid ?? booking.amount_paid ?? '',
    booking.tipAmount ?? booking.tip_amount ?? 0,
    booking.tipMethod ?? booking.tip_method ?? booking.paymentMethod ?? booking.payment_method ?? '',
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
    breakEnabled: false,
    breakStartTime: '13:00',
    breakEndTime: '14:00',
  }));
}

function normalizeAvailabilityItem(item) {
  return {
    dayOfWeek: Number(item.dayOfWeek ?? item.day_of_week ?? 0),
    isActive: Boolean(item.isActive ?? item.is_active),
    startTime: String(item.startTime ?? item.start_time ?? '09:00').slice(0, 5),
    endTime: String(item.endTime ?? item.end_time ?? '18:00').slice(0, 5),
    slotDurationMinutes: Number(item.slotDurationMinutes ?? item.slot_duration_minutes ?? 30),
    breakEnabled: Boolean(item.breakEnabled ?? item.break_enabled ?? false),
    breakStartTime: String(item.breakStartTime ?? item.break_start_time ?? '13:00').slice(0, 5),
    breakEndTime: String(item.breakEndTime ?? item.break_end_time ?? '14:00').slice(0, 5),
  };
}

function normalizeService(item) {
  return {
    id: item.id ?? item.serviceId ?? item.service_id ?? item.professional_service_id,
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
    photoUrl: item.photoUrl ?? item.photo_url ?? '',
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
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&display=swap');@keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        input.tay-clean-picker::-webkit-calendar-picker-indicator {
          opacity: 0;
          display: none;
          -webkit-appearance: none;
        }
        input.tay-clean-picker::-webkit-inner-spin-button,
        input.tay-clean-picker::-webkit-clear-button {
          display: none;
          -webkit-appearance: none;
        }
        input.tay-clean-picker {
          appearance: none;
          -webkit-appearance: none;
        }
`}</style>

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
        style={{ ...inputStyle, marginBottom: 0, borderRadius: 14, border: '0.5px solid #e2e2e8', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', cursor: 'text' }}
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



function UnifiedLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const forceProfessional = searchParams.get('tipo') === 'profesional';
    const professionalToken = localStorage.getItem('tuagendaya_token');

    if (forceProfessional && professionalToken) {
      navigate('/profesional/dashboard', { replace: true });
    }
  }, [location.search, navigate]);

  const loginAsAdmin = async () => {
    const response = await fetch(`${API_BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const loginError = new Error(data.error || 'Credenciales admin inválidas');
      loginError.status = response.status;
      throw loginError;
    }

    localStorage.removeItem('tuagendaya_token');
    localStorage.removeItem('tuagendaya_professional');
    localStorage.setItem('tuagendaya_admin_token', data.token);
    localStorage.setItem('tuagendaya_admin_user', JSON.stringify(data.admin || { email: email.trim() }));

    navigate('/admin/dashboard', { replace: true });
  };

  const loginAsProfessional = async () => {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const loginError = new Error(data.error || 'Credenciales profesionales inválidas');
      loginError.status = response.status;
      throw loginError;
    }

    localStorage.removeItem('tuagendaya_admin_token');
    localStorage.removeItem('tuagendaya_admin_user');
    localStorage.setItem('tuagendaya_token', data.token);
    localStorage.setItem('tuagendaya_session_persistent', 'true');

    if (data.professional) {
      localStorage.setItem('tuagendaya_professional', JSON.stringify(data.professional));
    } else if (!localStorage.getItem('tuagendaya_professional')) {
      localStorage.setItem('tuagendaya_professional', JSON.stringify({}));
    }

    navigate('/profesional/dashboard', { replace: true });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const searchParams = new URLSearchParams(location.search);
      const forceProfessional = searchParams.get('tipo') === 'profesional';

      if (forceProfessional) {
        await loginAsProfessional();
        return;
      }

      try {
        await loginAsAdmin();
        return;
      } catch (adminError) {
        if (adminError?.status === 429) {
          throw adminError;
        }

        await loginAsProfessional();
      }
    } catch (loginError) {
      const normalizedMessage = String(loginError?.message || '').toLowerCase();

      if (loginError?.status === 429) {
        setError(loginError.message || 'Demasiados intentos. Intentá nuevamente más tarde.');
      } else if (
        loginError?.status === 403 &&
        (normalizedMessage.includes('inactiva') || normalizedMessage.includes('suspend'))
      ) {
        setError('Tu cuenta se encuentra temporalmente suspendida. Contactá con TuAgendaYa si necesitás asistencia.');
      } else {
        setError('Credenciales inválidas. Revisá el email y la contraseña.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <TuAgendaLogo height={52} centered />
        <div style={{ fontSize: 14, color: '#6e6e73', fontWeight: 650 }}>
          Accedé a tu panel
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <label style={smallLabelStyle}>Email</label>
        <input
          style={{ ...inputStyle, marginBottom: 12 }}
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email"
          required
          autoComplete="email"
        />

        <label style={smallLabelStyle}>Contraseña</label>
        <PasswordInputField
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Contraseña"
          required
          autoComplete="current-password"
          style={{ ...inputStyle, marginBottom: 8 }}
        />

        <div style={{ textAlign: 'right', marginBottom: 12 }}>
          <button
            type="button"
            onClick={() => navigate('/forgot-password')}
            style={{ border: 'none', background: 'transparent', color: '#0071e3', padding: 0, fontSize: 13, fontWeight: 750, fontFamily: 'inherit', cursor: 'pointer' }}
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>

        {error && (
          <div style={{ background: '#fff2f2', border: '0.5px solid #ffcdd2', borderRadius: 12, padding: '10px 12px', fontSize: 13, color: '#c62828', marginBottom: 12, fontWeight: 700 }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: '13px', borderRadius: 14, border: 'none', background: loading ? '#aeaeb2' : '#0071e3', color: '#fff', fontSize: 15, fontWeight: 850, fontFamily: 'inherit', cursor: loading ? 'not-allowed' : 'pointer', marginTop: 4 }}
        >
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>

      <button
        type="button"
        onClick={() => navigate('/profesional/register')}
        style={{ width: '100%', marginTop: 12, padding: '12px', borderRadius: 14, border: '0.5px solid #d0d0d5', background: '#fff', color: '#0071e3', fontSize: 14, fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer' }}
      >
        Crear cuenta profesional
      </button>

      <div style={{ textAlign: 'center', fontSize: 11.5, color: '#8e8e93', marginTop: 14, lineHeight: 1.35, fontWeight: 650 }}>
        Tus datos están cifrados y protegidos.
      </div>
    </AuthLayout>
  );
}


function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo procesar la solicitud');
      }

      setSent(true);
    } catch (requestError) {
      setError(requestError.message || 'No se pudo procesar la solicitud. Intentá nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <TuAgendaLogo height={52} centered />
        <div style={{ fontSize: 18, color: '#1d1d1f', fontWeight: 850, marginTop: 12 }}>
          Recuperar contraseña
        </div>
        <div style={{ fontSize: 13, color: '#6e6e73', fontWeight: 650, marginTop: 6, lineHeight: 1.45 }}>
          Ingresá el email de tu cuenta profesional y te enviaremos un enlace seguro.
        </div>
      </div>

      {sent ? (
        <>
          <div style={{ background: '#f2fbf4', border: '0.5px solid #b7e4c1', borderRadius: 14, padding: '14px 16px', fontSize: 13, color: '#1f6f36', lineHeight: 1.5, fontWeight: 700 }}>
            Si el email existe, te enviamos instrucciones para recuperar la contraseña. Revisá también Spam o Correo no deseado.
          </div>

          <button
            type="button"
            onClick={() => navigate('/login?tipo=profesional')}
            style={{ width: '100%', marginTop: 14, padding: '12px', borderRadius: 14, border: '0.5px solid #d0d0d5', background: '#fff', color: '#0071e3', fontSize: 14, fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer' }}
          >
            Volver a ingresar
          </button>
        </>
      ) : (
        <form onSubmit={handleSubmit}>
          <label style={smallLabelStyle}>Email</label>
          <input
            style={{ ...inputStyle, marginBottom: 12 }}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            required
            autoComplete="email"
          />

          {error && (
            <div style={{ background: '#fff2f2', border: '0.5px solid #ffcdd2', borderRadius: 12, padding: '10px 12px', fontSize: 13, color: '#c62828', marginBottom: 12, fontWeight: 700 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '13px', borderRadius: 14, border: 'none', background: loading ? '#aeaeb2' : '#0071e3', color: '#fff', fontSize: 15, fontWeight: 850, fontFamily: 'inherit', cursor: loading ? 'not-allowed' : 'pointer', marginTop: 4 }}
          >
            {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/login?tipo=profesional')}
            style={{ width: '100%', marginTop: 12, padding: '12px', borderRadius: 14, border: '0.5px solid #d0d0d5', background: '#fff', color: '#0071e3', fontSize: 14, fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer' }}
          >
            Volver
          </button>
        </form>
      )}
    </AuthLayout>
  );
}


function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = new URLSearchParams(location.search).get('token') || '';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!token) {
      setError('El enlace de recuperación es inválido.');
      return;
    }

    if (newPassword.length < 8) {
      setError('La nueva contraseña debe tener mínimo 8 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo cambiar la contraseña');
      }

      setSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
    } catch (requestError) {
      setError(requestError.message || 'No se pudo cambiar la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <TuAgendaLogo height={52} centered />
        <div style={{ fontSize: 18, color: '#1d1d1f', fontWeight: 850, marginTop: 12 }}>
          Crear nueva contraseña
        </div>
        <div style={{ fontSize: 13, color: '#6e6e73', fontWeight: 650, marginTop: 6, lineHeight: 1.45 }}>
          Elegí una contraseña nueva de al menos 8 caracteres.
        </div>
      </div>

      {success ? (
        <>
          <div style={{ background: '#f2fbf4', border: '0.5px solid #b7e4c1', borderRadius: 14, padding: '14px 16px', fontSize: 13, color: '#1f6f36', lineHeight: 1.5, fontWeight: 700 }}>
            Contraseña actualizada correctamente. Ya podés ingresar con tu nueva contraseña.
          </div>

          <button
            type="button"
            onClick={() => navigate('/login?tipo=profesional')}
            style={{ width: '100%', marginTop: 14, padding: '13px', borderRadius: 14, border: 'none', background: '#0071e3', color: '#fff', fontSize: 15, fontWeight: 850, fontFamily: 'inherit', cursor: 'pointer' }}
          >
            Ir al inicio de sesión
          </button>
        </>
      ) : (
        <form onSubmit={handleSubmit}>
          <label style={smallLabelStyle}>Nueva contraseña</label>
          <PasswordInputField
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="Nueva contraseña"
            required
            autoComplete="new-password"
            style={{ ...inputStyle, marginBottom: 12 }}
          />

          <label style={smallLabelStyle}>Repetir contraseña</label>
          <PasswordInputField
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Repetir contraseña"
            required
            autoComplete="new-password"
            style={{ ...inputStyle, marginBottom: 12 }}
          />

          {!token && !error && (
            <div style={{ background: '#fff2f2', border: '0.5px solid #ffcdd2', borderRadius: 12, padding: '10px 12px', fontSize: 13, color: '#c62828', marginBottom: 12, fontWeight: 700 }}>
              El enlace de recuperación es inválido.
            </div>
          )}

          {error && (
            <div style={{ background: '#fff2f2', border: '0.5px solid #ffcdd2', borderRadius: 12, padding: '10px 12px', fontSize: 13, color: '#c62828', marginBottom: 12, fontWeight: 700 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !token}
            style={{ width: '100%', padding: '13px', borderRadius: 14, border: 'none', background: loading || !token ? '#aeaeb2' : '#0071e3', color: '#fff', fontSize: 15, fontWeight: 850, fontFamily: 'inherit', cursor: loading || !token ? 'not-allowed' : 'pointer', marginTop: 4 }}
          >
            {loading ? 'Guardando...' : 'Cambiar contraseña'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/login?tipo=profesional')}
            style={{ width: '100%', marginTop: 12, padding: '12px', borderRadius: 14, border: '0.5px solid #d0d0d5', background: '#fff', color: '#0071e3', fontSize: 14, fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer' }}
          >
            Volver
          </button>
        </form>
      )}
    </AuthLayout>
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
        <PasswordInputField
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña"
          required
          autoComplete="current-password"
          style={{ ...inputStyle, marginBottom: 12 }}
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
  const [legalAccepted, setLegalAccepted] = useState(false);

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

    if (!legalAccepted) {
      setError('Debés aceptar los Términos y Condiciones y la Política de Privacidad.');
      setStep(4);
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
            <PasswordInputField
              value={form.password}
              onChange={(e) => updateForm('password', e.target.value)}
              placeholder="Contraseña"
              required
              autoComplete="new-password"
              style={{ ...inputStyle, marginBottom: 0, borderRadius: 15, padding: '13px 14px' }}
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
          onClick={() => navigate('/login')}
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

            {step === 4 && (
              <label style={{ marginTop: 16, display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', color: '#475569', fontSize: 12.5, lineHeight: 1.5, fontWeight: 700 }}>
                <input
                  type="checkbox"
                  checked={legalAccepted}
                  onChange={(event) => setLegalAccepted(event.target.checked)}
                  style={{ marginTop: 2, width: 17, height: 17, accentColor: '#0071e3', flex: '0 0 auto' }}
                />
                <span>
                  He leído y acepto los{' '}
                  <a href="/terminos" target="_blank" rel="noreferrer" style={{ color: '#0071e3', fontWeight: 900 }}>
                    Términos y Condiciones
                  </a>{' '}
                  y la{' '}
                  <a href="/privacidad" target="_blank" rel="noreferrer" style={{ color: '#0071e3', fontWeight: 900 }}>
                    Política de Privacidad
                  </a>
                  .
                </span>
              </label>
            )}

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
            onClick={() => navigate('/login')}
            style={{ width: '100%', marginTop: 12, padding: '13px', borderRadius: 18, border: '0.5px solid #d0d0d5', background: '#fff', color: '#0071e3', fontSize: 14, fontWeight: 900, fontFamily: 'inherit', cursor: 'pointer' }}
          >
            Ya tengo cuenta
          </button>
        </section>
      </div>
    </div>
  );
}


function SetupChecklistSection() {
  const [shouldShowNotice, setShouldShowNotice] = useState(false);
  const [loadingSetup, setLoadingSetup] = useState(true);
  const token = localStorage.getItem('tuagendaya_token');

  useEffect(() => {
    if (!token) {
      setShouldShowNotice(false);
      setLoadingSetup(false);
      return;
    }

    let active = true;

    async function loadSetupState() {
      setLoadingSetup(true);

      const headers = { Authorization: `Bearer ${token}` };

      const safeFetch = async (path) => {
        try {
          const response = await fetch(`${API_BASE}${path}`, { headers });
          const data = await response.json().catch(() => ({}));
          return response.ok ? data : {};
        } catch {
          return {};
        }
      };

      const [servicesData, profileData, availabilityData, settingsData] = await Promise.all([
        safeFetch('/professionals/me/services'),
        safeFetch('/auth/me'),
        safeFetch('/professionals/me/availability'),
        safeFetch('/professionals/me/settings'),
      ]);

      if (!active) return;

      const services = (servicesData.services || [])
        .map(normalizeService)
        .filter((service) => String(service.name || '').trim());

      const availability = availabilityData.availability || availabilityData.days || [];
      const settings = settingsData.settings || settingsData || {};

      const hasServices = services.length > 0;
      const hasAvailability = availability.some((day) => {
        const isActive = day?.isActive ?? day?.is_active ?? day?.active;
        const start = day?.startTime || day?.start_time || day?.start;
        const end = day?.endTime || day?.end_time || day?.end;
        return Boolean(isActive && start && end);
      });

      const acceptedPaymentMethods = settings.acceptedPaymentMethods || settings.accepted_payment_methods || [];
      const hasPaymentMethods = Array.isArray(acceptedPaymentMethods)
        ? acceptedPaymentMethods.length > 0
        : Boolean(acceptedPaymentMethods);

      const isPanelReady =
        hasServices &&
        hasAvailability &&
        hasPaymentMethods;

      setShouldShowNotice(!isPanelReady);
      setLoadingSetup(false);
    }

    loadSetupState();

    const refreshSetupState = () => loadSetupState();
    window.addEventListener('tuagendaya:setup-updated', refreshSetupState);

    return () => {
      active = false;
      window.removeEventListener('tuagendaya:setup-updated', refreshSetupState);
    };
  }, [token]);

  if (loadingSetup || !shouldShowNotice) {
    return null;
  }

  return (
    <section className="agenda-start-notice">
      <style>{setupChecklistStyles}</style>

      <div>
        <div className="agenda-start-pill">Configuración inicial</div>
        <h2>Configurá tu agenda a tu gusto</h2>
        <p>
          Entrá a <strong>Configuración</strong> para cargar tus servicios, horarios, métodos de pago y ajustes antes de empezar a compartir tu link público.
        </p>
      </div>
    </section>
  );
}

const setupChecklistStyles = `
  .agenda-start-notice {
    background: #ffffff;
    border: 0.5px solid #e8e8ed;
    border-radius: 24px;
    padding: 18px 20px;
    margin-bottom: 16px;
    box-shadow: 0 1px 10px rgba(0,0,0,0.045);
  }

  .agenda-start-pill {
    display: inline-flex;
    align-items: center;
    min-height: 26px;
    padding: 5px 10px;
    border-radius: 999px;
    background: #eef6ff;
    color: #0071e3;
    font-size: 12px;
    font-weight: 900;
    margin-bottom: 9px;
  }

  .agenda-start-notice h2 {
    margin: 0;
    color: #1a1a1a;
    font-size: 21px;
    line-height: 1.15;
    font-weight: 950;
    letter-spacing: -0.015em;
  }

  .agenda-start-notice p {
    margin: 7px 0 0;
    color: #6e6e73;
    font-size: 13.5px;
    line-height: 1.45;
    font-weight: 650;
  }

  .agenda-start-notice strong {
    color: #1a1a1a;
    font-weight: 950;
  }

  @media (max-width: 760px) {
    .agenda-start-notice {
      border-radius: 22px;
      padding: 15px;
    }

    .agenda-start-notice h2 {
      font-size: 18.5px;
    }

    .agenda-start-notice p {
      font-size: 12.5px;
    }
  }
`;



function BookingTipQuickEditor({ booking, token, onUpdated }) {
  const [tipAmount, setTipAmount] = useState(getBookingTipAmount(booking));
  const [tipMethod, setTipMethod] = useState(getBookingTipMethod(booking));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setTipAmount(getBookingTipAmount(booking));
    setTipMethod(getBookingTipMethod(booking));
  }, [booking?.id, booking?.tipAmount, booking?.tip_amount, booking?.tipMethod, booking?.tip_method]);

  const paymentStatus = getBookingPaymentStatus(booking);
  const paymentMethod = getBookingPaymentMethod(booking);
  const amountPaid = Number(getBookingAmountPaid(booking) || booking?.servicePrice || booking?.service_price || 0) || 0;

  const configuredPaymentMethods = getConfiguredPaymentMethodsForCash();
  const tipMethodOptions = PAYMENT_METHOD_OPTIONS.filter((method) => configuredPaymentMethods.includes(method.value));

  useEffect(() => {
    if (!configuredPaymentMethods.includes(tipMethod)) {
      setTipMethod(configuredPaymentMethods[0] || 'cash');
    }
  }, [configuredPaymentMethods, tipMethod]);

  const quickAddTip = (value) => {
    const current = Number(tipAmount || 0) || 0;
    setTipAmount(String(current + value));
  };

  const saveTip = async () => {
    if (!booking?.id || !token) return;

    setSaving(true);
    setMessage('');

    try {
      const response = await fetch(`${API_BASE}/bookings/${booking.id}/payment`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          paymentStatus,
          paymentMethod,
          amountPaid,
          tipAmount: Number(tipAmount || 0) || 0,
          tipMethod,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo guardar la propina');
      }

      setMessage('Propina guardada');
      onUpdated?.(data.booking);
      window.dispatchEvent(new Event('tuagendaya:bookings-updated'));
    } catch (error) {
      setMessage(error.message || 'No se pudo guardar la propina');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="tip-editor-card">
      <div className="tip-editor-header">
        <div>
          <strong>Propina</strong>
          <span>Se suma aparte del servicio.</span>
        </div>
        <strong className="tip-editor-total">{formatMoney(Number(tipAmount || 0) || 0)}</strong>
      </div>

      <div className="tip-quick-row">
        {[50, 100, 200].map((value) => (
          <button key={value} type="button" onClick={() => quickAddTip(value)}>
            +{value}
          </button>
        ))}
        <button type="button" onClick={() => setTipAmount('0')}>
          Sin propina
        </button>
      </div>

      <div className="tip-form-grid">
        <label>
          <span>Monto</span>
          <input
            value={tipAmount}
            onChange={(event) => setTipAmount(event.target.value.replace(/[^\d.]/g, ''))}
            inputMode="decimal"
            placeholder="0"
          />
        </label>

        <label>
          <span>Método</span>
          <select value={tipMethod} onChange={(event) => setTipMethod(event.target.value)}>
            {tipMethodOptions.map((method) => (
              <option key={method.value} value={method.value}>
                {method.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button className="tip-save-button" type="button" onClick={saveTip} disabled={saving}>
        {saving ? 'Guardando...' : 'Guardar propina'}
      </button>

      {message && <div className="tip-save-message">{message}</div>}
    </div>
  );
}

const tipEditorStyles = `
  .tip-editor-card {
    margin-top: 10px;
    padding: 13px;
    border-radius: 18px;
    background: #f7f7fb;
    border: 0.5px solid #e5e5ea;
  }

  .tip-editor-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 10px;
  }

  .tip-editor-header strong {
    display: block;
    font-size: 14px;
    color: #1a1a1a;
    font-weight: 950;
  }

  .tip-editor-header span {
    display: block;
    margin-top: 2px;
    font-size: 11.5px;
    color: #8e8e93;
    font-weight: 750;
  }

  .tip-editor-total {
    color: #16a34a !important;
    white-space: nowrap;
  }

  .tip-quick-row {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 7px;
    margin-bottom: 9px;
  }

  .tip-quick-row button,
  .tip-save-button {
    border: none;
    border-radius: 13px;
    min-height: 38px;
    font-family: inherit;
    font-weight: 900;
    cursor: pointer;
  }

  .tip-quick-row button {
    background: #eef6ff;
    color: #0071e3;
  }

  .tip-form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .tip-form-grid label span {
    display: block;
    font-size: 11px;
    color: #8e8e93;
    margin-bottom: 4px;
    font-weight: 850;
  }

  .tip-form-grid input,
  .tip-form-grid select {
    width: 100%;
    min-height: 40px;
    border: 0.5px solid #d8d8de;
    border-radius: 13px;
    padding: 8px 10px;
    font-family: inherit;
    font-size: 14px;
    font-weight: 800;
    box-sizing: border-box;
    background: #fff;
  }

  .tip-card-note {
    margin-top: 8px;
    padding: 8px 10px;
    border-radius: 12px;
    background: #fff8eb;
    color: #9a5d00;
    font-size: 11px;
    line-height: 1.35;
    font-weight: 800;
  }

  .tip-save-button {
    width: 100%;
    margin-top: 9px;
    background: #0071e3;
    color: #fff;
  }

  .tip-save-button:disabled {
    opacity: 0.65;
  }

  .tip-save-message {
    margin-top: 7px;
    font-size: 12px;
    color: #16a34a;
    font-weight: 850;
  }

  @media (max-width: 760px) {
    .tip-quick-row {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .tip-form-grid {
      grid-template-columns: 1fr;
    }
  }
`;


function BookingStartIntervalSetting() {
  const [value, setValue] = useState(30);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('tuagendaya_token');

    fetch(`${API_BASE}/professionals/me/booking-start-interval`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'No se pudo cargar el intervalo');
        setValue(Number(data.bookingStartIntervalMinutes) === 60 ? 60 : 30);
      })
      .catch(() => {
        setStatus('No se pudo cargar esta configuración.');
      });
  }, []);

  const saveInterval = async (nextValue) => {
    const token = localStorage.getItem('tuagendaya_token');
    setSaving(true);
    setStatus('');

    try {
      const response = await fetch(`${API_BASE}/professionals/me/booking-start-interval`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingStartIntervalMinutes: nextValue,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo guardar');
      }

      setValue(nextValue);
      setStatus('Guardado');
    } catch (error) {
      setStatus(error.message || 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 20,
        padding: '20px 24px',
        boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
      }}
    >
      <div style={{ fontSize: 17, fontWeight: 800, color: '#1a1a1a' }}>
        Intervalo de inicio de turnos
      </div>
      <div style={{ fontSize: 13, color: '#6e6e73', marginTop: 4, lineHeight: 1.5 }}>
        Elegí cada cuánto tiempo puede comenzar una reserva. Esto no modifica la duración de tus servicios.
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
        {[30, 60].map((option) => {
          const active = value === option;

          return (
            <button
              key={option}
              type="button"
              disabled={saving}
              onClick={() => saveInterval(option)}
              style={{
                border: active
                  ? '1px solid rgba(0,113,227,.25)'
                  : '1px solid rgba(15,23,42,.08)',
                borderRadius: 14,
                padding: '11px 16px',
                background: active ? '#0071e3' : '#f7f8fa',
                color: active ? '#fff' : '#1d2636',
                fontFamily: 'inherit',
                fontSize: 13,
                fontWeight: 900,
                cursor: saving ? 'default' : 'pointer',
              }}
            >
              Cada {option} minutos
            </button>
          );
        })}
      </div>

      {status && (
        <div
          style={{
            marginTop: 10,
            fontSize: 12,
            fontWeight: 800,
            color: status === 'Guardado' ? '#248a3d' : '#c62828',
          }}
        >
          {status}
        </div>
      )}
    </div>
  );
}


function ManualBookingModal({ open, initialClient = null, onClose, onCreated }) {
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [bookingStartIntervalMinutes, setBookingStartIntervalMinutes] = useState(30);
  const [manualClients, setManualClients] = useState([]);
  const [clientSuggestionsOpen, setClientSuggestionsOpen] = useState(false);
  const [form, setForm] = useState({
    clientName: '',
    clientPhone: '',
    serviceId: '',
    staffId: '',
    bookingDate: '',
    startTime: '',
    comment: '',
  });

  useEffect(() => {
    if (!open) return;

    const now = new Date();
    const localDate = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-');

    setForm({
      clientName: initialClient?.name || '',
      clientPhone: initialClient?.phone || '',
      serviceId: '',
      staffId: '',
      bookingDate: localDate,
      startTime: '',
      comment: '',
    });
    setError('');
    setSaving(false);
    setClientSuggestionsOpen(false);

    const token = localStorage.getItem('tuagendaya_token');
    setLoadingOptions(true);

    Promise.all([
      fetch(`${API_BASE}/professionals/me/services`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'No se pudieron cargar los servicios');
        return (data.services || []).map(normalizeService).filter((item) => item.isActive !== false);
      }),
      fetch(`${API_BASE}/staff`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'No se pudieron cargar los profesionales');
        return (data.staff || []).map(normalizeStaff).filter((item) => item.isActive !== false);
      }),
      fetch(`${API_BASE}/professionals/me/booking-start-interval`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'No se pudo cargar el intervalo de horarios');
        return Number(data.bookingStartIntervalMinutes) === 60 ? 60 : 30;
      }),
      fetch(`${API_BASE}/bookings/me`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'No se pudieron cargar los clientes');
        return Array.isArray(data.bookings) ? data.bookings : [];
      }),
      fetch(`${API_BASE}/professionals/me/clients`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) return [];
        return Array.isArray(data.clients) ? data.clients : [];
      }),
    ])
      .then(([nextServices, nextStaff, nextInterval, existingBookings, importedClients]) => {
        setServices(nextServices);
        setStaff(nextStaff);
        setBookingStartIntervalMinutes(nextInterval);

        const clientMap = new Map();
        const addClient = (nameValue, phoneValue) => {
          const name = String(nameValue || '').trim();
          const phone = String(phoneValue || '').trim();
          if (!name && !phone) return;

          const identityKey = normalizePhoneForWhatsApp(phone) || `name:${normalizeSearchText(name)}`;
          if (!identityKey || identityKey === 'name:') return;

          const current = clientMap.get(identityKey);
          clientMap.set(identityKey, {
            name: name || current?.name || 'Sin nombre',
            phone: phone || current?.phone || '',
          });
        };

        existingBookings.forEach((booking) => {
          addClient(booking.clientName ?? booking.client_name, booking.clientPhone ?? booking.client_phone);
        });
        importedClients.forEach((client) => {
          addClient(client.name ?? client.clientName ?? client.client_name, client.phone ?? client.clientPhone ?? client.client_phone);
        });

        setManualClients(
          Array.from(clientMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }))
        );
        setForm((current) => ({
          ...current,
          serviceId: nextServices.length === 1 ? String(nextServices[0].id) : current.serviceId,
          staffId: nextStaff.length === 1 ? String(nextStaff[0].id) : current.staffId,
        }));
      })
      .catch((loadError) => {
        setError(loadError.message || 'No se pudieron cargar los datos para agendar.');
      })
      .finally(() => setLoadingOptions(false));
  }, [open, initialClient?.name, initialClient?.phone]);

  if (!open) return null;

  const manualTimeOptions = Array.from(
    { length: Math.floor((24 * 60 - 6 * 60) / bookingStartIntervalMinutes) },
    (_, index) => {
      const totalMinutes = 6 * 60 + index * bookingStartIntervalMinutes;
      const hour = Math.floor(totalMinutes / 60);
      const minute = totalMinutes % 60;
      const value = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      return value;
    }
  );

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError('');
  };

  const clientSearch = normalizeSearchText(form.clientName);
  const filteredManualClients = clientSearch
    ? manualClients
        .filter((client) => normalizeSearchText(client.name).includes(clientSearch))
        .sort((a, b) => {
          const aName = normalizeSearchText(a.name);
          const bName = normalizeSearchText(b.name);
          const aStarts = aName.startsWith(clientSearch) ? 0 : 1;
          const bStarts = bName.startsWith(clientSearch) ? 0 : 1;
          if (aStarts !== bStarts) return aStarts - bStarts;
          return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
        })
        .slice(0, 8)
    : [];

  const selectManualClient = (client) => {
    setForm((current) => ({
      ...current,
      clientName: client.name || '',
      clientPhone: client.phone || '',
    }));
    setClientSuggestionsOpen(false);
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.clientName.trim() || !form.clientPhone.trim()) {
      setError('Nombre y teléfono son obligatorios.');
      return;
    }

    if (!form.serviceId) {
      setError('Seleccioná un servicio.');
      return;
    }

    if (!form.bookingDate || !form.startTime) {
      setError('Seleccioná fecha y hora.');
      return;
    }

    const token = localStorage.getItem('tuagendaya_token');
    setSaving(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE}/bookings/manual`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientName: form.clientName.trim(),
          clientPhone: form.clientPhone.trim(),
          serviceId: Number(form.serviceId),
          staffId: form.staffId ? Number(form.staffId) : null,
          bookingDate: form.bookingDate,
          startTime: form.startTime,
          comment: form.comment.trim(),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo crear la reserva.');
      }

      onCreated?.(data.booking);
      onClose?.();
    } catch (submitError) {
      setError(submitError.message || 'No se pudo crear la reserva.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Agendar cliente"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose?.();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 12000,
        background: 'rgba(15, 23, 42, 0.46)',
        backdropFilter: 'blur(8px)',
        display: 'grid',
        placeItems: 'center',
        padding: 18,
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: 'min(560px, 100%)',
          maxHeight: 'calc(100vh - 36px)',
          overflowY: 'auto',
          background: '#fff',
          borderRadius: 24,
          padding: 22,
          boxShadow: '0 24px 70px rgba(15,23,42,0.24)',
          border: '0.5px solid rgba(15,23,42,0.08)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 950, color: '#111827' }}>Agendar cliente</div>
            <div style={{ fontSize: 12.5, color: '#6e6e73', lineHeight: 1.45, marginTop: 4, fontWeight: 650 }}>
              Reserva manual creada por el profesional.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Cerrar"
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              border: 'none',
              background: '#f2f2f7',
              color: '#6e6e73',
              fontSize: 20,
              fontWeight: 800,
              cursor: saving ? 'default' : 'pointer',
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
          <label style={{ position: 'relative' }}>
            <span style={{ display: 'block', fontSize: 11.5, color: '#6e6e73', fontWeight: 850, marginBottom: 6 }}>Nombre del cliente</span>
            <input
              value={form.clientName}
              onChange={(event) => {
                updateField('clientName', event.target.value);
                setClientSuggestionsOpen(true);
              }}
              onFocus={() => {
                if (form.clientName.trim()) setClientSuggestionsOpen(true);
              }}
              onBlur={() => {
                window.setTimeout(() => setClientSuggestionsOpen(false), 140);
              }}
              placeholder="Nombre y apellido"
              autoComplete="off"
              style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
            />

            {clientSuggestionsOpen && clientSearch && filteredManualClients.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  zIndex: 40,
                  marginTop: 5,
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 14,
                  boxShadow: '0 12px 32px rgba(15,23,42,0.16)',
                  overflow: 'hidden',
                  maxHeight: 260,
                  overflowY: 'auto',
                }}
              >
                {filteredManualClients.map((client, index) => (
                  <button
                    key={`${normalizePhoneForWhatsApp(client.phone) || normalizeSearchText(client.name)}-${index}`}
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      selectManualClient(client);
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      border: 'none',
                      borderBottom: index < filteredManualClients.length - 1 ? '1px solid #f1f1f3' : 'none',
                      background: '#fff',
                      textAlign: 'left',
                      padding: '11px 12px',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontSize: 13.5, fontWeight: 850, color: '#111827' }}>{client.name || 'Sin nombre'}</div>
                    {client.phone && (
                      <div style={{ fontSize: 11.5, color: '#6e6e73', marginTop: 2, fontWeight: 650 }}>{client.phone}</div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </label>

          <label>
            <span style={{ display: 'block', fontSize: 11.5, color: '#6e6e73', fontWeight: 850, marginBottom: 6 }}>Teléfono</span>
            <input
              value={form.clientPhone}
              onChange={(event) => updateField('clientPhone', event.target.value)}
              placeholder="099 123 456"
              inputMode="tel"
              style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
            />
          </label>

          <label>
            <span style={{ display: 'block', fontSize: 11.5, color: '#6e6e73', fontWeight: 850, marginBottom: 6 }}>Servicio</span>
            <select
              value={form.serviceId}
              onChange={(event) => updateField('serviceId', event.target.value)}
              disabled={loadingOptions}
              style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', background: '#fff' }}
            >
              <option value="">Seleccionar servicio</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}{service.durationMinutes ? ` · ${service.durationMinutes} min` : ''}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span style={{ display: 'block', fontSize: 11.5, color: '#6e6e73', fontWeight: 850, marginBottom: 6 }}>Profesional</span>
            <select
              value={form.staffId}
              onChange={(event) => updateField('staffId', event.target.value)}
              disabled={loadingOptions}
              style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', background: '#fff' }}
            >
              <option value="">Sin asignar</option>
              {staff.map((member) => (
                <option key={member.id} value={member.id}>{member.name}</option>
              ))}
            </select>
          </label>

          <div style={{ gridColumn: '1 / -1' }}>
            <span style={{ display: 'block', fontSize: 11.5, color: '#6e6e73', fontWeight: 850, marginBottom: 6 }}>Fecha</span>
            <DatePickerField
              value={form.bookingDate}
              onChange={(value) => updateField('bookingDate', value)}
              placeholder="Elegí un día"
              allowPast={false}
            />
          </div>

          <label style={{ position: 'relative' }}>
            <span style={{ display: 'block', fontSize: 11.5, color: '#6e6e73', fontWeight: 850, marginBottom: 6 }}>Hora</span>

            <button
              type="button"
              onClick={() => setTimePickerOpen((current) => !current)}
              aria-haspopup="listbox"
              aria-expanded={timePickerOpen}
              style={{
                ...inputStyle,
                width: '100%',
                minHeight: 46,
                boxSizing: 'border-box',
                background: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                cursor: 'pointer',
                textAlign: 'left',
                color: form.startTime ? '#111827' : '#8e8e93',
                fontFamily: 'inherit',
                fontWeight: form.startTime ? 800 : 650,
              }}
            >
              <span>{form.startTime || 'Seleccionar hora'}</span>
              <span
                aria-hidden="true"
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 9,
                  display: 'grid',
                  placeItems: 'center',
                  background: '#f2f7ff',
                  color: '#0071e3',
                  fontSize: 15,
                  lineHeight: 1,
                }}
              >
                ◷
              </span>
            </button>

            {timePickerOpen && (
              <div
                role="listbox"
                aria-label="Seleccionar hora"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  left: 0,
                  right: 0,
                  zIndex: 13000,
                  background: 'rgba(255,255,255,0.98)',
                  border: '1px solid rgba(15,23,42,0.08)',
                  borderRadius: 18,
                  boxShadow: '0 18px 45px rgba(15,23,42,0.18)',
                  padding: 10,
                  maxHeight: 248,
                  overflowY: 'auto',
                  backdropFilter: 'blur(18px)',
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                    gap: 7,
                  }}
                >
                  {manualTimeOptions.map((time) => {
                    const selected = form.startTime === time;

                    return (
                      <button
                        key={time}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onClick={() => {
                          updateField('startTime', time);
                          setTimePickerOpen(false);
                        }}
                        style={{
                          border: selected
                            ? '1px solid rgba(0,113,227,0.22)'
                            : '1px solid rgba(15,23,42,0.06)',
                          borderRadius: 12,
                          padding: '9px 8px',
                          background: selected ? '#0071e3' : '#f7f8fa',
                          color: selected ? '#fff' : '#1d2636',
                          fontFamily: 'inherit',
                          fontSize: 12.5,
                          fontWeight: 850,
                          cursor: 'pointer',
                          transition: 'transform .15s ease, background .15s ease',
                        }}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </label>
        </div>

        <label style={{ display: 'block', marginTop: 12 }}>
          <span style={{ display: 'block', fontSize: 11.5, color: '#6e6e73', fontWeight: 850, marginBottom: 6 }}>Nota de la reserva (opcional)</span>
          <textarea
            value={form.comment}
            onChange={(event) => updateField('comment', event.target.value)}
            placeholder="Ej: pidió este horario por teléfono..."
            maxLength={1000}
            style={{
              ...inputStyle,
              width: '100%',
              minHeight: 82,
              resize: 'vertical',
              boxSizing: 'border-box',
              fontFamily: 'inherit',
            }}
          />
        </label>

        <div
          style={{
            marginTop: 14,
            padding: '10px 12px',
            borderRadius: 13,
            background: '#f5f8ff',
            color: '#44607c',
            fontSize: 11.5,
            lineHeight: 1.45,
            fontWeight: 700,
          }}
        >
          La reserva se crea confirmada. El sistema mantiene el control de disponibilidad y evita reservar un horario ocupado.
        </div>

        {error && (
          <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 12, background: '#fff2f2', color: '#c62828', fontSize: 12.5, fontWeight: 800 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={{
              border: 'none',
              borderRadius: 13,
              padding: '11px 15px',
              background: '#f2f2f7',
              color: '#1a1a1a',
              fontFamily: 'inherit',
              fontSize: 13,
              fontWeight: 900,
              cursor: saving ? 'default' : 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving || loadingOptions}
            style={{
              border: 'none',
              borderRadius: 13,
              padding: '11px 17px',
              background: saving || loadingOptions ? '#b7c8dc' : '#0071e3',
              color: '#fff',
              fontFamily: 'inherit',
              fontSize: 13,
              fontWeight: 900,
              cursor: saving || loadingOptions ? 'default' : 'pointer',
            }}
          >
            {saving ? 'Agendando...' : 'Confirmar reserva'}
          </button>
        </div>
      </form>
    </div>
  );
}


function NicoTimelineCalendar({
  bookings,
  staff,
  selectedDateKey,
  onDateChange,
  onBookingOpen,
  ownerName,
}) {
  const pad = (value) => String(value).padStart(2, '0');
  const toDateKey = (date) =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

  const fromDateKey = (dateKey) => {
    const [year, month, day] = String(dateKey || '').split('-').map(Number);
    if (!year || !month || !day) return new Date();
    return new Date(year, month - 1, day);
  };

  const addDays = (dateKey, amount) => {
    const date = fromDateKey(dateKey);
    date.setDate(date.getDate() + amount);
    return toDateKey(date);
  };

  const bookingDateKey = (booking) => {
    const raw = String(getBookingDateValue(booking) || '').trim();
    const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

    const slash = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (slash) return `${slash[3]}-${pad(slash[2])}-${pad(slash[1])}`;

    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? '' : toDateKey(parsed);
  };

  const timeToMinutes = (value) => {
    const normalized = formatTime(value);
    if (!normalized) return null;
    const [hour, minute] = normalized.split(':').map(Number);
    return Number.isFinite(hour) && Number.isFinite(minute)
      ? hour * 60 + minute
      : null;
  };

  const selectedDate = fromDateKey(selectedDateKey);
  const weekday = selectedDate.toLocaleDateString('es-UY', { weekday: 'long' });
  const month = selectedDate.toLocaleDateString('es-UY', { month: 'long' });
  const dayTitle = `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${selectedDate.getDate()} de ${month}`;

  const monday = new Date(selectedDate);
  monday.setDate(selectedDate.getDate() - ((selectedDate.getDay() + 6) % 7));

  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const key = toDateKey(date);

    return {
      key,
      weekday: ['D', 'L', 'M', 'M', 'J', 'V', 'S'][date.getDay()],
      day: date.getDate(),
      count: bookings.filter((booking) => bookingDateKey(booking) === key).length,
    };
  });

  const dayBookings = bookings.filter(
    (booking) => bookingDateKey(booking) === selectedDateKey
  );

  const activeStaff = (Array.isArray(staff) ? staff : [])
    .filter((member) => member?.isActive !== false)
    .map((member, index) => ({
      id: String(member.id),
      name: member.name || `Profesional ${index + 1}`,
      color: member.color || '#0071e3',
    }));

  const needsOwnerColumn = dayBookings.some(
    (booking) => !(booking.staffId ?? booking.staff_id)
  );

  const normalizeNameKey = (value) =>
    String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();

  const ownerNameKey = normalizeNameKey(ownerName);
  const ownerStaffMatch = activeStaff.find(
    (member) => ownerNameKey && normalizeNameKey(member.name) === ownerNameKey
  );

  const columns = [...activeStaff];

  if ((needsOwnerColumn || columns.length === 0) && !ownerStaffMatch) {
    columns.unshift({
      id: 'owner',
      name: ownerName || 'Profesional principal',
      color: '#0071e3',
    });
  }

  const ownerColumnId = ownerStaffMatch ? String(ownerStaffMatch.id) : 'owner';

  dayBookings.forEach((booking) => {
    const staffId = booking.staffId ?? booking.staff_id;
    const staffName = booking.staffName ?? booking.staff_name;

    if (staffId && !columns.some((member) => String(member.id) === String(staffId))) {
      columns.push({
        id: String(staffId),
        name: staffName || 'Profesional',
        color: '#34c759',
      });
    }
  });

  const palette = ['#0071e3', '#34c759', '#ff9f0a', '#af52de', '#ff453a', '#5ac8fa'];
  const staffColumns = columns.map((member, index) => ({
    ...member,
    color: member.color || palette[index % palette.length],
  }));

  const bookingMinutes = dayBookings
    .flatMap((booking) => [
      timeToMinutes(booking.startTime ?? booking.start_time),
      timeToMinutes(booking.endTime ?? booking.end_time),
    ])
    .filter(Number.isFinite);

  const startHour = Math.max(
    6,
    Math.min(9, bookingMinutes.length ? Math.floor(Math.min(...bookingMinutes) / 60) : 9)
  );
  const endHour = Math.min(
    23,
    Math.max(19, bookingMinutes.length ? Math.ceil(Math.max(...bookingMinutes) / 60) : 19)
  );

  const minuteHeight = 1.15;
  const timelineHeight = (endHour - startHour) * 60 * minuteHeight;
  const columnWidth = 210;
  const timeGutter = 58;
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, index) => startHour + index);

  return (
    <>
      <style>{`
        @media (max-width: 720px) {
          .nico-calendar-card {
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            padding: 12px 8px 16px !important;
            border-radius: 18px !important;
            overflow: hidden !important;
          }

          .nico-calendar-title {
            font-size: 18px !important;
            line-height: 1.15 !important;
            white-space: nowrap !important;
          }

          .dashboard-panel div.nico-week-grid[style*="grid-template-columns"] {
            display: grid !important;
            grid-template-columns: repeat(7, minmax(0, 1fr)) !important;
            gap: 4px !important;
            width: 100% !important;
            overflow: hidden !important;
            margin-bottom: 12px !important;
          }

          .nico-day-chip {
            min-width: 0 !important;
            width: 100% !important;
            height: 58px !important;
            min-height: 58px !important;
            padding: 5px 1px !important;
            border-radius: 11px !important;
          }

          .nico-day-chip > div:nth-child(1) { font-size: 8.5px !important; }
          .nico-day-chip > div:nth-child(2) { font-size: 16px !important; }
          .nico-day-chip > div:nth-child(3) { font-size: 8.5px !important; }

          /* La grilla móvil conserva una columna fija de horas a la izquierda
             y las columnas de profesionales/reservas a la derecha. */
          .nico-timeline-scroll {
            width: 100% !important;
            max-width: 100% !important;
            overflow-x: auto !important;
            overflow-y: hidden !important;
            -webkit-overflow-scrolling: touch !important;
          }

          .nico-timeline-inner {
            width: 100% !important;
            min-width: 0 !important;
          }

          .dashboard-panel div.nico-staff-header[style*="grid-template-columns"],
          .dashboard-panel div.nico-timeline-grid[style*="grid-template-columns"] {
            display: grid !important;
            grid-template-columns: 44px repeat(var(--nico-staff-count), minmax(0, 1fr)) !important;
            width: 100% !important;
            min-width: 100% !important;
          }

          .nico-staff-header > div:first-child,
          .nico-timeline-grid > div:first-child {
            position: sticky !important;
            left: 0 !important;
            z-index: 4 !important;
            background: #ffffff !important;
          }

          .nico-staff-header > div:not(:first-child) {
            min-width: 0 !important;
            padding: 0 6px !important;
            font-size: 10.5px !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }

          .nico-timeline-grid > div:not(:first-child) {
            min-width: 0 !important;
          }

          .nico-timeline-grid button {
            left: 4px !important;
            right: 4px !important;
            padding: 7px 7px !important;
            border-radius: 11px !important;
          }

          .nico-timeline-grid button > div:first-child {
            font-size: 11px !important;
          }

          .nico-timeline-grid button > div:last-child {
            font-size: 9px !important;
          }

          .nico-view-switch-wrap {
            width: 100% !important;
            margin-bottom: 12px !important;
          }

          .nico-view-switch {
            width: 100% !important;
            max-width: 100% !important;
            border-radius: 16px !important;
          }

          .dashboard-panel div.nico-view-switch[style*="grid-template-columns"] {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }

        @media (max-width: 390px) {
          .nico-calendar-card {
            padding-left: 6px !important;
            padding-right: 6px !important;
          }

          .nico-day-chip {
            height: 54px !important;
            min-height: 54px !important;
            border-radius: 10px !important;
          }

          .nico-timeline-inner {
            width: 100% !important;
            min-width: 0 !important;
          }

          .dashboard-panel div.nico-staff-header[style*="grid-template-columns"],
          .dashboard-panel div.nico-timeline-grid[style*="grid-template-columns"] {
            grid-template-columns: 40px repeat(var(--nico-staff-count), minmax(0, 1fr)) !important;
          }
        }
      `}</style>

      <div
        className="nico-calendar-card"
      style={{
        background: '#ffffff',
        borderRadius: 26,
        padding: '18px 14px 20px',
        color: '#1a1a1a',
        border: '1px solid #e5e5ea',
        boxShadow: '0 14px 44px rgba(0,0,0,0.08)',
        overflow: 'hidden',
        marginBottom: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => onDateChange(addDays(selectedDateKey, -1))}
          style={{ width: 38, height: 38, borderRadius: 19, border: '1px solid #d9d9df', background: '#f7f7fb', color: '#0071e3', fontSize: 25, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          ‹
        </button>

        <div style={{ textAlign: 'center', minWidth: 0 }}>
          <div className="nico-calendar-title" style={{ fontSize: 22, fontWeight: 950, letterSpacing: '-0.035em' }}>{dayTitle}</div>
          <div style={{ fontSize: 11.5, color: '#8e8e93', fontWeight: 750, marginTop: 3 }}>
            Vista diaria por profesional
          </div>
        </div>

        <button
          type="button"
          onClick={() => onDateChange(addDays(selectedDateKey, 1))}
          style={{ width: 38, height: 38, borderRadius: 19, border: '1px solid #d9d9df', background: '#f7f7fb', color: '#0071e3', fontSize: 25, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          ›
        </button>
      </div>

      <div
        className="nico-week-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, minmax(58px, 1fr))',
          gap: 7,
          overflowX: 'auto',
          paddingBottom: 6,
          marginBottom: 12,
        }}
      >
        {weekDays.map((item) => {
          const active = item.key === selectedDateKey;

          return (
            <button
              className="nico-day-chip"
              key={item.key}
              type="button"
              onClick={() => onDateChange(item.key)}
              style={{
                minWidth: 58,
                borderRadius: 18,
                padding: '9px 5px 8px',
                border: active ? '2px solid #0071e3' : '1px solid #e1e1e6',
                background: active ? '#eef6ff' : '#f7f7fb',
                color: '#1a1a1a',
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: 10.5, fontWeight: 900, color: active ? '#0071e3' : '#8e8e93' }}>{item.weekday}</div>
              <div style={{ fontSize: 20, fontWeight: 950, marginTop: 2 }}>{item.day}</div>
              <div style={{ fontSize: 10.5, fontWeight: 900, marginTop: 1, color: item.count ? '#0071e3' : '#aeaeb2' }}>
                {item.count || '—'}
              </div>
            </button>
          );
        })}
      </div>

      <div className="nico-timeline-scroll" style={{ overflowX: 'auto', paddingBottom: 4 }}>
        <div
          className="nico-timeline-inner"
          style={{
            minWidth: timeGutter + staffColumns.length * columnWidth,
            '--nico-staff-count': Math.max(staffColumns.length, 1),
          }}
        >
          <div
            className="nico-staff-header"
            style={{
              display: 'grid',
              gridTemplateColumns: `${timeGutter}px repeat(${Math.max(staffColumns.length, 1)}, ${columnWidth}px)`,
              alignItems: 'center',
              marginBottom: 10,
            }}
          >
            <div />
            {staffColumns.map((member) => (
              <div
                key={member.id}
                style={{ padding: '0 7px', fontSize: 12.5, fontWeight: 900, color: member.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                <span style={{ width: 9, height: 9, borderRadius: 99, display: 'inline-block', background: member.color, marginRight: 7 }} />
                {member.name}
              </div>
            ))}
          </div>

          <div
            className="nico-timeline-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: `${timeGutter}px repeat(${Math.max(staffColumns.length, 1)}, ${columnWidth}px)`,
            }}
          >
            <div className="nico-time-gutter" style={{ position: 'relative', height: timelineHeight }}>
              {hours.map((hour) => (
                <div
                  key={hour}
                  style={{ position: 'absolute', top: (hour - startHour) * 60 * minuteHeight - 8, left: 0, right: 6, textAlign: 'right', fontSize: 11, fontWeight: 800, color: '#8e8e93', whiteSpace: 'nowrap' }}
                >
                  {pad(hour)}:00
                </div>
              ))}
            </div>

            {staffColumns.map((member) => {
              const memberBookings = dayBookings.filter((booking) => {
                const id = booking.staffId ?? booking.staff_id;
                if (!id) return String(member.id) === String(ownerColumnId);
                return String(id) === String(member.id);
              });

              return (
                <div
                  key={member.id}
                  style={{ position: 'relative', height: timelineHeight, borderLeft: '1px solid #e5e5ea', background: '#fbfbfd' }}
                >
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      style={{ position: 'absolute', left: 0, right: 0, top: (hour - startHour) * 60 * minuteHeight, borderTop: '1px solid #e5e5ea' }}
                    />
                  ))}

                  {memberBookings.map((booking) => {
                    const start = timeToMinutes(booking.startTime ?? booking.start_time);
                    const explicitEnd = timeToMinutes(booking.endTime ?? booking.end_time);
                    const duration = Number(booking.serviceDurationMinutes ?? booking.service_duration_minutes ?? 30) || 30;
                    const end = explicitEnd || (Number.isFinite(start) ? start + duration : null);

                    if (!Number.isFinite(start) || !Number.isFinite(end)) return null;

                    const top = Math.max(0, (start - startHour * 60) * minuteHeight);
                    const height = Math.max(42, (end - start) * minuteHeight - 5);
                    const status = String(booking.status || '').toLowerCase();
                    const cancelled = ['cancelled', 'cancelada', 'cancelado'].includes(status);
                    const completed = ['completed', 'completada', 'completado'].includes(status);
                    const clientName = booking.clientName ?? booking.client_name ?? 'Cliente sin nombre';
                    const serviceName = booking.serviceName ?? booking.service_name ?? 'Reserva';

                    return (
                      <button
                        key={booking.id}
                        type="button"
                        onClick={() => onBookingOpen(booking)}
                        style={{
                          position: 'absolute',
                          top,
                          left: 7,
                          right: 7,
                          height,
                          borderRadius: 15,
                          border: `1px solid ${member.color}88`,
                          borderLeft: `5px solid ${member.color}`,
                          background: cancelled ? '#fff2f2' : completed ? '#f2f0ff' : `${member.color}18`,
                          color: '#1a1a1a',
                          textAlign: 'left',
                          padding: '9px 10px',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          boxShadow: cancelled ? 'none' : '0 4px 14px rgba(0,0,0,0.14)',
                          opacity: cancelled ? 0.58 : 1,
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 950, lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: cancelled ? 'line-through' : 'none' }}>
                          {clientName}
                        </div>
                        <div style={{ fontSize: 11, color: '#6e6e73', marginTop: 4, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {serviceName}
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {dayBookings.length === 0 && (
        <div style={{ marginTop: 14, textAlign: 'center', color: '#8e8e93', fontSize: 12.5, fontWeight: 750 }}>
          No hay reservas para este día.
        </div>
      )}
      </div>
    </>
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
  const [pushStatus, setPushStatus] = useState('checking');
  const [pushMessage, setPushMessage] = useState('');
  const [pushLoading, setPushLoading] = useState(false);
  const [bookingNotification, setBookingNotification] = useState(null);
  const [newBookingCount, setNewBookingCount] = useState(0);
  const [manualBookingOpen, setManualBookingOpen] = useState(false);
  const [nicoAgendaMode, setNicoAgendaMode] = useState('calendar');
  const [nicoCalendarDateKey, setNicoCalendarDateKey] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });
  const [nicoStaff, setNicoStaff] = useState([]);
  const knownBookingIdsRef = useRef(new Set());
  const bookingsBootstrappedRef = useRef(false);
  const notificationTimeoutRef = useRef(null);
  const nativeReminderSignatureRef = useRef('');

  const playPanelNotificationSound = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;

      if (!AudioContext) return;

      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(660, audioContext.currentTime + 0.12);

      gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.12, audioContext.currentTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.28);

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);

      window.setTimeout(() => {
        audioContext.close().catch(() => {});
      }, 450);
    } catch {
      // Algunos navegadores bloquean sonido si el usuario no interactuó con la página.
    }
  };

  const showNewBookingNotification = useCallback((booking, totalNew = 1) => {
    const clientName = String(booking?.clientName ?? booking?.client_name ?? 'Cliente').trim() || 'Cliente';
    const serviceName = String(booking?.serviceName ?? booking?.service_name ?? 'Reserva').trim() || 'Reserva';
    const dateText = formatDate(getBookingDateValue(booking));
    const timeText = formatTime(booking?.startTime ?? booking?.start_time) || 'Sin hora';

    setBookingNotification({
      id: booking?.id || Date.now(),
      clientName,
      serviceName,
      dateText,
      timeText,
      totalNew,
    });

    setNewBookingCount((current) => current + Number(totalNew || 1));
    playPanelNotificationSound();

    if (notificationTimeoutRef.current) {
      window.clearTimeout(notificationTimeoutRef.current);
    }

    notificationTimeoutRef.current = window.setTimeout(() => {
      setBookingNotification(null);
    }, 6500);
  }, []);

  
  const handleBookingUpdated = (updatedBooking) => {
    if (!updatedBooking?.id) return;

    setBookings((current) =>
      current.map((item) => (String(item.id) === String(updatedBooking.id) ? { ...item, ...updatedBooking } : item))
    );
  };

useEffect(() => {
    return () => {
      if (notificationTimeoutRef.current) {
        window.clearTimeout(notificationTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const support = getPushBrowserSupport();

    if (!support.supported) {
      setPushStatus('unsupported');
      setPushMessage('Este navegador no permite notificaciones push web.');
      return;
    }

    if (Notification.permission === 'granted') {
      setPushStatus('enabled');
      setPushMessage('Notificaciones activadas en este dispositivo.');
    } else if (Notification.permission === 'denied') {
      setPushStatus('blocked');
      setPushMessage('Las notificaciones están bloqueadas en el navegador.');
    } else {
      setPushStatus('idle');
      setPushMessage('Activá las notificaciones para recibir reservas aunque no tengas el panel abierto.');
    }
  }, []);

  const enablePushNotifications = async () => {
    setPushLoading(true);
    setPushMessage('Preparando notificaciones...');

    try {
      const support = getPushBrowserSupport();

      if (!support.supported) {
        setPushStatus('unsupported');
        setPushMessage('Este navegador no permite notificaciones push web.');
        return;
      }

      const permission = await Notification.requestPermission();

      if (permission !== 'granted') {
        setPushStatus(permission === 'denied' ? 'blocked' : 'idle');
        setPushMessage('Tenés que permitir las notificaciones para recibir avisos de nuevas reservas.');
        return;
      }

      const token = localStorage.getItem('tuagendaya_token');

      if (!token) {
        setPushStatus('idle');
        setPushMessage('Iniciá sesión de nuevo para activar las notificaciones.');
        return;
      }

      const keyResponse = await fetch(`${API_BASE}/bookings/push/public-key`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const keyData = await keyResponse.json();
      const publicKey = keyData.publicKey;

      if (!keyResponse.ok || !publicKey) {
        throw new Error(keyData.error || 'Falta configurar VAPID_PUBLIC_KEY en Render.');
      }

      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      const existingSubscription = await registration.pushManager.getSubscription();
      const subscription = existingSubscription || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const saveResponse = await fetch(`${API_BASE}/bookings/push/subscribe`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subscription }),
      });

      const saveData = await saveResponse.json();

      if (!saveResponse.ok) {
        throw new Error(saveData.error || 'No se pudo guardar la suscripción push.');
      }

      setPushStatus('enabled');
      setPushMessage('Listo. Este dispositivo va a recibir avisos cuando entre una reserva nueva.');
    } catch (error) {
      setPushStatus('error');
      setPushMessage(error.message || 'No se pudieron activar las notificaciones.');
    } finally {
      setPushLoading(false);
    }
  };


  let storedProfessional = {};

  try {
    storedProfessional = JSON.parse(localStorage.getItem('tuagendaya_professional')) || {};
  } catch {
    storedProfessional = {};
  }

  const businessName = storedProfessional.businessName || storedProfessional.business_name || storedProfessional.name || '';
  const nicoIdentityText = normalizeSearchText(
    `${businessName} ${storedProfessional.name || ''} ${storedProfessional.slug || ''}`
  );
  const isNicoAquinoBusiness =
    nicoIdentityText.includes('nico') &&
    nicoIdentityText.includes('aquino');

  useEffect(() => {
    if (!isNicoAquinoBusiness) return undefined;

    const token = localStorage.getItem('tuagendaya_token');
    let cancelled = false;

    fetch(`${API_BASE}/staff`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => response.json())
      .then((data) => {
        if (cancelled) return;
        setNicoStaff(
          (Array.isArray(data.staff) ? data.staff : [])
            .map(normalizeStaff)
            .filter((member) => member.isActive !== false)
        );
      })
      .catch(() => {
        if (!cancelled) setNicoStaff([]);
      });

    return () => {
      cancelled = true;
    };
  }, [isNicoAquinoBusiness]);

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
        const nextIds = new Set(
          nextBookings
            .map((booking) => (booking?.id === undefined || booking?.id === null ? '' : String(booking.id)))
            .filter(Boolean)
        );

        if (!bookingsBootstrappedRef.current) {
          knownBookingIdsRef.current = nextIds;
          bookingsBootstrappedRef.current = true;
        } else {
          const newBookings = nextBookings.filter((booking) => {
            if (booking?.id === undefined || booking?.id === null) return false;
            return !knownBookingIdsRef.current.has(String(booking.id));
          });

          if (newBookings.length > 0) {
            const newestBooking = [...newBookings].sort((a, b) => {
              const dateA = new Date(a.createdAt ?? a.created_at ?? 0).getTime() || 0;
              const dateB = new Date(b.createdAt ?? b.created_at ?? 0).getTime() || 0;
              return dateB - dateA;
            })[0];

            showNewBookingNotification(newestBooking, newBookings.length);
            showNativeNewBookingNotification(newestBooking, newBookings.length).catch((error) => {
              console.error('No se pudo mostrar la notificación local de nueva reserva:', error);
            });
          }

          knownBookingIdsRef.current = nextIds;
        }

        setBookings(nextBookings);

        if (isNativeIosApp()) {
          const reminderSignature = nextBookings
            .map((booking) => [
              booking?.id ?? '',
              getBookingDateValue(booking) ?? '',
              booking?.startTime ?? booking?.start_time ?? '',
              booking?.status ?? '',
            ].join(':'))
            .sort()
            .join('|');

          if (nativeReminderSignatureRef.current !== reminderSignature) {
            nativeReminderSignatureRef.current = reminderSignature;
            syncNativeBookingReminderNotifications(nextBookings).catch((error) => {
              console.error('No se pudieron sincronizar los recordatorios de citas:', error);
            });
          }
        }
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
  }, [showNewBookingNotification]);

  useEffect(() => {
    fetchBookings(true);

    const intervalId = window.setInterval(() => {
      fetchBookings(false);
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [fetchBookings]);

  const handleAction = async (id, action) => {
    if (action === 'cancel') {
      const confirmed = window.confirm('¿Seguro querés cancelar esta reserva? El horario quedará libre nuevamente para otros clientes.');
      if (!confirmed) return;
    }

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


  const handleMarkAsPaid = async (booking) => {
    const token = localStorage.getItem('tuagendaya_token');
    const amount = Number(booking.servicePrice ?? booking.service_price ?? booking.price ?? 0) || 0;
    const method = getBookingPaymentMethod(booking);

    setActionLoading(`${booking.id}-payment`);

    try {
      await fetch(`${API_BASE}/bookings/${booking.id}/payment`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentStatus: 'paid',
          paymentMethod: method,
          amountPaid: amount,
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

  const getBookingUpdatedDateKey = (booking) => {
    const value =
      booking.updatedAt ??
      booking.updated_at ??
      booking.clientConfirmedAt ??
      booking.client_confirmed_at ??
      booking.clientCancelledAt ??
      booking.client_cancelled_at ??
      booking.createdAt ??
      booking.created_at;

    if (!value) return '';

    const raw = String(value).trim();
    const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (isoMatch) {
      return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    }

    const parsed = new Date(raw);

    if (!Number.isNaN(parsed.getTime())) {
      return getLocalDateKey(parsed);
    }

    return '';
  };

  const normalizeBookingStatus = (status) => String(status || '').trim().toLowerCase();

  const todayConfirmedActions = bookings.filter((booking) => {
    const status = normalizeBookingStatus(booking.status);
    return (status === 'confirmed' || status === 'confirmada' || status === 'confirmado') && getBookingUpdatedDateKey(booking) === todayKey;
  });

  const todayCancelledActions = bookings.filter((booking) => {
    const status = normalizeBookingStatus(booking.status);
    return (status === 'cancelled' || status === 'cancelada' || status === 'cancelado') && getBookingUpdatedDateKey(booking) === todayKey;
  });

  const pendingCount = todayBookings.filter((b) => normalizeBookingStatus(b.status) === 'pending').length;
  const confirmedCount = todayConfirmedActions.length;
  const completedCount = todayBookings.filter((b) => normalizeBookingStatus(b.status) === 'completed').length;
  const cancelledCount = todayCancelledActions.length;

  const clientStatsMap = new Map();

  bookings.forEach((booking) => {
    const clientName = String(booking.clientName ?? booking.client_name ?? '').trim();
    const clientPhone = String(booking.clientPhone ?? booking.client_phone ?? '').trim();

    if (!clientName && !clientPhone) return;

    const key = getClientIdentityKey(clientName, clientPhone);
    if (!key) return;

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

  const openBookingFromNicoCalendar = (booking) => {
    const dateKey = getBookingDateKey(booking);

    if (dateKey < todayKey) setReservationView('archived');
    else if (dateKey > todayKey) setReservationView('upcoming');
    else setReservationView('today');

    setExpandedBookingId(booking.id);
    setNicoAgendaMode('list');
  };

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
      <ManualBookingModal
        open={manualBookingOpen}
        onClose={() => setManualBookingOpen(false)}
        onCreated={() => {
          setManualBookingOpen(false);
          fetchBookings(true);
        }}
      />

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <button
          type="button"
          onClick={() => setManualBookingOpen(true)}
          style={{
            border: 'none',
            borderRadius: 14,
            padding: '11px 16px',
            background: '#0071e3',
            color: '#fff',
            fontFamily: 'inherit',
            fontSize: 13,
            fontWeight: 900,
            cursor: 'pointer',
            boxShadow: '0 8px 20px rgba(0,113,227,0.18)',
          }}
        >
          + Agendar cliente
        </button>
      </div>

      {isNicoAquinoBusiness && (
        <div className="nico-view-switch-wrap" style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <div
            className="nico-view-switch"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              width: 'min(420px, 100%)',
              padding: 4,
              borderRadius: 18,
              background: '#ffffff',
              border: '1px solid #e5e5ea',
              boxShadow: '0 6px 20px rgba(0,0,0,0.06)',
            }}
          >
            {[
              ['list', '☷  Lista'],
              ['calendar', '▣  Calendario'],
            ].map(([key, label]) => {
              const active = nicoAgendaMode === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setNicoAgendaMode(key)}
                  style={{
                    border: 'none',
                    borderRadius: 14,
                    padding: '11px 14px',
                    background: active ? '#0071e3' : 'transparent',
                    color: active ? '#ffffff' : '#6e6e73',
                    fontFamily: 'inherit',
                    fontSize: 13,
                    fontWeight: 950,
                    cursor: 'pointer',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {bookingNotification && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            top: 18,
            right: 18,
            zIndex: 9999,
            width: 'min(360px, calc(100vw - 28px))',
            background: 'rgba(255,255,255,0.98)',
            border: '0.5px solid rgba(0,113,227,0.22)',
            borderRadius: 22,
            boxShadow: '0 18px 50px rgba(15,23,42,0.18)',
            padding: 16,
            display: 'grid',
            gridTemplateColumns: '42px 1fr auto',
            gap: 12,
            alignItems: 'center',
            animation: 'slideUp 220ms cubic-bezier(0.16,1,0.3,1) both',
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 16,
              background: '#eaf3ff',
              color: '#0071e3',
              display: 'grid',
              placeItems: 'center',
              fontSize: 20,
              fontWeight: 900,
            }}
          >
            🔔
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{ color: '#111827', fontSize: 14, fontWeight: 900, letterSpacing: '-0.02em' }}>
              {bookingNotification.totalNew > 1 ? `${bookingNotification.totalNew} nuevas reservas` : 'Nueva reserva'}
            </div>
            <div style={{ color: '#4b5563', fontSize: 13, lineHeight: 1.35, marginTop: 3, fontWeight: 650 }}>
              {bookingNotification.clientName} reservó {bookingNotification.serviceName}
            </div>
            <div style={{ color: '#0071e3', fontSize: 12, marginTop: 4, fontWeight: 800 }}>
              {bookingNotification.dateText} · {bookingNotification.timeText}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setBookingNotification(null)}
            aria-label="Cerrar notificación"
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              border: 'none',
              background: '#f2f2f7',
              color: '#6e6e73',
              fontSize: 18,
              fontWeight: 800,
              lineHeight: 1,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            ×
          </button>
        </div>
      )}

      {pushStatus !== 'enabled' && (
        <div style={{ background: '#fff', borderRadius: 22, padding: '16px 18px', marginBottom: 16, border: '0.5px solid #e5e5ea', boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 220, flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 900, color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>🔔</span>
                <span>Notificaciones de nuevas reservas</span>
              </div>
              <div style={{ fontSize: 12.5, color: '#6e6e73', fontWeight: 650, marginTop: 4, lineHeight: 1.4 }}>
                {pushMessage || 'Activá las notificaciones para recibir avisos aunque no tengas TuAgendaYa abierto.'}
              </div>
            </div>

            <button
              type="button"
              onClick={enablePushNotifications}
              disabled={pushLoading || pushStatus === 'unsupported'}
              style={{
                border: 'none',
                borderRadius: 999,
                background: pushStatus === 'unsupported' ? '#c7c7cc' : '#0071e3',
                color: '#fff',
                padding: '11px 15px',
                fontSize: 13,
                fontWeight: 900,
                fontFamily: 'inherit',
                cursor: pushLoading || pushStatus === 'unsupported' ? 'default' : 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: pushStatus === 'unsupported' ? 'none' : '0 10px 24px rgba(0,113,227,0.18)',
              }}
            >
              {pushLoading ? 'Activando...' : 'Activar notificaciones'}
            </button>
          </div>
        </div>
      )}

      {isNicoAquinoBusiness && nicoAgendaMode === 'calendar' && !loadingBookings && (
        <NicoTimelineCalendar
          bookings={bookings}
          staff={nicoStaff}
          selectedDateKey={nicoCalendarDateKey}
          onDateChange={setNicoCalendarDateKey}
          onBookingOpen={openBookingFromNicoCalendar}
          ownerName={storedProfessional.name || businessName || 'Nico Aquino'}
        />
      )}

      {(!isNicoAquinoBusiness || nicoAgendaMode === 'list') && !loadingBookings && (
        <div style={{ background: '#fff', borderRadius: 22, padding: '18px 20px', marginBottom: 16, boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#1a1a1a' }}>Resumen del negocio</div>
              <div style={{ fontSize: 12, color: '#8e8e93', fontWeight: 600, marginTop: 3 }}>
                Las confirmadas y canceladas se actualizan en el momento y se reinician cada día.
              </div>
            </div>
            <div style={{ fontSize: 11, color: '#8e8e93', fontWeight: 800, whiteSpace: 'nowrap' }}>
              {newBookingCount > 0 ? `🔔 ${newBookingCount} nuevas` : 'Actualiza cada 5 s'}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
            <div style={{ background: '#f2f2f7', borderRadius: 16, padding: '14px 16px', border: '0.5px solid #e8e8ed' }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#1a1a1a' }}>{todayBookings.length}</div>
              <div style={{ fontSize: 12, color: '#8e8e93', marginTop: 2, fontWeight: 700 }}>Reservas hoy</div>
            </div>

            <div style={{ background: '#edfff3', borderRadius: 16, padding: '14px 16px' }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#30d158' }}>{confirmedCount}</div>
              <div style={{ fontSize: 12, color: '#8e8e93', marginTop: 2, fontWeight: 700 }}>Confirmadas hoy</div>
            </div>

            <div style={{ background: '#fff2f2', borderRadius: 16, padding: '14px 16px' }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#ff453a' }}>{cancelledCount}</div>
              <div style={{ fontSize: 12, color: '#8e8e93', marginTop: 2, fontWeight: 700 }}>Canceladas hoy</div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: isNicoAquinoBusiness && nicoAgendaMode === 'calendar' ? 'none' : 'flex', gap: 10, marginBottom: 16 }}>
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

      <div style={{ background: '#fff', borderRadius: 20, padding: '20px 24px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', display: isNicoAquinoBusiness && nicoAgendaMode === 'calendar' ? 'none' : 'block' }}>
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
            const bookingStatus = String(b.status || '').toLowerCase();
            const isPending = bookingStatus === 'pending' || bookingStatus === 'pendiente';
            const isConfirmed = bookingStatus === 'confirmed' || bookingStatus === 'confirmada' || bookingStatus === 'confirmado';
            const isCompleted = bookingStatus === 'completed' || bookingStatus === 'completada' || bookingStatus === 'completado';
            const isCancelled = bookingStatus === 'cancelled' || bookingStatus === 'cancelada' || bookingStatus === 'cancelado';
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
            // La cancelación debe estar disponible también cuando la reserva ya fue confirmada.
            // Solo se oculta cuando ya está completada, cancelada o en la vista Archivadas.
            const canCancel = !isArchivedView && (isPending || isConfirmed) && !isCancelled && !isCompleted;

            const clientIdentityKey = getClientIdentityKey(clientName, clientPhone);
            const clientHistory = bookings.filter((booking) => {
              const bookingIdentityKey = getClientIdentityKey(
                booking.clientName ?? booking.client_name,
                booking.clientPhone ?? booking.client_phone
              );

              return Boolean(clientIdentityKey && bookingIdentityKey === clientIdentityKey);
            });

            const clientTotalBookings = clientHistory.length;
            const clientCompletedCount = clientHistory.filter((booking) => {
              const status = String(booking.status || '').toLowerCase();
              return status === 'completed' || status === 'completada' || status === 'completado';
            }).length;
            const clientCancelledCount = clientHistory.filter((booking) => {
              const status = String(booking.status || '').toLowerCase();
              return status === 'cancelled' || status === 'cancelada' || status === 'cancelado';
            }).length;
            const clientPendingCount = clientHistory.filter((booking) => {
              const status = String(booking.status || '').toLowerCase();
              return status === 'pending' || status === 'confirmed' || status === 'pendiente' || status === 'confirmada' || status === 'confirmado';
            }).length;

            const sortedClientHistory = [...clientHistory].sort((a, z) => {
              const aDate = `${getDateKeyFromValue(getBookingDateValue(a))} ${formatTime(a.startTime ?? a.start_time) || ''}`;
              const zDate = `${getDateKeyFromValue(getBookingDateValue(z))} ${formatTime(z.startTime ?? z.start_time) || ''}`;
              return zDate.localeCompare(aDate);
            });

            const lastClientBooking = sortedClientHistory[0];
            const lastClientVisitText = lastClientBooking ? `${formatDate(getBookingDateValue(lastClientBooking))}${formatTime(lastClientBooking.startTime ?? lastClientBooking.start_time) ? ` · ${formatTime(lastClientBooking.startTime ?? lastClientBooking.start_time)}` : ''}` : 'Sin historial';

            let clientTypeLabel = 'Cliente nuevo';
            let clientTypeColor = '#0071e3';
            let clientTypeBg = '#eef6ff';

            if (clientTotalBookings >= 5) {
              clientTypeLabel = 'Cliente frecuente';
              clientTypeColor = '#188038';
              clientTypeBg = '#edfff3';
            } else if (clientCancelledCount >= 2) {
              clientTypeLabel = 'Cliente con cancelaciones';
              clientTypeColor = '#ff9500';
              clientTypeBg = '#fff7e8';
            } else if (clientTotalBookings >= 2) {
              clientTypeLabel = 'Cliente recurrente';
              clientTypeColor = '#5856d6';
              clientTypeBg = '#f1f0ff';
            }

            const copyClientPhone = async () => {
              if (!clientPhone) return;

              try {
                await navigator.clipboard?.writeText(String(clientPhone));
                alert('Teléfono copiado');
              } catch {
                alert('No se pudo copiar el teléfono.');
              }
            };

            const isExpanded = expandedBookingId === b.id;
            const mainTime = timeStr ? `${timeStr}${endStr ? ` - ${endStr}` : ''}` : 'Sin hora';
            const mainService = serviceName || 'Servicio no especificado';

            return (
              <div
                key={b.id}
                className="reservation-card"
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
                  className="reservation-card-button"
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
                    className="reservation-time-box"
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

                  <div className="reservation-main-info" style={{ minWidth: 0 }}>
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

                  <div className="reservation-status-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
                      className="reservation-detail-grid"
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
                        {/* TipQuickEditor render marker */}
                        <BookingTipQuickEditor booking={b} token={localStorage.getItem('tuagendaya_token')} onUpdated={handleBookingUpdated} />

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
                        border: '0.5px solid #e8e8ed',
                        background: 'linear-gradient(180deg, #ffffff 0%, #fbfbfd 100%)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                        <div>
                          <div style={{ fontSize: 13, color: '#1a1a1a', fontWeight: 950 }}>Ficha del cliente</div>
                          <div style={{ fontSize: 11, color: '#6e6e73', fontWeight: 700, marginTop: 3 }}>
                            Historial y acciones rápidas del cliente.
                          </div>
                        </div>

                        <span
                          style={{
                            fontSize: 11,
                            color: clientTypeColor,
                            background: clientTypeBg,
                            padding: '6px 10px',
                            borderRadius: 999,
                            fontWeight: 900,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {clientTypeLabel}
                        </span>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))',
                          gap: 10,
                          marginBottom: 12,
                        }}
                      >
                        <div style={{ background: '#f5f5f7', borderRadius: 14, padding: 11 }}>
                          <div style={{ fontSize: 10, color: '#8e8e93', fontWeight: 900, marginBottom: 4 }}>TOTAL</div>
                          <div style={{ fontSize: 15, color: '#1a1a1a', fontWeight: 950 }}>{clientTotalBookings}</div>
                        </div>

                        <div style={{ background: '#edfff3', borderRadius: 14, padding: 11 }}>
                          <div style={{ fontSize: 10, color: '#188038', fontWeight: 900, marginBottom: 4 }}>ASISTIDAS</div>
                          <div style={{ fontSize: 15, color: '#188038', fontWeight: 950 }}>{clientCompletedCount}</div>
                        </div>

                        <div style={{ background: '#fff7e8', borderRadius: 14, padding: 11 }}>
                          <div style={{ fontSize: 10, color: '#ff9500', fontWeight: 900, marginBottom: 4 }}>PENDIENTES</div>
                          <div style={{ fontSize: 15, color: '#ff9500', fontWeight: 950 }}>{clientPendingCount}</div>
                        </div>

                        <div style={{ background: '#fff0f0', borderRadius: 14, padding: 11 }}>
                          <div style={{ fontSize: 10, color: '#ff453a', fontWeight: 900, marginBottom: 4 }}>CANCELADAS</div>
                          <div style={{ fontSize: 15, color: '#ff453a', fontWeight: 950 }}>{clientCancelledCount}</div>
                        </div>
                      </div>

                      <div style={{ background: '#f7f7fb', borderRadius: 14, padding: 11, marginBottom: 12 }}>
                        <div style={{ fontSize: 10.5, color: '#8e8e93', fontWeight: 900, marginBottom: 4 }}>ÚLTIMA RESERVA</div>
                        <div style={{ fontSize: 13, color: '#1a1a1a', fontWeight: 850 }}>{lastClientVisitText}</div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                        <button
                          type="button"
                          onClick={copyClientPhone}
                          disabled={!clientPhone}
                          style={{
                            border: '0.5px solid #dcdce3',
                            borderRadius: 13,
                            padding: '10px 8px',
                            background: '#fff',
                            color: '#0071e3',
                            fontSize: 12.5,
                            fontWeight: 900,
                            fontFamily: 'inherit',
                            cursor: clientPhone ? 'pointer' : 'not-allowed',
                          }}
                        >
                          Copiar teléfono
                        </button>

                        <button
                          type="button"
                          onClick={() => setReservationView('archived')}
                          style={{
                            border: '0.5px solid #dcdce3',
                            borderRadius: 13,
                            padding: '10px 8px',
                            background: '#fff',
                            color: '#5856d6',
                            fontSize: 12.5,
                            fontWeight: 900,
                            fontFamily: 'inherit',
                            cursor: 'pointer',
                          }}
                        >
                          Ver historial
                        </button>
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
                          onClick={() => handleMarkAsPaid(b)}
                          disabled={actionLoading === `${b.id}-payment`}
                          style={{
                            border: 'none',
                            borderRadius: 13,
                            padding: '11px 13px',
                            background: '#30d158',
                            color: '#fff',
                            fontSize: 13,
                            fontWeight: 900,
                            fontFamily: 'inherit',
                            cursor: 'pointer',
                            opacity: actionLoading === `${b.id}-payment` ? 0.65 : 1,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Cobrado
                        </button>

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
                        className="reservation-action-grid"
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
                            {actionLoading === `${b.id}-cancel` ? '...' : 'Cancelar reserva'}
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
  const [cashCount, setCashCount] = useState('');
  const [transferCount, setTransferCount] = useState('');
  const [cardCount, setCardCount] = useState('');
  const [otherCount, setOtherCount] = useState('');
  const [configuredPaymentMethods, setConfiguredPaymentMethods] = useState(getConfiguredPaymentMethodsForCash());

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
    setConfiguredPaymentMethods(getConfiguredPaymentMethodsForCash());

    const handlePaymentMethodsUpdated = (event) => {
      const methods = event?.detail?.methods || getConfiguredPaymentMethodsForCash();
      setConfiguredPaymentMethods(normalizeAcceptedPaymentMethodsList(methods));
    };

    window.addEventListener(PAYMENT_METHODS_UPDATED_EVENT, handlePaymentMethodsUpdated);
    window.addEventListener('storage', handlePaymentMethodsUpdated);

    const intervalId = window.setInterval(() => {
      fetchBookings(false);
      fetchClosures(false);
      setConfiguredPaymentMethods(getConfiguredPaymentMethodsForCash());
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener(PAYMENT_METHODS_UPDATED_EVENT, handlePaymentMethodsUpdated);
      window.removeEventListener('storage', handlePaymentMethodsUpdated);
    };
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

  const getTipAmount = (booking) => {
    const value = Number(booking.tipAmount ?? booking.tip_amount ?? 0);
    return Number.isNaN(value) ? 0 : value;
  };

  const getTipMethod = (booking) => (
    String(booking.tipMethod ?? booking.tip_method ?? getBookingPaymentMethod(booking)).trim() || getBookingPaymentMethod(booking)
  );

  const totalGenerated = activeBookings.reduce((sum, booking) => sum + getServicePrice(booking), 0);
  const totalCollected = activeBookings.reduce((sum, booking) => sum + getPaidAmount(booking), 0);
  const totalTips = activeBookings.reduce((sum, booking) => sum + getTipAmount(booking), 0);
  const totalCollectedWithTips = totalCollected + totalTips;
  const totalPending = activeBookings.reduce((sum, booking) => sum + Math.max(getServicePrice(booking) - getPaidAmount(booking), 0), 0);

  const activePaymentMethodValues = normalizeAcceptedPaymentMethodsList(configuredPaymentMethods);
  const visiblePaymentMethodOptions = PAYMENT_METHOD_OPTIONS.filter((method) => activePaymentMethodValues.includes(method.value));

  const byMethod = visiblePaymentMethodOptions.map((method) => {
    const total = activeBookings
      .filter((booking) => getBookingPaymentMethod(booking) === method.value)
      .reduce((sum, booking) => sum + getPaidAmount(booking), 0);

    return { ...method, total };
  });

  const tipsByMethod = visiblePaymentMethodOptions.map((method) => {
    const total = activeBookings
      .filter((booking) => getTipMethod(booking) === method.value)
      .reduce((sum, booking) => sum + getTipAmount(booking), 0);

    return { ...method, total };
  });

  const shouldShowTipMethod = (method) => activePaymentMethodValues.includes(method.value);

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

  const averageTicket = activeBookings.length > 0 ? totalCollected / activeBookings.length : 0;
  const collectionRate = totalGenerated > 0 ? Math.round((totalCollected / totalGenerated) * 100) : 0;
  const paidBookingsCount = activeBookings.filter((booking) => getBookingPaymentStatus(booking) === 'paid').length;
  const unpaidBookingsCount = activeBookings.filter((booking) => getBookingPaymentStatus(booking) === 'pending').length;
  const completedWithoutPaymentCount = completedBookings.filter((booking) => getBookingPaymentStatus(booking) !== 'paid').length;
  const mainPaymentMethod = byMethod.slice().sort((a, b) => b.total - a.total)[0];

  const expectedByMethod = {
    cash: byMethod.find((method) => method.value === 'cash')?.total || 0,
    transfer: byMethod.find((method) => method.value === 'transfer')?.total || 0,
    card: byMethod.find((method) => method.value === 'card')?.total || 0,
    other: byMethod.find((method) => method.value === 'other')?.total || 0,
  };

  const toNumber = (value) => {
    const number = Number(value);
    return Number.isNaN(number) ? 0 : number;
  };

  const countedByMethod = {
    cash: toNumber(cashCount),
    transfer: toNumber(transferCount),
    card: toNumber(cardCount),
    other: toNumber(otherCount),
  };

  const countedTotal = countedByMethod.cash + countedByMethod.transfer + countedByMethod.card + countedByMethod.other;
  const cashDifference = countedTotal - totalCollected;
  const needsCashReview = Math.abs(cashDifference) > 0.009;

  const attentionItems = [
    totalPending > 0 ? `Tenés ${formatMoney(totalPending)} por cobrar.` : null,
    completedWithoutPaymentCount > 0 ? `${completedWithoutPaymentCount} reserva${completedWithoutPaymentCount === 1 ? '' : 's'} completada${completedWithoutPaymentCount === 1 ? '' : 's'} sin marcar como pagada${completedWithoutPaymentCount === 1 ? '' : 's'}.` : null,
    unpaidBookingsCount > 0 ? `${unpaidBookingsCount} reserva${unpaidBookingsCount === 1 ? '' : 's'} con pago por cobrar.` : null,
    existingClosure ? 'Esta fecha ya tiene cierre guardado.' : null,
  ].filter(Boolean);

  const bookingsNeedingAttention = activeBookings
    .filter((booking) => getBookingPaymentStatus(booking) !== 'paid' || Math.max(getServicePrice(booking) - getPaidAmount(booking), 0) > 0)
    .slice(0, 6);

  const cancelledTotal = dayBookings
    .filter((booking) => booking.status === 'cancelled')
    .reduce((sum, booking) => sum + getServicePrice(booking), 0);

  const dailyCloseChecklist = [
    {
      label: 'Reservas completadas',
      done: completedBookings.length > 0 && completedWithoutPaymentCount === 0,
      detail: completedWithoutPaymentCount > 0 ? `${completedWithoutPaymentCount} sin marcar como pagada` : `${completedBookings.length} completada${completedBookings.length === 1 ? '' : 's'}`,
    },
    {
      label: 'Pagos registrados',
      done: totalPending <= 0 && unpaidBookingsCount === 0,
      detail: totalPending > 0 ? `${formatMoney(totalPending)} por cobrar` : 'Sin pendientes',
    },
    {
      label: 'Arqueo cargado',
      done: countedTotal > 0,
      detail: countedTotal > 0 ? `Contado ${formatMoney(countedTotal)}` : 'Ingresá efectivo, transferencia y POS',
    },
    {
      label: 'Caja cuadrada',
      done: countedTotal > 0 && !needsCashReview,
      detail: countedTotal === 0 ? 'Falta arqueo' : needsCashReview ? `Diferencia ${formatMoney(cashDifference)}` : 'Sin diferencias',
    },
  ];

  const closeReadyCount = dailyCloseChecklist.filter((item) => item.done).length;
  const closeReadyPercent = Math.round((closeReadyCount / dailyCloseChecklist.length) * 100);

  const dailyMethodRows = visiblePaymentMethodOptions.map((method) => ({
    key: method.value,
    label: method.label,
    expected: expectedByMethod[method.value] || 0,
    counted: countedByMethod[method.value] || 0,
  }));

  const dailyFocusCardStyle = {
    background: '#fff',
    borderRadius: 24,
    padding: '18px 18px',
    boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
    border: '0.5px solid #ececf2',
  };

  const dailyMiniMetricStyle = (background = '#f7f7fb') => ({
    background,
    borderRadius: 18,
    padding: 13,
    border: '0.5px solid rgba(0,0,0,0.035)',
  });


  const exportClosureRowsToCsv = (items, filename) => {
    const headers = [
      'Fecha',
      'Citas',
      'Completadas',
      'Canceladas',
      'Total generado',
      'Total cobrado',
      'Por cobrar',
      'Efectivo',
      'Transferencia',
      'Pago online',
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
        <div style={{ background: '#fafafa', borderRadius: 14, padding: 10 }}><div style={{ fontSize: 10, color: '#8e8e93', fontWeight: 900 }}>Pago online</div><div style={{ fontSize: 13, fontWeight: 950 }}>{formatMoney(summary.card)}</div></div>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={dailyFocusCardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 950, color: '#1a1a1a', letterSpacing: '-0.01em' }}>Caja del día</div>
            <div style={{ fontSize: 12.5, color: '#6e6e73', fontWeight: 750, marginTop: 4, lineHeight: 1.4 }}>
              Todo lo necesario para cerrar la jornada desde el teléfono.
            </div>
          </div>

          <div style={{ minWidth: 185, flex: '0 0 auto' }}>
            <DatePickerField value={selectedDate} onChange={(nextDate) => setSelectedDate(nextDate || getLocalDateKeyValue())} placeholder="Elegir día" />
          </div>
        </div>

        <div className="cash-mobile-main-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 9, marginBottom: 10 }}>
          <div style={dailyMiniMetricStyle('#ecfff3')}>
            <div style={{ fontSize: 10.5, color: '#188038', fontWeight: 950, marginBottom: 4 }}>SERVICIOS</div>
            <div style={{ fontSize: 20, color: '#188038', fontWeight: 950 }}>{formatMoney(totalCollected)}</div>
          </div>
          <div style={dailyMiniMetricStyle('#eef6ff')}>
            <div style={{ fontSize: 10.5, color: '#0071e3', fontWeight: 950, marginBottom: 4 }}>PROPINAS</div>
            <div style={{ fontSize: 20, color: '#0071e3', fontWeight: 950 }}>{formatMoney(totalTips)}</div>
          </div>
          <div style={dailyMiniMetricStyle('#edfff3')}>
            <div style={{ fontSize: 10.5, color: '#188038', fontWeight: 950, marginBottom: 4 }}>TOTAL INGRESADO</div>
            <div style={{ fontSize: 20, color: '#188038', fontWeight: 950 }}>{formatMoney(totalCollectedWithTips)}</div>
          </div>
          <div style={dailyMiniMetricStyle('#fff8eb')}>
            <div style={{ fontSize: 10.5, color: '#ff9f0a', fontWeight: 950, marginBottom: 4 }}>POR COBRAR</div>
            <div style={{ fontSize: 20, color: '#ff9f0a', fontWeight: 950 }}>{formatMoney(totalPending)}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8, marginBottom: 12 }}>
          <div style={dailyMiniMetricStyle('#f7f7fb')}>
            <div style={{ fontSize: 10, color: '#8e8e93', fontWeight: 950 }}>CITAS</div>
            <div style={{ fontSize: 16, color: '#1a1a1a', fontWeight: 950, marginTop: 4 }}>{dayBookings.length}</div>
          </div>
          <div style={dailyMiniMetricStyle('#f1f0ff')}>
            <div style={{ fontSize: 10, color: '#5e5ce6', fontWeight: 950 }}>COMPLET.</div>
            <div style={{ fontSize: 16, color: '#5e5ce6', fontWeight: 950, marginTop: 4 }}>{completedBookings.length}</div>
          </div>
          <div style={dailyMiniMetricStyle('#fff8eb')}>
            <div style={{ fontSize: 10, color: '#ff9500', fontWeight: 950 }}>PEND.</div>
            <div style={{ fontSize: 16, color: '#ff9500', fontWeight: 950, marginTop: 4 }}>{pendingBookings.length}</div>
          </div>
          <div style={dailyMiniMetricStyle('#fff1f0')}>
            <div style={{ fontSize: 10, color: '#ff453a', fontWeight: 950 }}>CANC.</div>
            <div style={{ fontSize: 16, color: '#ff453a', fontWeight: 950, marginTop: 4 }}>{cancelledBookings.length}</div>
          </div>
        </div>

        <div style={{ background: '#f7f7fb', borderRadius: 20, padding: 13, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 9 }}>
            <div style={{ fontSize: 13, fontWeight: 950, color: '#1a1a1a' }}>Arqueo rápido</div>
            <div style={{ fontSize: 11.5, fontWeight: 950, color: closeReadyPercent === 100 ? '#188038' : '#0071e3' }}>
              {closeReadyCount}/{dailyCloseChecklist.length} listo
            </div>
          </div>

          <div style={{ height: 7, borderRadius: 999, background: '#e5e5ea', overflow: 'hidden', marginBottom: 12 }}>
            <div style={{ width: `${closeReadyPercent}%`, height: '100%', background: closeReadyPercent === 100 ? '#30d158' : '#0071e3', borderRadius: 999 }} />
          </div>

          <div style={{ display: 'grid', gap: 7 }}>
            {dailyCloseChecklist.map((item) => (
              <div key={item.label} style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr)', gap: 9, alignItems: 'start' }}>
                <div style={{ width: 20, height: 20, borderRadius: 999, background: item.done ? '#30d158' : '#e5e5ea', color: item.done ? '#fff' : '#8e8e93', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 950 }}>
                  {item.done ? '✓' : '•'}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: '#1a1a1a', fontWeight: 900 }}>{item.label}</div>
                  <div style={{ fontSize: 11.5, color: '#6e6e73', fontWeight: 750, marginTop: 1 }}>{item.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 9, marginBottom: 12 }}>
          {visiblePaymentMethodOptions.map((method) => {
            const item = {
              key: method.value,
              label: method.label,
              value: method.value === 'cash' ? cashCount : method.value === 'transfer' ? transferCount : method.value === 'card' ? cardCount : otherCount,
              setter: method.value === 'cash' ? setCashCount : method.value === 'transfer' ? setTransferCount : method.value === 'card' ? setCardCount : setOtherCount,
            };

            return (
            <div key={item.key} style={{ background: '#fbfbfd', border: '0.5px solid #ececf2', borderRadius: 17, padding: 11 }}>
              <div style={{ fontSize: 11, color: '#8e8e93', fontWeight: 950, marginBottom: 4 }}>{item.label}</div>
              <input
                type="number"
                min="0"
                step="1"
                value={item.value}
                onChange={(event) => item.setter(event.target.value)}
                placeholder="Contado"
                style={{ ...inputStyle, borderRadius: 13, padding: '10px 10px', fontSize: 14, marginBottom: 0 }}
              />
            </div>
            );
          })}
        </div>

        <div style={{ display: 'grid', gap: 7, marginBottom: 12 }}>
          {dailyMethodRows.map((method) => {
            const difference = method.counted - method.expected;
            return (
              <div key={method.key} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 8, alignItems: 'center', background: '#fff', border: '0.5px solid #ececf2', borderRadius: 15, padding: '10px 11px' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: '#1a1a1a', fontWeight: 950 }}>{method.label}</div>
                  <div style={{ fontSize: 11.5, color: '#8e8e93', fontWeight: 750, marginTop: 2 }}>
                    Registrado {formatMoney(method.expected)} · Contado {formatMoney(method.counted)}
                  </div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 950, color: Math.abs(difference) > 0.009 ? '#ff9500' : '#188038', whiteSpace: 'nowrap' }}>
                  {formatMoney(difference)}
                </div>
              </div>
            );
          })}
        </div>


        <div style={{ marginTop: 4, marginBottom: 12 }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 16, color: '#1a1a1a', fontWeight: 950 }}>Propinas por método</h3>
          <div style={{ display: 'grid', gap: 8 }}>
            {tipsByMethod.filter(shouldShowTipMethod).map((method) => (
              <div
                key={`tip-${method.value}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#eef6ff',
                  border: '0.5px solid #d9ebff',
                  borderRadius: 14,
                  padding: '10px 12px',
                }}
              >
                <div>
                  <strong style={{ display: 'block', fontSize: 13, color: '#1a1a1a' }}>{method.label}</strong>
                  <span style={{ fontSize: 11, color: '#8e8e93', fontWeight: 750 }}>Propinas registradas</span>
                </div>
                <strong style={{ color: '#0071e3', fontSize: 15 }}>{formatMoney(method.total)}</strong>
              </div>
            ))}
          </div>
        </div>

        {attentionItems.length > 0 && (
          <div style={{ background: '#fff8eb', border: '0.5px solid #ffe2b8', borderRadius: 18, padding: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 12.5, color: '#b26a00', fontWeight: 950, marginBottom: 6 }}>Antes de cerrar</div>
            <div style={{ display: 'grid', gap: 5 }}>
              {attentionItems.map((item) => (
                <div key={item} style={{ fontSize: 12, color: '#6e4b00', fontWeight: 800, lineHeight: 1.35 }}>• {item}</div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center' }}>
          <button
            type="button"
            onClick={closeCashDay}
            disabled={closeLoading || dayBookings.length === 0}
            style={{
              border: 'none',
              borderRadius: 16,
              padding: '13px 14px',
              background: closeLoading || dayBookings.length === 0 ? '#f2f2f7' : '#0071e3',
              color: closeLoading || dayBookings.length === 0 ? '#8e8e93' : '#fff',
              fontSize: 13.5,
              fontWeight: 950,
              fontFamily: 'inherit',
              cursor: closeLoading || dayBookings.length === 0 ? 'not-allowed' : 'pointer',
              boxShadow: closeLoading || dayBookings.length === 0 ? 'none' : '0 10px 22px rgba(0,113,227,0.22)',
            }}
          >
            {closeLoading ? 'Guardando...' : existingClosure ? 'Actualizar cierre' : 'Cerrar caja'}
          </button>

          <button
            type="button"
            onClick={exportCashCsv}
            disabled={dayBookings.length === 0}
            style={{
              border: '0.5px solid #d8d8df',
              borderRadius: 16,
              padding: '13px 12px',
              background: '#fff',
              color: dayBookings.length === 0 ? '#aeaeb2' : '#1a1a1a',
              fontSize: 12.5,
              fontWeight: 950,
              fontFamily: 'inherit',
              cursor: dayBookings.length === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            CSV
          </button>
        </div>

        {closeMessage && (
          <div style={{ marginTop: 10, color: closeMessage.toLowerCase().includes('error') || closeMessage.toLowerCase().includes('no se pudo') ? '#ff453a' : '#188038', fontSize: 12.5, fontWeight: 900 }}>
            {closeMessage}
          </div>
        )}
      </div>

      <div style={{ background: '#fff', borderRadius: 22, padding: '22px 24px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 19, fontWeight: 900, color: '#1a1a1a' }}>Detalle contable del día</div>
            <div style={{ fontSize: 13, color: '#6e6e73', marginTop: 4, lineHeight: 1.45 }}>
              Resumen ampliado del día seleccionado.
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
            <div style={smallStatStyle}>Por cobrar/confirmadas</div>
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
            <div style={{ fontSize: 13, color: '#8e8e93', fontWeight: 900 }}>Por cobrar</div>
            <div style={{ fontSize: 26, fontWeight: 950, color: '#ff9f0a', marginTop: 6 }}>{formatMoney(totalPending)}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
        {renderPeriodSummary(
          'Caja semanal',
          `${formatDate(startOfWeek)} al ${formatDate(endOfWeek)}`,
          weeklySummary
        )}
        {renderPeriodSummary(
          'Caja mensual',
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
      <div style={{ background: '#fff', borderRadius: 22, padding: '20px 24px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', border: '0.5px solid #ececf2' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 900, color: '#1a1a1a' }}>Control contable</div>
            <div style={{ fontSize: 12, color: '#8e8e93', fontWeight: 700, marginTop: 3, lineHeight: 1.45 }}>
              Indicadores rápidos para revisar caja antes del cierre.
            </div>
          </div>

          <div style={{ padding: '7px 11px', borderRadius: 999, background: collectionRate >= 90 ? '#edfff3' : '#fff7e8', color: collectionRate >= 90 ? '#188038' : '#ff9500', fontSize: 12, fontWeight: 950 }}>
            {collectionRate}% cobrado
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 12 }}>
          <div style={{ background: '#f7f7fb', borderRadius: 16, padding: 13 }}>
            <div style={{ fontSize: 10.5, color: '#8e8e93', fontWeight: 950, marginBottom: 4 }}>TICKET PROMEDIO</div>
            <div style={{ fontSize: 20, color: '#1a1a1a', fontWeight: 950 }}>{formatMoney(averageTicket)}</div>
          </div>

          <div style={{ background: '#edfff3', borderRadius: 16, padding: 13 }}>
            <div style={{ fontSize: 10.5, color: '#188038', fontWeight: 950, marginBottom: 4 }}>PAGADAS</div>
            <div style={{ fontSize: 20, color: '#188038', fontWeight: 950 }}>{paidBookingsCount}</div>
          </div>

          <div style={{ background: '#fff7e8', borderRadius: 16, padding: 13 }}>
            <div style={{ fontSize: 10.5, color: '#ff9500', fontWeight: 950, marginBottom: 4 }}>PENDIENTES</div>
            <div style={{ fontSize: 20, color: '#ff9500', fontWeight: 950 }}>{unpaidBookingsCount}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 }}>
          <div style={{ background: '#f7f9ff', border: '0.5px solid #dceaff', borderRadius: 18, padding: 14 }}>
            <div style={{ fontSize: 13, color: '#1a1a1a', fontWeight: 950, marginBottom: 8 }}>Alertas de caja</div>
            {attentionItems.length === 0 ? (
              <div style={{ color: '#188038', fontSize: 12.5, fontWeight: 850 }}>Caja sin alertas importantes para esta fecha.</div>
            ) : (
              <div style={{ display: 'grid', gap: 7 }}>
                {attentionItems.map((item) => (
                  <div key={item} style={{ color: '#6e6e73', fontSize: 12.5, fontWeight: 800, lineHeight: 1.35 }}>• {item}</div>
                ))}
              </div>
            )}
          </div>

          <div style={{ background: '#fbfbfd', border: '0.5px solid #ececf2', borderRadius: 18, padding: 14 }}>
            <div style={{ fontSize: 13, color: '#1a1a1a', fontWeight: 950, marginBottom: 8 }}>Método principal</div>
            <div style={{ fontSize: 20, color: '#0071e3', fontWeight: 950 }}>{mainPaymentMethod?.label || 'Sin cobros'}</div>
            <div style={{ fontSize: 12, color: '#6e6e73', fontWeight: 800, marginTop: 5 }}>
              {formatMoney(mainPaymentMethod?.total || 0)} registrado en este método.
            </div>
          </div>
        </div>

        {bookingsNeedingAttention.length > 0 && (
          <div style={{ marginTop: 12, background: '#fff', border: '0.5px solid #ececf2', borderRadius: 18, overflow: 'hidden' }}>
            <div style={{ padding: '12px 14px', borderBottom: '0.5px solid #eeeeef', fontSize: 13, color: '#1a1a1a', fontWeight: 950 }}>
              Reservas que necesitan revisión
            </div>
            {bookingsNeedingAttention.map((booking) => {
              const price = getServicePrice(booking);
              const paid = getPaidAmount(booking);
              const pending = Math.max(price - paid, 0);
              const clientName = booking.clientName ?? booking.client_name ?? 'Cliente';
              const serviceName = booking.serviceName ?? booking.service_name ?? 'Servicio';
              const time = formatTime(booking.startTime ?? booking.start_time);

              return (
                <div key={booking.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 10, alignItems: 'center', padding: '11px 14px', borderTop: '0.5px solid #f2f2f7' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: '#1a1a1a', fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {time ? `${time} · ` : ''}{clientName}
                    </div>
                    <div style={{ fontSize: 12, color: '#6e6e73', fontWeight: 750, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {serviceName} · Cobrado {formatMoney(paid)} · Pendiente {formatMoney(pending)}
                    </div>
                  </div>
                  <div style={{ color: pending > 0 ? '#ff9500' : '#0071e3', fontSize: 12, fontWeight: 950, whiteSpace: 'nowrap' }}>
                    {paymentStatusLabel[getBookingPaymentStatus(booking)] || getBookingPaymentStatus(booking)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ background: '#fff', borderRadius: 22, padding: '20px 24px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', border: '0.5px solid #ececf2' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 900, color: '#1a1a1a' }}>Arqueo detallado</div>
            <div style={{ fontSize: 12, color: '#8e8e93', fontWeight: 750, marginTop: 4, lineHeight: 1.45 }}>
              Ingresá lo contado por método y comparalo con lo registrado en las reservas.
            </div>
          </div>

          <div style={{
            padding: '7px 11px',
            borderRadius: 999,
            background: needsCashReview ? '#fff7e8' : '#edfff3',
            color: needsCashReview ? '#ff9500' : '#188038',
            fontSize: 12,
            fontWeight: 950,
            whiteSpace: 'nowrap',
          }}>
            {needsCashReview ? `Diferencia ${formatMoney(cashDifference)}` : 'Caja cuadrada'}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
          {[
            { key: 'cash', label: 'Efectivo', value: cashCount, setter: setCashCount },
            { key: 'transfer', label: 'Transferencia', value: transferCount, setter: setTransferCount },
            { key: 'online', label: 'Pago online', value: cardCount, setter: setCardCount },
            { key: 'other', label: 'Otro', value: otherCount, setter: setOtherCount },
          ].map((item) => (
            <div key={item.key} style={{ background: '#fbfbfd', border: '0.5px solid #ececf2', borderRadius: 16, padding: 12 }}>
              <div style={{ fontSize: 11, color: '#8e8e93', fontWeight: 950, marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: 12, color: '#6e6e73', fontWeight: 800, marginBottom: 8 }}>
                Registrado: {formatMoney(expectedByMethod[item.key] || 0)}
              </div>
              <input
                type="number"
                min="0"
                step="1"
                value={item.value}
                onChange={(event) => item.setter(event.target.value)}
                placeholder="Contado"
                style={{ ...inputStyle, borderRadius: 13, padding: '10px 11px', fontSize: 13, marginBottom: 0 }}
              />
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, marginTop: 12 }}>
          <div style={{ background: '#f7f7fb', borderRadius: 16, padding: 13 }}>
            <div style={{ fontSize: 10.5, color: '#8e8e93', fontWeight: 950 }}>Registrado</div>
            <div style={{ fontSize: 20, color: '#1a1a1a', fontWeight: 950, marginTop: 4 }}>{formatMoney(totalCollected)}</div>
          </div>
          <div style={{ background: '#f7f7fb', borderRadius: 16, padding: 13 }}>
            <div style={{ fontSize: 10.5, color: '#8e8e93', fontWeight: 950 }}>Contado</div>
            <div style={{ fontSize: 20, color: '#0071e3', fontWeight: 950, marginTop: 4 }}>{formatMoney(countedTotal)}</div>
          </div>
          <div style={{ background: needsCashReview ? '#fff7e8' : '#edfff3', borderRadius: 16, padding: 13 }}>
            <div style={{ fontSize: 10.5, color: needsCashReview ? '#ff9500' : '#188038', fontWeight: 950 }}>Diferencia</div>
            <div style={{ fontSize: 20, color: needsCashReview ? '#ff9500' : '#188038', fontWeight: 950, marginTop: 4 }}>{formatMoney(cashDifference)}</div>
          </div>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 22, padding: '20px 24px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 900, color: '#1a1a1a' }}>Cierre avanzado</div>
            <div style={{ fontSize: 12, color: '#8e8e93', fontWeight: 700, marginTop: 4, lineHeight: 1.45 }}>
              Guardá un resumen fijo del día para consultar después en el historial.
            </div>

            <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
              <div style={{ background: '#f7f7fb', borderRadius: 14, padding: 10 }}>
                <div style={{ fontSize: 10, color: '#8e8e93', fontWeight: 950 }}>Esperado</div>
                <div style={{ fontSize: 14, color: '#1a1a1a', fontWeight: 950 }}>{formatMoney(totalCollected)}</div>
              </div>
              <div style={{ background: totalPending > 0 ? '#fff7e8' : '#edfff3', borderRadius: 14, padding: 10 }}>
                <div style={{ fontSize: 10, color: totalPending > 0 ? '#ff9500' : '#188038', fontWeight: 950 }}>Pendiente</div>
                <div style={{ fontSize: 14, color: totalPending > 0 ? '#ff9500' : '#188038', fontWeight: 950 }}>{formatMoney(totalPending)}</div>
              </div>
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
        <div style={{ fontSize: 17, fontWeight: 900, color: '#1a1a1a', marginBottom: 4 }}>Detalle del día</div>
        <div style={{ fontSize: 12, color: '#8e8e93', fontWeight: 700, marginBottom: 14 }}>Reservas de la fecha elegida con cliente, servicio, estado, método y montos.</div>

        {loading ? (
          <div style={{ textAlign: 'center', color: '#aeaeb2', padding: 28 }}>Cargando caja...</div>
        ) : dayBookings.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#aeaeb2', padding: 28, fontWeight: 700 }}>No hay reservas para la fecha elegida.</div>
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
                    <div className="client-main-info" style={{ minWidth: 0 }}>
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

    </div>
  );
}


function RepeatBookingModal({ open, booking, onClose, onCreated }) {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [repeatCount, setRepeatCount] = useState('4');
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [bookingStartIntervalMinutes, setBookingStartIntervalMinutes] = useState(30);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [resultMessage, setResultMessage] = useState('');

  useEffect(() => {
    if (!open) return;

    setSelectedDate('');
    setSelectedTime(
      formatTime(booking?.startTime ?? booking?.start_time) || ''
    );
    setRepeatCount('4');
    setTimePickerOpen(false);
    setError('');
    setResultMessage('');

    const token = localStorage.getItem('tuagendaya_token');

    fetch(`${API_BASE}/professionals/me/booking-start-interval`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.error || 'No se pudo cargar el intervalo de horarios');
        }

        setBookingStartIntervalMinutes(
          Number(data.bookingStartIntervalMinutes) === 60 ? 60 : 30
        );
      })
      .catch(() => {
        setBookingStartIntervalMinutes(30);
      });
  }, [open, booking?.id]);

  if (!open || !booking) return null;

  const sourceDate = getDateKeyFromValue(getBookingDateValue(booking));
  const sourceTime = formatTime(booking.startTime ?? booking.start_time) || '';
  const sourceEndTime = formatTime(booking.endTime ?? booking.end_time) || '';
  const serviceName = booking.serviceName ?? booking.service_name ?? 'Servicio';
  const staffName = booking.staffName ?? booking.staff_name ?? '';

  const timeOptions = Array.from(
    { length: Math.floor((24 * 60 - 6 * 60) / bookingStartIntervalMinutes) },
    (_, index) => {
      const totalMinutes = 6 * 60 + index * bookingStartIntervalMinutes;
      const hour = Math.floor(totalMinutes / 60);
      const minute = totalMinutes % 60;

      return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    }
  );

  const payload = {
    sourceBookingId: booking.id,
    firstRepeatDate: selectedDate,
    startTime: selectedTime,
    intervalValue: 1,
    intervalUnit: 'weeks',
    repeatCount: Number(repeatCount),
    untilDate: null,
  };

  const validate = () => {
    if (!selectedDate) {
      return 'Elegí un día en el calendario.';
    }

    if (!selectedTime) {
      return 'Seleccioná un horario.';
    }

    if (
      !Number.isInteger(Number(repeatCount)) ||
      Number(repeatCount) < 1 ||
      Number(repeatCount) > 100
    ) {
      return 'La cantidad debe estar entre 1 y 100 citas.';
    }

    return '';
  };

  const createRepeatedBookings = async () => {
    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    const token = localStorage.getItem('tuagendaya_token');
    setCreating(true);
    setError('');
    setResultMessage('');

    try {
      const response = await fetch(`${API_BASE}/bookings/repeat`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'No se pudieron repetir las citas.');
      }

      const createdCount = Number(data.createdCount || 0);
      const conflictCount = Number(data.conflictCount || 0);

      setResultMessage(
        `${createdCount} ${createdCount === 1 ? 'cita creada' : 'citas creadas'}${
          conflictCount > 0
            ? ` · ${conflictCount} ${conflictCount === 1 ? 'horario ocupado no se creó' : 'horarios ocupados no se crearon'}`
            : ''
        }`
      );

      if (onCreated) {
        await onCreated(data);
      }
    } catch (requestError) {
      setError(requestError.message || 'No se pudieron repetir las citas.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Repetir cita"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 16000,
        background: 'rgba(15,23,42,.45)',
        backdropFilter: 'blur(8px)',
        display: 'grid',
        placeItems: 'center',
        padding: 18,
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !creating) onClose();
      }}
    >
      <div
        className="repeat-booking-modal"
        style={{
          width: 'min(430px, calc(100vw - 16px))',
          maxHeight: '92vh',
          overflowY: 'auto',
          background: '#fff',
          borderRadius: 20,
          padding: 15,
          boxShadow: '0 28px 70px rgba(15,23,42,.24)',
          border: '1px solid rgba(15,23,42,.08)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 14,
          }}
        >
          <div>
            <div style={{ fontSize: 20, fontWeight: 950, color: '#111827' }}>
              Repetir cita
            </div>
            <div
              style={{
                marginTop: 5,
                fontSize: 12.5,
                color: '#6e6e73',
                fontWeight: 750,
              }}
            >
              {serviceName}
              {staffName ? ` · ${staffName}` : ''}
            </div>
            <div
              style={{
                marginTop: 3,
                fontSize: 11.5,
                color: '#8e8e93',
                fontWeight: 700,
              }}
            >
              Original: {formatDate(sourceDate)} · {sourceTime}
              {sourceEndTime ? ` - ${sourceEndTime}` : ''}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={creating}
            aria-label="Cerrar"
            style={{
              width: 34,
              height: 34,
              borderRadius: 999,
              border: 'none',
              background: '#f2f2f7',
              color: '#6e6e73',
              fontSize: 18,
              fontWeight: 900,
              cursor: creating ? 'default' : 'pointer',
            }}
          >
            ×
          </button>
        </div>

        <div style={{ marginTop: 18 }}>
          <span style={smallLabelStyle}>Fecha</span>
          <DatePickerField
            value={selectedDate}
            onChange={(value) => {
              setSelectedDate(value);
              setError('');
              setResultMessage('');
            }}
            placeholder="Elegí un día"
            allowPast={false}
          />
        </div>

        <div style={{ marginTop: 14, position: 'relative' }}>
          <span style={smallLabelStyle}>Hora</span>

          <button
            type="button"
            onClick={() => setTimePickerOpen((current) => !current)}
            aria-haspopup="listbox"
            aria-expanded={timePickerOpen}
            style={{
              ...inputStyle,
              minHeight: 46,
              borderRadius: 14,
              background: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              cursor: 'pointer',
              textAlign: 'left',
              color: selectedTime ? '#111827' : '#8e8e93',
              fontWeight: selectedTime ? 850 : 700,
            }}
          >
            <span>{selectedTime || 'Seleccionar hora'}</span>
            <span
              aria-hidden="true"
              style={{
                width: 28,
                height: 28,
                borderRadius: 9,
                display: 'grid',
                placeItems: 'center',
                background: '#eef6ff',
                color: '#0071e3',
                fontSize: 15,
              }}
            >
              ◷
            </span>
          </button>

          {timePickerOpen && (
            <div
              role="listbox"
              aria-label="Seleccionar hora"
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: 0,
                right: 0,
                zIndex: 17000,
                background: '#fff',
                border: '1px solid rgba(15,23,42,.08)',
                borderRadius: 18,
                boxShadow: '0 16px 38px rgba(15,23,42,.14)',
                padding: 10,
                maxHeight: 225,
                overflowY: 'auto',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0,1fr))',
                  gap: 7,
                }}
              >
                {timeOptions.map((time) => {
                  const selected = selectedTime === time;

                  return (
                    <button
                      key={time}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => {
                        setSelectedTime(time);
                        setTimePickerOpen(false);
                        setError('');
                        setResultMessage('');
                      }}
                      style={{
                        border: selected
                          ? '1px solid rgba(0,113,227,.22)'
                          : '1px solid rgba(15,23,42,.06)',
                        borderRadius: 12,
                        padding: '9px 8px',
                        background: selected ? '#0071e3' : '#f7f8fa',
                        color: selected ? '#fff' : '#1d2636',
                        fontFamily: 'inherit',
                        fontSize: 12.5,
                        fontWeight: 850,
                        cursor: 'pointer',
                      }}
                    >
                      {time}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <label style={{ display: 'block', marginTop: 14 }}>
          <span style={smallLabelStyle}>Cantidad de veces</span>
          <input
            type="number"
            min="1"
            max="100"
            inputMode="numeric"
            value={repeatCount}
            onChange={(event) => {
              setRepeatCount(event.target.value);
              setError('');
              setResultMessage('');
            }}
            style={{
              ...inputStyle,
              minHeight: 46,
              borderRadius: 14,
            }}
          />
        </label>

        <div
          style={{
            marginTop: 14,
            padding: '11px 13px',
            borderRadius: 14,
            background: '#f2f7ff',
            color: '#44607c',
            fontSize: 12,
            lineHeight: 1.5,
            fontWeight: 750,
          }}
        >
          Elegí una fecha en el almanaque, la hora y cuántas veces querés
          repetirla. Desde esa fecha se repite semanalmente en el mismo horario.
        </div>

        {error && (
          <div
            style={{
              marginTop: 12,
              padding: '10px 12px',
              borderRadius: 12,
              background: '#fff2f2',
              color: '#c62828',
              fontSize: 12.5,
              fontWeight: 800,
            }}
          >
            {error}
          </div>
        )}

        {resultMessage && (
          <div
            style={{
              marginTop: 12,
              padding: '10px 12px',
              borderRadius: 12,
              background: '#edfff3',
              color: '#188038',
              fontSize: 12.5,
              fontWeight: 850,
            }}
          >
            {resultMessage}
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1.4fr',
            gap: 10,
            marginTop: 14,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={creating}
            style={{
              border: 'none',
              borderRadius: 14,
              padding: '12px 14px',
              background: '#f2f2f7',
              color: '#1a1a1a',
              fontFamily: 'inherit',
              fontSize: 13,
              fontWeight: 900,
              cursor: creating ? 'default' : 'pointer',
            }}
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={createRepeatedBookings}
            disabled={creating}
            style={{
              border: 'none',
              borderRadius: 14,
              padding: '12px 14px',
              background: creating ? '#9fc9f3' : '#0071e3',
              color: '#fff',
              fontFamily: 'inherit',
              fontSize: 13.5,
              fontWeight: 950,
              cursor: creating ? 'default' : 'pointer',
              boxShadow: creating ? 'none' : '0 7px 18px rgba(0,113,227,.22)',
            }}
          >
            {creating
              ? 'Creando citas...'
              : `Repetir ${Number(repeatCount) > 0 ? repeatCount : ''} ${
                  Number(repeatCount) === 1 ? 'vez' : 'veces'
                }`}
          </button>
        </div>
      </div>
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
  const [manualBookingClient, setManualBookingClient] = useState(null);
  const [repeatBooking, setRepeatBooking] = useState(null);
  const [importedClients, setImportedClients] = useState([]);
  const [importingContacts, setImportingContacts] = useState(false);
  const [importContactsStatus, setImportContactsStatus] = useState('');
  const [webImportOpen, setWebImportOpen] = useState(false);

  let storedProfessional = {};

  try {
    storedProfessional = JSON.parse(localStorage.getItem('tuagendaya_professional')) || {};
  } catch {
    storedProfessional = {};
  }

  const businessName = storedProfessional.businessName || storedProfessional.business_name || storedProfessional.name || '';

  const getBookingClientName = (booking) => String(
    booking?.clientName ??
    booking?.client_name ??
    booking?.customerName ??
    booking?.customer_name ??
    booking?.client?.name ??
    booking?.customer?.name ??
    booking?.name ??
    ''
  ).trim();

  const getBookingClientPhone = (booking) => String(
    booking?.clientPhone ??
    booking?.client_phone ??
    booking?.customerPhone ??
    booking?.customer_phone ??
    booking?.client?.phone ??
    booking?.customer?.phone ??
    booking?.phone ??
    ''
  ).trim();

  const normalizeBookingStatus = (status) => String(status || '').trim().toLowerCase();

  const getClientTypeInfo = (client) => {
    if (client.cancelledCount >= 2) {
      return { label: 'Con cancelaciones', color: '#ff9500', bg: '#fff7e8' };
    }

    if (client.completedCount >= 2 || client.bookings.length >= 5) {
      return { label: 'Cliente frecuente', color: '#188038', bg: '#edfff3' };
    }

    if (client.bookings.length >= 2) {
      return { label: 'Cliente recurrente', color: '#5856d6', bg: '#f1f0ff' };
    }

    return { label: 'Cliente nuevo', color: '#0071e3', bg: '#eef6ff' };
  };

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


  const fetchImportedClients = useCallback(() => {
    const token = localStorage.getItem('tuagendaya_token');

    return fetch(`${API_BASE}/professionals/me/clients`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'No se pudieron cargar los contactos importados');
        setImportedClients(Array.isArray(data.clients) ? data.clients : []);
      })
      .catch(() => {
        setImportedClients([]);
      });
  }, []);

  const submitImportedContacts = async (contacts) => {
    if (!Array.isArray(contacts) || contacts.length === 0) {
      setImportContactsStatus('No encontramos contactos con teléfono para importar.');
      return;
    }

    const token = localStorage.getItem('tuagendaya_token');
    const response = await fetch(`${API_BASE}/professionals/me/clients/import`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ contacts }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || 'No se pudieron importar los contactos');
    }

    await fetchImportedClients();

    const importedCount = Number(data.imported || 0);
    const existingCount = Number(data.existing || 0);
    const skippedCount = Number(data.skipped || 0);
    const parts = [`${importedCount} ${importedCount === 1 ? 'contacto guardado' : 'contactos guardados'}`];

    if (existingCount > 0) parts.push(`${existingCount} ya ${existingCount === 1 ? 'existía' : 'existían'}`);
    if (skippedCount > 0) parts.push(`${skippedCount} sin teléfono válido`);

    setImportContactsStatus(parts.join(' · '));
  };

  const splitCsvLine = (line, separator) => {
    const values = [];
    let current = '';
    let quoted = false;

    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];

      if (char === '"') {
        if (quoted && line[index + 1] === '"') {
          current += '"';
          index += 1;
        } else {
          quoted = !quoted;
        }
      } else if (char === separator && !quoted) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    values.push(current.trim());
    return values;
  };

  const parseWebContactsFile = async (file) => {
    const rawText = await file.text();
    const text = String(rawText || '').replace(/^\uFEFF/, '');
    const lowerName = String(file?.name || '').toLowerCase();

    if (lowerName.endsWith('.vcf') || /BEGIN:VCARD/i.test(text)) {
      return text
        .split(/END:VCARD/i)
        .map((block) => {
          const nameMatch =
            block.match(/(?:^|\r?\n)FN(?:;[^:]*)?:(.+)/i) ||
            block.match(/(?:^|\r?\n)N(?:;[^:]*)?:([^;\r\n]*);([^;\r\n]*)/i);
          const phoneMatch = block.match(/(?:^|\r?\n)TEL(?:;[^:]*)?:(.+)/i);

          let name = '';

          if (nameMatch) {
            if (nameMatch.length >= 3) {
              name = [nameMatch[2], nameMatch[1]].filter(Boolean).join(' ');
            } else {
              name = nameMatch[1];
            }
          }

          return {
            name: String(name || 'Cliente sin nombre')
              .replace(/\\n/gi, ' ')
              .replace(/\\,/g, ',')
              .trim(),
            phone: String(phoneMatch?.[1] || '')
              .replace(/^tel:/i, '')
              .replace(/\\-/g, '-')
              .trim(),
            deviceContactId: null,
          };
        })
        .filter((contact) => contact.phone);
    }

    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length < 2) {
      return [];
    }

    const firstLine = lines[0];
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const separator = semicolonCount > commaCount ? ';' : ',';
    const headers = splitCsvLine(firstLine, separator).map((header) =>
      normalizeSearchText(header).replace(/[^a-z0-9]+/g, ' ').trim()
    );

    const findHeaderIndex = (candidates) =>
      headers.findIndex((header) =>
        candidates.some((candidate) => header === candidate || header.includes(candidate))
      );

    const nameIndex = findHeaderIndex([
      'cliente',
      'nombre',
      'name',
      'full name',
      'given name',
      'first name',
    ]);

    const phoneIndexes = headers
      .map((header, index) => ({ header, index }))
      .filter(({ header }) =>
        ['telefono', 'phone', 'mobile', 'celular', 'telefono 1 valor', 'phone 1 value']
          .some((candidate) => header === candidate || header.includes(candidate))
      )
      .map(({ index }) => index);

    if (phoneIndexes.length === 0) {
      throw new Error('El archivo no tiene una columna de teléfono reconocible.');
    }

    return lines
      .slice(1)
      .map((line) => {
        const row = splitCsvLine(line, separator);
        const phone = phoneIndexes
          .map((index) => row[index])
          .find((value) => String(value || '').trim());

        return {
          name: String(nameIndex >= 0 ? row[nameIndex] : 'Cliente sin nombre').trim() || 'Cliente sin nombre',
          phone: String(phone || '').trim(),
          deviceContactId: null,
        };
      })
      .filter((contact) => contact.phone);
  };

  const handleWebContactsFile = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setImportingContacts(true);
    setImportContactsStatus('');

    try {
      const contacts = await parseWebContactsFile(file);

      if (contacts.length === 0) {
        throw new Error('No encontramos contactos con teléfono dentro del archivo.');
      }

      await submitImportedContacts(contacts);
      setWebImportOpen(false);
    } catch (error) {
      setImportContactsStatus(error.message || 'No se pudieron importar los contactos');
    } finally {
      setImportingContacts(false);
      event.target.value = '';
    }
  };

  const handleImportContacts = async () => {
    if (!Capacitor.isNativePlatform()) {
      setImportContactsStatus('');
      setWebImportOpen(true);
      return;
    }

    setImportingContacts(true);
    setImportContactsStatus('');

    try {
      const result = await CapacitorContacts.pickContacts({
        fields: ['id', 'fullName', 'givenName', 'familyName', 'phoneNumbers'],
        multiple: true,
      });

      const selected = Array.isArray(result?.contacts) ? result.contacts : [];

      if (selected.length === 0) {
        setImportContactsStatus('No seleccionaste contactos.');
        return;
      }

      const contacts = selected
        .map((contact) => {
          const phoneNumbers = Array.isArray(contact?.phoneNumbers) ? contact.phoneNumbers : [];
          const primaryPhone =
            phoneNumbers.find((item) => item?.isPrimary && item?.value)?.value ||
            phoneNumbers.find((item) => item?.value)?.value ||
            '';
          const fullName = String(
            contact?.fullName ||
            [contact?.givenName, contact?.familyName].filter(Boolean).join(' ') ||
            'Cliente sin nombre'
          ).trim();

          return {
            name: fullName,
            phone: String(primaryPhone || '').trim(),
            deviceContactId: contact?.id ? String(contact.id) : null,
          };
        })
        .filter((contact) => contact.phone);

      if (contacts.length === 0) {
        setImportContactsStatus('Los contactos seleccionados no tienen un número de teléfono disponible.');
        return;
      }

      await submitImportedContacts(contacts);
    } catch (error) {
      const message = String(error?.message || 'No se pudieron importar los contactos');

      if (/cancel|cancelled|canceled/i.test(message)) {
        setImportContactsStatus('Importación cancelada.');
      } else {
        setImportContactsStatus(message);
      }
    } finally {
      setImportingContacts(false);
    }
  };

  useEffect(() => {
    fetchBookings(true);
    fetchClientNotes();
    fetchImportedClients();

    const intervalId = window.setInterval(() => {
      fetchBookings(false);
    }, 10000);

    return () => window.clearInterval(intervalId);
  }, [fetchBookings, fetchClientNotes, fetchImportedClients]);

  const clientsMap = new Map();

  importedClients.forEach((importedClient) => {
    const clientName = String(importedClient.clientName ?? importedClient.client_name ?? importedClient.name ?? '').trim();
    const clientPhone = String(importedClient.clientPhone ?? importedClient.client_phone ?? importedClient.phone ?? '').trim();
    const normalizedPhone = normalizePhoneForWhatsApp(clientPhone);
    const key = getClientIdentityKey(clientName, clientPhone);

    if (!key) return;

    clientsMap.set(key, {
      key,
      name: clientName || 'Cliente sin nombre',
      phone: clientPhone,
      normalizedPhone,
      imported: true,
      bookings: [],
    });
  });

  bookings.forEach((booking) => {
    const clientName = getBookingClientName(booking);
    const clientPhone = getBookingClientPhone(booking);

    if (!clientName && !clientPhone) return;

    const normalizedPhone = normalizePhoneForWhatsApp(clientPhone);
    const key = getClientIdentityKey(clientName, clientPhone);

    if (!key) return;

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
    const completedCount = sortedBookings.filter((booking) => {
      const status = normalizeBookingStatus(booking.status);
      return status === 'completed' || status === 'completada' || status === 'completado';
    }).length;
    const cancelledCount = sortedBookings.filter((booking) => {
      const status = normalizeBookingStatus(booking.status);
      return status === 'cancelled' || status === 'cancelada' || status === 'cancelado';
    }).length;
    const pendingOrConfirmedCount = sortedBookings.filter((booking) => {
      const status = normalizeBookingStatus(booking.status);
      return status === 'pending' || status === 'confirmed' || status === 'pendiente' || status === 'confirmada' || status === 'confirmado';
    }).length;

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
      {webImportOpen && !Capacitor.isNativePlatform() && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Importar clientes"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 15000,
            background: 'rgba(15,23,42,0.42)',
            backdropFilter: 'blur(8px)',
            display: 'grid',
            placeItems: 'center',
            padding: 18,
          }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !importingContacts) {
              setWebImportOpen(false);
            }
          }}
        >
          <div
            style={{
              width: 'min(520px, 100%)',
              background: '#fff',
              borderRadius: 24,
              padding: 22,
              boxShadow: '0 28px 70px rgba(15,23,42,0.24)',
              border: '1px solid rgba(15,23,42,0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 950, color: '#111827' }}>
                  Importar clientes
                </div>
                <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.5, color: '#6e6e73', fontWeight: 650 }}>
                  Seleccioná un archivo de contactos. Aceptamos CSV y VCF. Si un teléfono ya existe, no se crea un cliente duplicado.
                </div>
              </div>

              <button
                type="button"
                disabled={importingContacts}
                onClick={() => setWebImportOpen(false)}
                aria-label="Cerrar"
                style={{
                  flexShrink: 0,
                  width: 34,
                  height: 34,
                  borderRadius: 999,
                  border: 'none',
                  background: '#f2f2f7',
                  color: '#6e6e73',
                  fontSize: 18,
                  fontWeight: 900,
                  cursor: importingContacts ? 'default' : 'pointer',
                }}
              >
                ×
              </button>
            </div>

            <label
              style={{
                display: 'block',
                marginTop: 18,
                border: '1.5px dashed #b8c7dc',
                borderRadius: 18,
                padding: '26px 18px',
                background: '#f8fbff',
                textAlign: 'center',
                cursor: importingContacts ? 'default' : 'pointer',
              }}
            >
              <input
                type="file"
                accept=".csv,.vcf,text/csv,text/vcard,text/x-vcard"
                onChange={handleWebContactsFile}
                disabled={importingContacts}
                style={{
                  position: 'absolute',
                  width: 1,
                  height: 1,
                  opacity: 0,
                  pointerEvents: 'none',
                }}
              />

              <div style={{ fontSize: 15, fontWeight: 950, color: '#0071e3' }}>
                {importingContacts ? 'Importando...' : 'Seleccionar archivo'}
              </div>
              <div style={{ marginTop: 5, fontSize: 12, color: '#8e8e93', fontWeight: 750 }}>
                CSV o VCF
              </div>
            </label>

            <div
              style={{
                marginTop: 14,
                padding: '12px 14px',
                borderRadius: 14,
                background: '#f5f5f7',
                color: '#6e6e73',
                fontSize: 12,
                lineHeight: 1.5,
                fontWeight: 700,
              }}
            >
              Podés exportar tus contactos desde iCloud, Google Contacts u otra agenda y subir ese archivo acá.
            </div>

            {importContactsStatus && (
              <div
                style={{
                  marginTop: 12,
                  padding: '10px 12px',
                  borderRadius: 12,
                  background: '#fff4f4',
                  color: '#b42318',
                  fontSize: 12,
                  lineHeight: 1.45,
                  fontWeight: 800,
                }}
              >
                {importContactsStatus}
              </div>
            )}
          </div>
        </div>
      )}

      <ManualBookingModal
        open={Boolean(manualBookingClient)}
        initialClient={manualBookingClient}
        onClose={() => setManualBookingClient(null)}
        onCreated={() => {
          setManualBookingClient(null);
          fetchBookings(true);
        }}
      />


      <RepeatBookingModal
        open={Boolean(repeatBooking)}
        booking={repeatBooking}
        onClose={() => setRepeatBooking(null)}
        onCreated={() => fetchBookings(true)}
      />

      <div style={{ marginBottom: 16 }}>
        <button
          type="button"
          className="clients-summary-button"
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
                <div style={{ fontSize: 15, fontWeight: 900, color: '#1a1a1a' }}>Resumen de clientes</div>
                <div style={{ fontSize: 12, color: '#8e8e93', fontWeight: 700, marginTop: 2 }}>
                  Resumen de clientes guardados e identificados por su número de teléfono.
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

      <div className="clients-panel-card" style={{ background: '#fff', borderRadius: 22, padding: '20px 24px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
        <div className="clients-panel-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 900, color: '#1a1a1a' }}>Clientes</div>
            <div style={{ fontSize: 12, color: '#8e8e93', fontWeight: 600, marginTop: 4 }}>
              Se crean con cada reserva o al importar contactos. Podés ver historial y contactar por WhatsApp.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={handleImportContacts}
              disabled={importingContacts}
              style={{
                border: 'none',
                background: importingContacts ? '#d7e7f8' : '#eef6ff',
                color: '#0071e3',
                borderRadius: 999,
                padding: '9px 13px',
                fontSize: 12,
                fontWeight: 900,
                fontFamily: 'inherit',
                cursor: importingContacts ? 'default' : 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {importingContacts ? 'Importando...' : 'Importar contactos'}
            </button>

            <button
              type="button"
              className="clients-export-button"
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
        </div>

        {importContactsStatus && (
          <div style={{ margin: '-4px 0 14px', fontSize: 12, color: '#6e6e73', fontWeight: 800 }}>
            {importContactsStatus}
          </div>
        )}

        {!Capacitor.isNativePlatform() && !importContactsStatus && (
          <div style={{ margin: '-4px 0 14px', fontSize: 11.5, color: '#8e8e93', fontWeight: 700 }}>
            Desde la web podés importar clientes desde un archivo CSV o VCF exportado desde tus contactos.
          </div>
        )}

        <div className="clients-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 14 }}>
          <div style={{ background: '#f5f5f7', borderRadius: 16, padding: 12 }}>
            <div style={{ fontSize: 10.5, color: '#8e8e93', fontWeight: 900, marginBottom: 4 }}>CLIENTES</div>
            <div style={{ fontSize: 20, color: '#1a1a1a', fontWeight: 950 }}>{clients.length}</div>
          </div>

          <div style={{ background: '#eef6ff', borderRadius: 16, padding: 12 }}>
            <div style={{ fontSize: 10.5, color: '#0071e3', fontWeight: 900, marginBottom: 4 }}>RESERVAS</div>
            <div style={{ fontSize: 20, color: '#0071e3', fontWeight: 950 }}>{totalBookings}</div>
          </div>

          <div style={{ background: '#edfff3', borderRadius: 16, padding: 12 }}>
            <div style={{ fontSize: 10.5, color: '#188038', fontWeight: 900, marginBottom: 4 }}>FRECUENTES</div>
            <div style={{ fontSize: 20, color: '#188038', fontWeight: 950 }}>{frequentClients}</div>
          </div>
        </div>

        <input
          className="clients-search-input"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nombre o teléfono"
          style={{ ...inputStyle, marginBottom: 16, borderRadius: 14, padding: '13px 14px', background: '#f9f9fb' }}
        />

        {loadingClients ? (
          <div style={{ textAlign: 'center', color: '#aeaeb2', padding: 34 }}>Cargando clientes...</div>
        ) : filteredClients.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#aeaeb2', padding: 34 }}>
            {clients.length === 0 ? 'Todavía no hay clientes. Podés importar contactos o esperar a que hagan una reserva.' : 'No encontramos clientes con esa búsqueda.'}
          </div>
        ) : (
          <div className="clients-list" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredClients.map((client) => {
              const isExpanded = expandedClientKey === client.key;
              const lastBooking = client.lastBooking;
              const lastDate = lastBooking ? formatDate(getBookingDateValue(lastBooking)) : 'Sin reservas';
              const lastTime = lastBooking ? formatTime(lastBooking.startTime ?? lastBooking.start_time) : null;
              const lastService = lastBooking ? (lastBooking.serviceName ?? lastBooking.service_name ?? 'Servicio') : 'Sin servicio';
              const whatsappUrl = buildWhatsAppUrl(client.phone, buildClientGeneralMessage(client));
              const clientType = getClientTypeInfo(client);

              return (
                <div
                  key={client.key}
                  className="client-card"
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
                    className="client-card-button"
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
                      className="client-avatar"
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

                    <div className="client-type-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, color: clientType.color, background: clientType.bg, padding: '5px 9px', borderRadius: 999, fontWeight: 900, whiteSpace: 'nowrap' }}>
                        {clientType.label}
                      </span>
                      <span style={{ color: '#8e8e93', fontSize: 18, fontWeight: 800, transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.18s ease' }}>
                        ⌄
                      </span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="client-expanded" style={{ padding: '0 16px 16px 16px' }}>
                      <div style={{ borderTop: '0.5px solid #eeeeef', paddingTop: 14 }}>
                        <div className="client-expanded-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10, marginBottom: 12 }}>
                          <div style={{ background: '#fafafa', borderRadius: 14, padding: 12 }}>
                            <div style={{ fontSize: 11, color: '#8e8e93', fontWeight: 800 }}>Total</div>
                            <div style={{ fontSize: 18, color: '#1a1a1a', fontWeight: 900, marginTop: 4 }}>{client.bookings.length}</div>
                          </div>

                          <div style={{ background: '#fafafa', borderRadius: 14, padding: 12 }}>
                            <div style={{ fontSize: 11, color: '#8e8e93', fontWeight: 800 }}>Completadas</div>
                            <div style={{ fontSize: 18, color: '#5e5ce6', fontWeight: 900, marginTop: 4 }}>{client.completedCount}</div>
                          </div>

                          <div style={{ background: '#fafafa', borderRadius: 14, padding: 12 }}>
                            <div style={{ fontSize: 11, color: '#8e8e93', fontWeight: 800 }}>Pendientes</div>
                            <div style={{ fontSize: 18, color: '#ff9f0a', fontWeight: 900, marginTop: 4 }}>{client.pendingOrConfirmedCount}</div>
                          </div>

                          <div style={{ background: '#fafafa', borderRadius: 14, padding: 12 }}>
                            <div style={{ fontSize: 11, color: '#8e8e93', fontWeight: 800 }}>Canceladas</div>
                            <div style={{ fontSize: 18, color: '#ff453a', fontWeight: 900, marginTop: 4 }}>{client.cancelledCount}</div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                          <button
                            type="button"
                            onClick={() => setManualBookingClient({
                              name: client.name,
                              phone: client.phone,
                            })}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: 'none',
                              padding: '10px 14px',
                              borderRadius: 12,
                              background: '#0071e3',
                              color: '#fff',
                              fontSize: 13,
                              fontWeight: 900,
                              fontFamily: 'inherit',
                              cursor: 'pointer',
                            }}
                          >
                            Agendar reserva
                          </button>

                          {client.lastBooking && (
                            <button
                              type="button"
                              onClick={() => setRepeatBooking(client.lastBooking)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '1px solid #0071e3',
                                padding: '10px 14px',
                                borderRadius: 12,
                                background: '#fff',
                                color: '#0071e3',
                                fontSize: 13,
                                fontWeight: 900,
                                fontFamily: 'inherit',
                                cursor: 'pointer',
                              }}
                            >
                              Repetir cita
                            </button>
                          )}

                          {whatsappUrl && (
                            <a
                              href={whatsappUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="client-whatsapp-button"
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
                              }}
                            >
                              Enviar WhatsApp
                            </a>
                          )}
                        </div>

                        <div className="client-notes-box" style={{ background: '#fafafa', borderRadius: 16, padding: 14, marginBottom: 14, border: '0.5px solid #eeeeef' }}>
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

                          <div className="client-note-footer" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginTop: 10 }}>
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
                            const status = normalizeBookingStatus(booking.status || 'pending');
                            const statusColor = { pending: '#ff9f0a', pendiente: '#ff9f0a', confirmed: '#30d158', confirmada: '#30d158', confirmado: '#30d158', completed: '#5e5ce6', completada: '#5e5ce6', completado: '#5e5ce6', cancelled: '#ff453a', cancelada: '#ff453a', cancelado: '#ff453a' }[status] || '#8e8e93';
                            const statusLabel = { pending: 'Pendiente', pendiente: 'Pendiente', confirmed: 'Confirmada', confirmada: 'Confirmada', confirmado: 'Confirmado', completed: 'Completada', completada: 'Completada', completado: 'Completado', cancelled: 'Cancelada', cancelada: 'Cancelada', cancelado: 'Cancelado' }[status] || status;

                            return (
                              <div key={booking.id} className="client-history-row" style={{ background: '#fafafa', borderRadius: 14, padding: '10px 12px', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 10, alignItems: 'center' }}>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontSize: 13, fontWeight: 900, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {dateStr}{timeStr ? ` · ${timeStr}${endStr ? ` - ${endStr}` : ''}` : ''}
                                  </div>
                                  <div style={{ fontSize: 12, color: '#6e6e73', fontWeight: 700, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {serviceName}{staffName ? ` · ${staffName}` : ''}
                                  </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                  <div style={{ fontSize: 11, color: statusColor, background: '#fff', border: `0.5px solid ${statusColor}33`, padding: '5px 9px', borderRadius: 999, fontWeight: 900 }}>
                                    {statusLabel}
                                  </div>
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




function normalizeBlockedTime(item) {
  return {
    id: item.id,
    blockDate: String(item.blockDate ?? item.block_date ?? item.date ?? '').slice(0, 10),
    startTime: item.startTime ?? item.start_time ?? '',
    endTime: item.endTime ?? item.end_time ?? '',
    reason: item.reason || '',
    isFullDay: Boolean(item.isFullDay ?? item.is_full_day ?? false),
    isWorkingDaysRecurring: Boolean(
      item.isWorkingDaysRecurring ?? item.is_working_days_recurring ?? false
    ),
  };
}


function AvailabilityTable({ availability, onChange }) {
  const tableRows = DAYS.map((day) => {
    const current = availability.find((item) => Number(item.dayOfWeek) === Number(day.dayOfWeek)) || {
      dayOfWeek: day.dayOfWeek,
      isActive: false,
      startTime: '09:00',
      endTime: '18:00',
      slotDurationMinutes: 30,
    };

    return { ...current, label: day.label };
  });

  return (
    <div className="availability-days-grid" style={{ display: 'grid', gap: 10 }}>
      {tableRows.map((day) => (
        <div
          key={day.dayOfWeek}
          className={`availability-day-card ${day.isActive ? 'active' : 'inactive'}`}
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(130px, 1.2fr) repeat(2, minmax(130px, 1fr))',
            gap: 10,
            alignItems: 'center',
            background: day.isActive ? 'linear-gradient(180deg, #fbfbfd 0%, #f7f7fb 100%)' : '#fafafa',
            border: day.isActive ? '0.5px solid #dceaff' : '0.5px solid #ececf2',
            borderRadius: 18,
            padding: 12,
            boxShadow: day.isActive ? '0 1px 8px rgba(0,113,227,0.045)' : '0 1px 5px rgba(0,0,0,0.025)',
          }}
        >
          <label className="availability-day-toggle" style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 900, color: '#1a1a1a' }}>
            <input
              type="checkbox"
              checked={Boolean(day.isActive)}
              onChange={(event) => onChange(day.dayOfWeek, 'isActive', event.target.checked)}
            />
            <span>{day.label}</span>
            <span className="availability-day-status">{day.isActive ? 'Atiende' : 'Cerrado'}</span>
          </label>

          <div className="availability-time-field">
            <label style={{ ...smallLabelStyle, marginBottom: 4 }}>Desde</label>
            <input
              type="text"
              value={day.startTime || '09:00'}
              placeholder="09:00"
              inputMode="numeric"
              disabled={!day.isActive}
              onChange={(event) => onChange(day.dayOfWeek, 'startTime', event.target.value)}
              style={{ ...inputStyle, marginBottom: 0, borderRadius: 14, border: '0.5px solid #e2e2e8', background: day.isActive ? '#fff' : '#f7f7fb', boxShadow: day.isActive ? '0 2px 8px rgba(0,0,0,0.03)' : 'none', cursor: day.isActive ? 'text' : 'not-allowed', opacity: day.isActive ? 1 : 0.55 }}
            />
          </div>

          <div className="availability-time-field">
            <label style={{ ...smallLabelStyle, marginBottom: 4 }}>Hasta</label>
            <input
              type="text"
              value={day.endTime || '18:00'}
              placeholder="18:00"
              inputMode="numeric"
              disabled={!day.isActive}
              onChange={(event) => onChange(day.dayOfWeek, 'endTime', event.target.value)}
              style={{ ...inputStyle, marginBottom: 0, borderRadius: 14, border: '0.5px solid #e2e2e8', background: day.isActive ? '#fff' : '#f7f7fb', boxShadow: day.isActive ? '0 2px 8px rgba(0,0,0,0.03)' : 'none', cursor: day.isActive ? 'text' : 'not-allowed', opacity: day.isActive ? 1 : 0.55 }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}


function AvailabilitySection() {
  const [availability, setAvailability] = useState(getDefaultAvailability());
  const [blockedTimes, setBlockedTimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingBlocks, setLoadingBlocks] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingBlock, setSavingBlock] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [blockForm, setBlockForm] = useState({
    blockDate: getLocalDateKeyValue(),
    startTime: '13:00',
    endTime: '14:00',
    isFullDay: false,
    reason: '',
  });
  const [rangeBlockForm, setRangeBlockForm] = useState({
    startDate: getLocalDateKeyValue(),
    endDate: getLocalDateKeyValue(),
    reason: '',
  });
  const [blockRepeatUnit, setBlockRepeatUnit] = useState('none');
  const [blockRepeatCount, setBlockRepeatCount] = useState('4');
  const [workingDaysBlockForm, setWorkingDaysBlockForm] = useState({
    startTime: '13:00',
    endTime: '14:00',
    reason: '',
  });

  const getToken = () => localStorage.getItem('tuagendaya_token');

  const fetchAvailability = () => {
    const token = getToken();

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

  const fetchBlockedTimes = () => {
    const token = getToken();

    setLoadingBlocks(true);

    fetch(`${API_BASE}/bookings/blocks`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setBlockedTimes(Array.isArray(data.blocks) ? data.blocks.map(normalizeBlockedTime) : []))
      .catch(() => setBlockedTimes([]))
      .finally(() => setLoadingBlocks(false));
  };

  useEffect(() => {
    fetchAvailability();
    fetchBlockedTimes();
  }, []);

  const updateDay = (dayOfWeek, field, value) => {
    setAvailability((prev) =>
      prev.map((day) =>
        day.dayOfWeek === dayOfWeek ? { ...day, [field]: value } : day
      )
    );
  };

  const handleSave = async () => {
    const token = getToken();

    setSaving(true);
    setMessage('');
    setError('');

    try {
      const cleanAvailability = availability.map((day) => ({
        ...day,
        breakEnabled: false,
        breakStartTime: null,
        breakEndTime: null,
      }));

      const res = await fetch(`${API_BASE}/professionals/me/availability`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ availability: cleanAvailability }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'No se pudo guardar la disponibilidad.');
      } else {
        if (Array.isArray(data.availability)) {
          setAvailability(data.availability.map(normalizeAvailabilityItem));
        }
        window.dispatchEvent(new Event('tuagendaya:setup-updated'));
        setMessage('Disponibilidad general guardada correctamente.');
      }
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setSaving(false);
    }
  };

  const saveBlock = async () => {
    const token = getToken();

    if (!blockForm.blockDate) {
      setError('Elegí una fecha para bloquear.');
      return;
    }

    if (!blockForm.isFullDay && (!blockForm.startTime || !blockForm.endTime || blockForm.endTime <= blockForm.startTime)) {
      setError('Revisá el horario bloqueado.');
      return;
    }

    setSavingBlock(true);
    setMessage('');
    setError('');

    try {
      const repeatEnabled = blockRepeatUnit !== 'none';

      if (
        repeatEnabled &&
        (!Number.isInteger(Number(blockRepeatCount)) ||
          Number(blockRepeatCount) < 1 ||
          Number(blockRepeatCount) > 90)
      ) {
        throw new Error('La cantidad de repeticiones debe estar entre 1 y 90.');
      }

      const response = await fetch(
        `${API_BASE}/bookings/${repeatEnabled ? 'blocks/repeat' : 'blocks'}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...blockForm,
            recurrenceUnit: repeatEnabled ? blockRepeatUnit : null,
            repeatCount: repeatEnabled ? Number(blockRepeatCount) : 1,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo bloquear el horario.');
      }

      setBlockedTimes(Array.isArray(data.blocks) ? data.blocks.map(normalizeBlockedTime) : []);
      setBlockForm((current) => ({
        ...current,
        startTime: '13:00',
        endTime: '14:00',
        isFullDay: false,
        reason: '',
      }));

      const timeLabel = blockForm.isFullDay
        ? 'Día completo'
        : `${String(blockForm.startTime).slice(0, 5)} a ${String(blockForm.endTime).slice(0, 5)}`;

      setMessage(
        repeatEnabled
          ? `${Number(blockRepeatCount)} bloqueos creados desde ${formatDate(blockForm.blockDate)} · ${timeLabel}.`
          : `Bloqueado: ${formatDate(blockForm.blockDate)} · ${timeLabel}.`
      );
    } catch (err) {
      setError(err.message || 'No se pudo bloquear el horario.');
    } finally {
      setSavingBlock(false);
    }
  };

  const saveWorkingDaysBlock = async () => {
    const token = getToken();
    const startTime = String(workingDaysBlockForm.startTime || '').slice(0, 5);
    const endTime = String(workingDaysBlockForm.endTime || '').slice(0, 5);

    if (!startTime || !endTime || endTime <= startTime) {
      setError('Revisá el horario fijo de tus días de trabajo.');
      return;
    }

    setSavingBlock(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch(`${API_BASE}/bookings/blocks/working-days`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startTime,
          endTime,
          reason: workingDaysBlockForm.reason,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo guardar el bloqueo fijo.');
      }

      setBlockedTimes(Array.isArray(data.blocks) ? data.blocks.map(normalizeBlockedTime) : []);
      setWorkingDaysBlockForm({
        startTime: '13:00',
        endTime: '14:00',
        reason: '',
      });
      setMessage(`Bloqueo fijo guardado · ${startTime} a ${endTime} en todos tus días de trabajo.`);
    } catch (err) {
      setError(err.message || 'No se pudo guardar el bloqueo fijo.');
    } finally {
      setSavingBlock(false);
    }
  };

  const saveRangeBlock = async () => {
    const token = getToken();

    if (!rangeBlockForm.startDate || !rangeBlockForm.endDate) {
      setError('Elegí fecha desde y hasta.');
      return;
    }

    if (rangeBlockForm.endDate < rangeBlockForm.startDate) {
      setError('La fecha hasta no puede ser anterior a la fecha desde.');
      return;
    }

    setSavingBlock(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch(`${API_BASE}/bookings/blocks/range`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(rangeBlockForm),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo bloquear el rango.');
      }

      setBlockedTimes(Array.isArray(data.blocks) ? data.blocks.map(normalizeBlockedTime) : []);
      setRangeBlockForm({
        startDate: getLocalDateKeyValue(),
        endDate: getLocalDateKeyValue(),
        reason: '',
      });
      setMessage('Rango bloqueado correctamente.');
    } catch (err) {
      setError(err.message || 'No se pudo bloquear el rango.');
    } finally {
      setSavingBlock(false);
    }
  };

  const deleteBlock = async (blockId) => {
    const token = getToken();
    const confirmed = window.confirm('¿Querés liberar este bloqueo?');
    if (!confirmed) return;

    setMessage('');
    setError('');

    try {
      const block = blockedTimes.find(
        (item) => Number(item.id) === Number(blockId)
      );
      const endpoint = block?.isWorkingDaysRecurring
        ? `${API_BASE}/bookings/blocks/working-days/${blockId}`
        : `${API_BASE}/bookings/blocks/${blockId}`;

      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo liberar el horario.');
      }

      setBlockedTimes(Array.isArray(data.blocks) ? data.blocks.map(normalizeBlockedTime) : []);
      setMessage('Horario liberado correctamente.');
    } catch (err) {
      setError(err.message || 'No se pudo liberar el horario.');
    }
  };

  const visibleBlocks = blockedTimes
    .slice()
    .sort((a, b) => {
      const aKey = a.isWorkingDaysRecurring
        ? `0000-00-00 ${a.startTime || '00:00'}`
        : `${a.blockDate} ${a.startTime || '00:00'}`;
      const bKey = b.isWorkingDaysRecurring
        ? `0000-00-00 ${b.startTime || '00:00'}`
        : `${b.blockDate} ${b.startTime || '00:00'}`;

      return aKey.localeCompare(bKey);
    });

  if (loading) {
    return (
      <div style={{ background: '#fff', borderRadius: 20, padding: 24, textAlign: 'center', color: '#aeaeb2' }}>
        Cargando disponibilidad...
      </div>
    );
  }

  return (
    <div className="availability-mobile-section" style={{ display: 'grid', gap: 16 }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: '20px 24px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#1a1a1a' }}>Disponibilidad general</div>
          <div style={{ fontSize: 13, color: '#6e6e73', marginTop: 4 }}>
            Definí tus horarios base. Los cortes o pausas puntuales se bloquean abajo, por fecha y horario.
          </div>
        </div>

        <AvailabilityTable availability={availability} onChange={updateDay} />

        <button
          onClick={handleSave}
          disabled={saving}
          style={{ width: '100%', marginTop: 16, padding: '13px', borderRadius: 12, border: 'none', background: saving ? '#aeaeb2' : '#0071e3', color: '#fff', fontSize: 15, fontWeight: 600, fontFamily: 'inherit', cursor: saving ? 'not-allowed' : 'pointer' }}
        >
          {saving ? 'Guardando...' : 'Guardar disponibilidad general'}
        </button>
      </div>

      <BookingStartIntervalSetting />

      <div style={{ background: '#fff', borderRadius: 20, padding: '20px 24px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: '#1a1a1a' }}>
            Bloqueo fijo en días de trabajo
          </div>
          <div style={{ fontSize: 13, color: '#6e6e73', marginTop: 4, lineHeight: 1.45 }}>
            Bloqueá el mismo horario en todos los días que tengas marcados como días de trabajo.
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={smallLabelStyle}>Desde</label>
            <input
              type="time"
              value={workingDaysBlockForm.startTime}
              step="60"
              onChange={(event) =>
                setWorkingDaysBlockForm((current) => ({
                  ...current,
                  startTime: event.target.value,
                }))
              }
              style={{ ...inputStyle, marginBottom: 0, borderRadius: 14, border: '0.5px solid #e2e2e8', background: '#fff' }}
            />
          </div>

          <div>
            <label style={smallLabelStyle}>Hasta</label>
            <input
              type="time"
              value={workingDaysBlockForm.endTime}
              step="60"
              onChange={(event) =>
                setWorkingDaysBlockForm((current) => ({
                  ...current,
                  endTime: event.target.value,
                }))
              }
              style={{ ...inputStyle, marginBottom: 0, borderRadius: 14, border: '0.5px solid #e2e2e8', background: '#fff' }}
            />
          </div>
        </div>

        <input
          value={workingDaysBlockForm.reason}
          onChange={(event) =>
            setWorkingDaysBlockForm((current) => ({
              ...current,
              reason: event.target.value,
            }))
          }
          placeholder="Motivo opcional, por ejemplo almuerzo"
          style={{ ...inputStyle, marginTop: 10, marginBottom: 0, borderRadius: 14, border: '0.5px solid #e2e2e8', background: '#fff' }}
        />

        <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 13, background: '#eef6ff', color: '#44607c', fontSize: 12, lineHeight: 1.45, fontWeight: 750 }}>
          No lleva fecha ni cantidad. Queda activo permanentemente en todos tus días laborales y se adapta si cambiás qué días trabajás.
        </div>

        <button
          type="button"
          onClick={saveWorkingDaysBlock}
          disabled={savingBlock}
          style={{ marginTop: 12, padding: '12px 16px', borderRadius: 14, border: 'none', background: savingBlock ? '#aeaeb2' : '#0071e3', color: '#fff', fontSize: 14, fontWeight: 850, fontFamily: 'inherit', cursor: savingBlock ? 'not-allowed' : 'pointer' }}
        >
          {savingBlock ? 'Guardando...' : 'Guardar bloqueo fijo'}
        </button>
      </div>

      <div style={{ background: '#fff', borderRadius: 20, padding: '20px 24px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: '#1a1a1a' }}>Bloquear horarios</div>
          <div style={{ fontSize: 13, color: '#6e6e73', marginTop: 4 }}>
            Usalo para pausas, trámites, almuerzo, vacaciones o cualquier horario donde no quieras recibir reservas.
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div>
            <label style={smallLabelStyle}>Fecha</label>
            <DatePickerField
              value={blockForm.blockDate}
              onChange={(value) => setBlockForm({ ...blockForm, blockDate: value })}
              placeholder="Elegir fecha"
              allowPast={false}
            />
          </div>

          <div>
            <label style={smallLabelStyle}>Desde</label>
            <input
              type="time"
              value={blockForm.startTime}
              step="60"
              disabled={blockForm.isFullDay}
              onChange={(event) => setBlockForm((current) => ({ ...current, startTime: event.target.value }))}
              style={{ ...inputStyle, marginBottom: 0, borderRadius: 14, border: '0.5px solid #e2e2e8', background: blockForm.isFullDay ? '#f7f7fb' : '#fff', boxShadow: blockForm.isFullDay ? 'none' : '0 2px 8px rgba(0,0,0,0.03)', cursor: blockForm.isFullDay ? 'not-allowed' : 'text', opacity: blockForm.isFullDay ? 0.55 : 1 }}
            />
          </div>

          <div>
            <label style={smallLabelStyle}>Hasta</label>
            <input
              type="time"
              value={blockForm.endTime}
              step="60"
              disabled={blockForm.isFullDay}
              onChange={(event) => setBlockForm((current) => ({ ...current, endTime: event.target.value }))}
              style={{ ...inputStyle, marginBottom: 0, borderRadius: 14, border: '0.5px solid #e2e2e8', background: blockForm.isFullDay ? '#f7f7fb' : '#fff', boxShadow: blockForm.isFullDay ? 'none' : '0 2px 8px rgba(0,0,0,0.03)', cursor: blockForm.isFullDay ? 'not-allowed' : 'text', opacity: blockForm.isFullDay ? 0.55 : 1 }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center' }}>
          <input
            value={blockForm.reason}
            onChange={(event) => setBlockForm({ ...blockForm, reason: event.target.value })}
            placeholder="Motivo opcional"
            style={{ ...inputStyle, marginBottom: 0, borderRadius: 14, border: '0.5px solid #e2e2e8', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', cursor: 'text' }}
          />

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 800, color: '#1a1a1a', whiteSpace: 'nowrap' }}>
            <input
              type="checkbox"
              checked={blockForm.isFullDay}
              onChange={(event) => setBlockForm({ ...blockForm, isFullDay: event.target.checked })}
            />
            Día completo
          </label>
        </div>

        <div
          style={{
            marginTop: 12,
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 120px',
            gap: 10,
            alignItems: 'end',
          }}
        >
          <div>
            <label style={smallLabelStyle}>Repetición</label>
            <select
              value={blockRepeatUnit}
              onChange={(event) => setBlockRepeatUnit(event.target.value)}
              style={{
                ...inputStyle,
                width: '100%',
                marginBottom: 0,
                borderRadius: 14,
                border: '0.5px solid #e2e2e8',
                background: '#fff',
              }}
            >
              <option value="none">Una sola vez</option>
              <option value="days">Cada día</option>
              <option value="weeks">Cada semana</option>
              <option value="months">Cada mes</option>
            </select>
          </div>

          <div>
            <label style={smallLabelStyle}>Cantidad</label>
            <input
              type="number"
              min="1"
              max="90"
              inputMode="numeric"
              value={blockRepeatUnit === 'none' ? '1' : blockRepeatCount}
              disabled={blockRepeatUnit === 'none'}
              onChange={(event) => setBlockRepeatCount(event.target.value)}
              style={{
                ...inputStyle,
                width: '100%',
                marginBottom: 0,
                borderRadius: 14,
                border: '0.5px solid #e2e2e8',
                background: blockRepeatUnit === 'none' ? '#f7f7fb' : '#fff',
                opacity: blockRepeatUnit === 'none' ? 0.6 : 1,
              }}
            />
          </div>
        </div>


        <button
          type="button"
          onClick={saveBlock}
          disabled={savingBlock}
          style={{ marginTop: 12, padding: '12px 16px', borderRadius: 14, border: 'none', background: savingBlock ? '#aeaeb2' : '#0071e3', color: '#fff', fontSize: 14, fontWeight: 850, fontFamily: 'inherit', cursor: savingBlock ? 'not-allowed' : 'pointer' }}
        >
          {savingBlock ? 'Guardando...' : 'Bloquear horario'}
        </button>

        <div style={{ height: 1, background: '#eeeeef', margin: '18px 0' }} />

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 900, color: '#1a1a1a' }}>Bloquear rango de fechas</div>
          <div style={{ fontSize: 12.5, color: '#6e6e73', marginTop: 4, fontWeight: 700 }}>
            Para vacaciones, feriados o días completos sin atención.
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div>
            <label style={smallLabelStyle}>Desde</label>
            <DatePickerField
              value={rangeBlockForm.startDate}
              onChange={(value) => setRangeBlockForm((current) => ({ ...current, startDate: value, endDate: current.endDate < value ? value : current.endDate }))}
              placeholder="Fecha inicial"
              allowPast={false}
            />
          </div>

          <div>
            <label style={smallLabelStyle}>Hasta</label>
            <DatePickerField
              value={rangeBlockForm.endDate}
              onChange={(value) => setRangeBlockForm({ ...rangeBlockForm, endDate: value })}
              placeholder="Fecha final"
              allowPast={false}
            />
          </div>
        </div>

        <input
          value={rangeBlockForm.reason}
          onChange={(event) => setRangeBlockForm({ ...rangeBlockForm, reason: event.target.value })}
          placeholder="Motivo opcional, por ejemplo vacaciones"
          style={{ ...inputStyle, marginBottom: 0, borderRadius: 14, border: '0.5px solid #e2e2e8', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', cursor: 'text' }}
        />

        <button
          type="button"
          onClick={saveRangeBlock}
          disabled={savingBlock}
          style={{ marginTop: 12, padding: '12px 16px', borderRadius: 14, border: 'none', background: savingBlock ? '#aeaeb2' : '#1c1c1e', color: '#fff', fontSize: 14, fontWeight: 850, fontFamily: 'inherit', cursor: savingBlock ? 'not-allowed' : 'pointer' }}
        >
          {savingBlock ? 'Guardando...' : 'Bloquear rango'}
        </button>

        <div style={{ marginTop: 18, display: 'grid', gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: '#1a1a1a' }}>Bloqueos activos</div>

          {loadingBlocks ? (
            <div style={{ color: '#8e8e93', fontSize: 13, fontWeight: 700 }}>Cargando bloqueos...</div>
          ) : visibleBlocks.length === 0 ? (
            <div style={{ background: '#f7f7fb', borderRadius: 14, padding: 14, color: '#8e8e93', fontSize: 13, fontWeight: 700 }}>
              No hay horarios bloqueados.
            </div>
          ) : (
            visibleBlocks.map((block) => (
              <div key={block.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', background: '#f7f7fb', border: '0.5px solid #ececf2', borderRadius: 14, padding: '11px 12px' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 900, color: '#1a1a1a' }}>
                    {block.isWorkingDaysRecurring
                      ? `Todos los días que trabajás · ${String(block.startTime || '').slice(0, 5)} a ${String(block.endTime || '').slice(0, 5)}`
                      : `${formatDate(block.blockDate)} · ${block.isFullDay ? 'Día completo' : `${String(block.startTime || '').slice(0, 5)} a ${String(block.endTime || '').slice(0, 5)}`}`}
                  </div>
                  {block.reason && (
                    <div style={{ fontSize: 12, color: '#6e6e73', fontWeight: 700, marginTop: 2 }}>{block.reason}</div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => deleteBlock(block.id)}
                  style={{ border: 'none', borderRadius: 999, padding: '8px 11px', background: '#fff2f2', color: '#ff453a', fontSize: 12, fontWeight: 900, fontFamily: 'inherit', cursor: 'pointer' }}
                >
                  Liberar
                </button>
              </div>
            ))
          )}
        </div>

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
      </div>
    </div>
  );
}
function StaffSection() {
  const createPhotoInputRef = useRef(null);
  const editPhotoInputRef = useRef(null);
  const [staff, setStaff] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [availability, setAvailability] = useState(getDefaultAvailability());

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    photoUrl: '',
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
        const extraProfessionals = normalized.slice(1);
        setStaff(extraProfessionals);

        if (extraProfessionals.length > 0) {
          setSelectedStaffId((current) => {
            const stillExists = extraProfessionals.some((member) => String(member.id) === String(current));
            return stillExists ? current : String(extraProfessionals[0].id);
          });
        } else {
          setSelectedStaffId('');
          setAvailability(getDefaultAvailability());
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
      photoUrl: '',
    });

    if (createPhotoInputRef.current) {
      createPhotoInputRef.current.value = '';
    }
  };

  const readStaffPhotoFile = (file, onLoaded, inputElement) => {
    if (!file) return;

    setMessage('');
    setError('');

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      setError('La foto debe ser PNG, JPG o WebP.');
      if (inputElement) inputElement.value = '';
      return;
    }

    const maxSizeBytes = 1 * 1024 * 1024;

    if (file.size > maxSizeBytes) {
      setError('La foto no puede pesar más de 1 MB.');
      if (inputElement) inputElement.value = '';
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      onLoaded(String(reader.result || ''));
    };

    reader.onerror = () => {
      setError('No se pudo leer la foto.');
    };

    reader.readAsDataURL(file);
  };

  const handleCreatePhotoChange = (event) => {
    const file = event.target.files?.[0];

    readStaffPhotoFile(
      file,
      (photoUrl) => setForm((current) => ({ ...current, photoUrl })),
      event.target
    );
  };

  const handleEditPhotoChange = (event) => {
    const file = event.target.files?.[0];

    readStaffPhotoFile(
      file,
      (photoUrl) => setEditing((current) => ({ ...current, photoUrl })),
      event.target
    );
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
          photoUrl: form.photoUrl,
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
      photoUrl: member.photoUrl || '',
      isActive: member.isActive,
    });

    if (editPhotoInputRef.current) {
      editPhotoInputRef.current.value = '';
    }
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
          photoUrl: String(editing.photoUrl || ''),
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
        setMessage('Horarios del profesional adicional adicional guardados correctamente.');
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
            Agregá profesionales adicionales. El dueño principal configura sus horarios en Disponibilidad.
          </div>
        </div>

        <form onSubmit={handleCreate} style={{ background: '#f2f2f7', borderRadius: 16, padding: 16, marginBottom: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Agregar profesional</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1.2fr', gap: 10 }}>
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
          </div>

          <div
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 14,
              background: '#fff',
              border: '0.5px solid #dedee4',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            {form.photoUrl && (
              <img
                src={form.photoUrl}
                alt="Foto del profesional"
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '1px solid #e1e4e8',
                  background: '#fff',
                }}
              />
            )}

            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontSize: 12.5, fontWeight: 850, color: '#1a1a1a' }}>
                Foto del profesional
              </div>
              <div style={{ fontSize: 11.5, color: '#8e8e93', marginTop: 2 }}>
                Opcional. Se mostrará en círculo cuando el cliente elija profesional.
              </div>
            </div>

            <input
              ref={createPhotoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleCreatePhotoChange}
              style={{ display: 'none' }}
            />

            <button
              type="button"
              onClick={() => createPhotoInputRef.current?.click()}
              style={{
                padding: '9px 12px',
                borderRadius: 11,
                border: '0.5px solid #d0d0d5',
                background: '#fff',
                color: '#0071e3',
                fontSize: 12,
                fontWeight: 850,
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              {form.photoUrl ? 'Cambiar foto' : 'Agregar foto'}
            </button>

            {form.photoUrl && (
              <button
                type="button"
                onClick={() => {
                  setForm((current) => ({ ...current, photoUrl: '' }));
                  if (createPhotoInputRef.current) createPhotoInputRef.current.value = '';
                }}
                style={{
                  padding: '9px 12px',
                  borderRadius: 11,
                  border: '0.5px solid #d0d0d5',
                  background: '#fff',
                  color: '#ff453a',
                  fontSize: 12,
                  fontWeight: 850,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                }}
              >
                Quitar
              </button>
            )}
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
          <div style={{ textAlign: 'center', color: '#aeaeb2', padding: 28 }}>Todavía no agregaste profesionales adicionales.</div>
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
                    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1.2fr', gap: 10, marginBottom: 10 }}>
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
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: 12,
                        marginBottom: 12,
                        borderRadius: 14,
                        background: '#fff',
                        border: '0.5px solid #e2e2e8',
                        flexWrap: 'wrap',
                      }}
                    >
                      {editing.photoUrl && (
                        <img
                          src={editing.photoUrl}
                          alt="Foto del profesional"
                          style={{
                            width: 52,
                            height: 52,
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '1px solid #e1e4e8',
                            background: '#fff',
                          }}
                        />
                      )}

                      <div style={{ flex: 1, minWidth: 150 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 850, color: '#1a1a1a' }}>
                          Foto del profesional
                        </div>
                        <div style={{ fontSize: 11.5, color: '#8e8e93', marginTop: 2 }}>
                          Opcional e independiente de la foto del profesional principal.
                        </div>
                      </div>

                      <input
                        ref={editPhotoInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleEditPhotoChange}
                        style={{ display: 'none' }}
                      />

                      <button
                        type="button"
                        onClick={() => editPhotoInputRef.current?.click()}
                        style={{
                          padding: '9px 12px',
                          borderRadius: 11,
                          border: '0.5px solid #d0d0d5',
                          background: '#fff',
                          color: '#0071e3',
                          fontSize: 12,
                          fontWeight: 850,
                          fontFamily: 'inherit',
                          cursor: 'pointer',
                        }}
                      >
                        {editing.photoUrl ? 'Cambiar foto' : 'Agregar foto'}
                      </button>

                      {editing.photoUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditing((current) => ({ ...current, photoUrl: '' }));
                            if (editPhotoInputRef.current) editPhotoInputRef.current.value = '';
                          }}
                          style={{
                            padding: '9px 12px',
                            borderRadius: 11,
                            border: '0.5px solid #d0d0d5',
                            background: '#fff',
                            color: '#ff453a',
                            fontSize: 12,
                            fontWeight: 850,
                            fontFamily: 'inherit',
                            cursor: 'pointer',
                          }}
                        >
                          Quitar
                        </button>
                      )}
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {member.photoUrl ? (
                            <img
                              src={member.photoUrl}
                              alt={member.name}
                              style={{
                                width: 42,
                                height: 42,
                                borderRadius: '50%',
                                objectFit: 'cover',
                                flex: '0 0 auto',
                                border: '1px solid #e1e4e8',
                                background: '#fff',
                              }}
                            />
                          ) : (
                            <span style={{ width: 12, height: 12, borderRadius: 99, background: member.color, display: 'inline-block' }} />
                          )}
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
              ? `Configurando horarios base de ${selectedStaff.name}.`
              : 'Seleccioná un profesional adicional para configurar sus horarios.'}
          </div>
        </div>

        {!selectedStaffId ? (
          <div style={{ textAlign: 'center', color: '#aeaeb2', padding: 28 }}>
            El dueño principal configura sus horarios en Disponibilidad. Agregá un profesional adicional para editar horarios desde acá.
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
          duration_minutes: Number(form.durationMinutes),
          duration: Number(form.durationMinutes),
          price: form.price === '' ? null : Number(form.price),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'No se pudo crear el servicio.');
      } else {
        window.dispatchEvent(new Event('tuagendaya:setup-updated'));
      setMessage('Servicio creado correctamente.');
        resetForm();

        if (Array.isArray(data.services)) {
          setServices(data.services.map(normalizeService));
        } else if (data.service) {
          setServices((current) => {
            const created = normalizeService(data.service);
            const withoutDuplicate = current.filter((service) => String(service.id) !== String(created.id));
            return [created, ...withoutDuplicate];
          });
        } else {
          fetchServices();
        }
      }
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (service) => {
    const serviceId = service?.id ?? service?.serviceId ?? service?.service_id ?? service?.professional_service_id;

    if (serviceId === null || serviceId === undefined || serviceId === '') {
      setError('Actualizá la página e intentá editar nuevamente.');
      return;
    }

    setEditingId(String(serviceId));
    setEditing({
      name: service.name || '',
      description: service.description || '',
      durationMinutes: service.durationMinutes || 30,
      price: service.price ?? '',
      isActive: Boolean(service.isActive),
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
          duration_minutes: Number(editing.durationMinutes),
          duration: Number(editing.durationMinutes),
          price: editing.price === '' ? null : Number(editing.price),
          isActive: Boolean(editing.isActive),
          is_active: Boolean(editing.isActive),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'No se pudo actualizar el servicio.');
      } else {
        window.dispatchEvent(new Event('tuagendaya:setup-updated'));
      setMessage('Servicio actualizado correctamente.');
        cancelEditing();

        if (Array.isArray(data.services)) {
          setServices(data.services.map(normalizeService));
        } else if (data.service) {
          const updated = normalizeService(data.service);
          setServices((current) => current.map((service) => String(service.id) === String(updated.id) ? updated : service));
        } else {
          fetchServices();
        }
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
        window.dispatchEvent(new Event('tuagendaya:setup-updated'));
      setMessage('Servicio eliminado correctamente.');

        if (Array.isArray(data.services)) {
          setServices(data.services.map(normalizeService));
        } else {
          setServices((current) => current.filter((service) => String(service.id) !== String(serviceId)));
        }
      }
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setSaving(false);
    }
  };

  const visibleServices = services
    .map((service, index) => {
      const serviceId = service.id ?? service.serviceId ?? service.service_id ?? service.professional_service_id;
      return {
        ...service,
        id: serviceId,
        _uiKey: String(serviceId ?? `service-${index}`),
      };
    })
    .filter((service) => String(service.name || '').trim());

  return (
    <div className="services-mobile-section" style={{ background: '#fff', borderRadius: 20, padding: '20px 24px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
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
      ) : visibleServices.length === 0 ? null : (
        visibleServices.map((service) => {
          const serviceId = service.id;
          const isEditing = editingId !== null && editingId !== undefined && serviceId !== null && serviceId !== undefined && serviceId !== '' && String(editingId) === String(serviceId);

          return (
            <div
              key={service._uiKey}
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
                      onClick={() => saveEditing(serviceId)}
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

                    <div style={{ fontSize: 11, fontWeight: 800, color: service.isActive ? '#188038' : '#ff453a', background: service.isActive ? '#edfff3' : '#fff2f2', padding: '6px 12px', borderRadius: 999, minHeight: 24, lineHeight: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start', whiteSpace: 'nowrap', boxSizing: 'border-box' }}>
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
                      onClick={() => deleteService(serviceId)}
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
    publicProfileImageUrl:
      item.publicProfileImageUrl ?? item.public_profile_image_url ?? '',
    public_profile_image_url:
      item.public_profile_image_url ?? item.publicProfileImageUrl ?? '',
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


function getProfileCompletionInfo(form, professional = {}) {
  const logoValue = form?.logoUrl || professional?.logoUrl || professional?.logo_url || '';
  const items = [
    { key: 'businessName', label: 'Nombre', done: Boolean(String(form?.businessName || '').trim()) },
    { key: 'phone', label: 'Teléfono', done: Boolean(String(form?.phone || '').trim()) },
    { key: 'address', label: 'Dirección', done: Boolean(String(form?.address || '').trim()) },
    { key: 'logo', label: 'Logo', done: Boolean(String(logoValue || '').trim()) },
    { key: 'link', label: 'Link', done: Boolean(String(professional?.slug || '').trim()) },
  ];

  const completed = items.filter((item) => item.done).length;
  const percent = Math.round((completed / items.length) * 100);
  const missing = items.filter((item) => !item.done).map((item) => item.label);

  return {
    items,
    completed,
    total: items.length,
    percent,
    complete: completed === items.length,
    missing,
  };
}

function ProfileCompletionCard({ form, professional }) {
  const info = getProfileCompletionInfo(form, professional);

  return (
    <div className="profile-completion-card" style={{ background: info.complete ? '#edfff3' : '#fffaf2', border: `1px solid ${info.complete ? '#b7f5c8' : '#ffe2b8'}`, borderRadius: 22, padding: 16, marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ color: info.complete ? '#188038' : '#b26a00', fontSize: 13, fontWeight: 950, marginBottom: 4 }}>
            {info.complete ? 'Perfil completo' : 'Perfil incompleto'}
          </div>
          <div style={{ color: '#6e6e73', fontSize: 12.5, fontWeight: 750, lineHeight: 1.35 }}>
            {info.complete ? 'Tu negocio tiene los datos principales cargados.' : `Falta: ${info.missing.join(', ') || 'datos del negocio'}.`}
          </div>
        </div>

        <div style={{ textAlign: 'right', flex: '0 0 auto' }}>
          <div style={{ color: info.complete ? '#188038' : '#b26a00', fontSize: 22, lineHeight: 1, fontWeight: 950 }}>
            {info.percent}%
          </div>
          <div style={{ color: '#8e8e93', fontSize: 11, fontWeight: 850, marginTop: 4 }}>
            {info.completed}/{info.total}
          </div>
        </div>
      </div>

      <div style={{ height: 7, borderRadius: 999, background: '#e5e5ea', overflow: 'hidden', marginBottom: 12 }}>
        <div style={{ width: `${info.percent}%`, height: '100%', background: info.complete ? '#188038' : '#ff9f0a', borderRadius: 999 }} />
      </div>

      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
        {info.items.map((item) => (
          <span
            key={item.key}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              borderRadius: 999,
              padding: '6px 9px',
              background: item.done ? '#fff' : '#f2f2f7',
              color: item.done ? '#188038' : '#8e8e93',
              fontSize: 11.5,
              fontWeight: 900,
            }}
          >
            <span>{item.done ? '✓' : '•'}</span>
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function ProfilePublicPreviewCard({ form, publicLink, copyPublicLinkFromProfile }) {
  const logoUrl = form?.logoUrl || '';
  const businessName = String(form?.businessName || '').trim() || 'Nombre del negocio';
  const address = String(form?.address || '').trim();

  return (
    <div className="profile-public-preview-card" style={{ background: '#f8fafc', border: '0.5px solid #e5e7eb', borderRadius: 22, padding: 16, marginBottom: 16 }}>
      <div style={{ fontSize: 12, color: '#8e8e93', fontWeight: 900, marginBottom: 10 }}>
        Vista previa pública
      </div>

      <div style={{ background: '#fff', borderRadius: 20, padding: 16, border: '0.5px solid #ececf1' }}>
        <div style={{ display: 'grid', gridTemplateColumns: logoUrl ? 'auto minmax(0, 1fr)' : '1fr', gap: 12, alignItems: 'center', marginBottom: 12 }}>
          {logoUrl && (
            <div style={{ width: 74, height: 54, borderRadius: 16, background: '#f2f2f7', border: '0.5px solid #e5e5ea', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
              <img src={logoUrl} alt="Logo del negocio" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8, boxSizing: 'border-box' }} />
            </div>
          )}

          <div style={{ minWidth: 0 }}>
            <div style={{ color: '#1a1a1a', fontSize: 18, fontWeight: 950, lineHeight: 1.05, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {businessName}
            </div>
            <div style={{ color: '#6e6e73', fontSize: 12.5, fontWeight: 700, marginTop: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {address || 'Dirección del negocio'}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 8, alignItems: 'center', background: '#f5f5f7', borderRadius: 15, padding: '10px 11px' }}>
          <div style={{ minWidth: 0, color: publicLink ? '#0071e3' : '#8e8e93', fontSize: 12.5, fontWeight: 850, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {publicLink || 'Link público pendiente'}
          </div>
          <button
            type="button"
            onClick={copyPublicLinkFromProfile}
            disabled={!publicLink}
            style={{ border: 'none', background: publicLink ? '#0071e3' : '#d1d1d6', color: '#fff', borderRadius: 11, padding: '8px 10px', fontFamily: 'inherit', fontSize: 12, fontWeight: 900, cursor: publicLink ? 'pointer' : 'not-allowed' }}
          >
            Copiar
          </button>
        </div>
      </div>
    </div>
  );
}


function BusinessProfileSection({ professional, onProfileUpdated }) {
  const fileInputRef = useRef(null);
  const publicProfileImageInputRef = useRef(null);

  const [form, setForm] = useState({
    businessName: professional?.businessName || professional?.business_name || '',
    phone: professional?.phone || '',
    address: professional?.address || '',
    logoUrl: professional?.logoUrl || professional?.logo_url || '',
    publicProfileImageUrl:
      professional?.publicProfileImageUrl ||
      professional?.public_profile_image_url ||
      '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [previewLogoMode, setPreviewLogoMode] = useState('square');
  const [planBookings, setPlanBookings] = useState([]);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [billingInfo, setBillingInfo] = useState(null);
  const [billingLoading, setBillingLoading] = useState(true);
  const [billingActionLoading, setBillingActionLoading] = useState('');
  const [paymentSyncLoading, setPaymentSyncLoading] = useState(false);
  const [showTransferDetails, setShowTransferDetails] = useState(false);
  const [transferNotifyLoading, setTransferNotifyLoading] = useState(false);
  const [profilePushStatus, setProfilePushStatus] = useState('checking');
  const [profilePushMessage, setProfilePushMessage] = useState('');
  const [profilePushLoading, setProfilePushLoading] = useState(false);
  const [publicPhotoCrop, setPublicPhotoCrop] = useState(null);
  const [publicPhotoZoom, setPublicPhotoZoom] = useState(1);
  const [publicPhotoOffset, setPublicPhotoOffset] = useState({ x: 0, y: 0 });
  const publicPhotoDragRef = useRef(null);

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
            publicProfileImageUrl: normalized.publicProfileImageUrl || '',
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

  const fetchBillingInfo = () => {
    if (!token) {
      setBillingLoading(false);
      return;
    }

    setBillingLoading(true);

    fetch(`${API_BASE}/payments/me/plan`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setBillingInfo(data.plan || data || null);
      })
      .catch(() => {
        setBillingInfo(null);
      })
      .finally(() => setBillingLoading(false));
  };

  const syncMercadoPagoReturn = async () => {
    const params = new URLSearchParams(window.location.search || '');
    const paymentStatus = params.get('payment') || params.get('collection_status') || params.get('status');
    const paymentId = params.get('payment_id') || params.get('collection_id');

    if (!paymentId || paymentStatus !== 'success') {
      return;
    }

    localStorage.setItem('tuagendaya_pending_mp_payment_id', paymentId);

    setPaymentSyncLoading(true);
    setMessage('Confirmando pago con Mercado Pago...');

    try {
      const response = await fetch(`${API_BASE}/payments/sync-mercadopago-return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.ok === false) {
        throw new Error(data.error || 'No se pudo confirmar el pago automáticamente.');
      }

      if (data.plan) {
        setBillingInfo(data.plan);
      }

      localStorage.removeItem('tuagendaya_pending_mp_payment_id');
      setMessage('Pago confirmado. Tu plan fue actualizado correctamente.');
      window.history.replaceState({}, document.title, window.location.pathname);

      if (token) {
        fetchBillingInfo();
      }
    } catch (syncError) {
      setError(syncError.message || 'El pago se acreditó, pero no pudimos sincronizarlo automáticamente.');
    } finally {
      setPaymentSyncLoading(false);
    }
  };


  useEffect(() => {
    fetchProfile();
    fetchPlanBookings();
    fetchBillingInfo();
    syncMercadoPagoReturn();
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

  const clampPublicPhotoOffset = (offset, zoom = publicPhotoZoom, crop = publicPhotoCrop) => {
    if (!crop) return { x: 0, y: 0 };

    const viewport = 280;
    const baseScale = Math.max(viewport / crop.width, viewport / crop.height);
    const displayedWidth = crop.width * baseScale * zoom;
    const displayedHeight = crop.height * baseScale * zoom;
    const maxX = Math.max(0, (displayedWidth - viewport) / 2);
    const maxY = Math.max(0, (displayedHeight - viewport) / 2);

    return {
      x: Math.max(-maxX, Math.min(maxX, offset.x)),
      y: Math.max(-maxY, Math.min(maxY, offset.y)),
    };
  };

  const closePublicPhotoCrop = () => {
    if (publicPhotoCrop?.url) URL.revokeObjectURL(publicPhotoCrop.url);
    setPublicPhotoCrop(null);
    setPublicPhotoZoom(1);
    setPublicPhotoOffset({ x: 0, y: 0 });
    publicPhotoDragRef.current = null;

    if (publicProfileImageInputRef.current) {
      publicProfileImageInputRef.current.value = '';
    }
  };

  const handlePublicProfileImageFileChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setMessage('');
    setError('');

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      setError('La foto pública debe ser PNG, JPG o WebP.');
      event.target.value = '';
      return;
    }

    const maxSizeBytes = 48 * 1024 * 1024;

    if (file.size > maxSizeBytes) {
      setError('La foto pública no puede pesar más de 48 MB.');
      event.target.value = '';
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      setPublicPhotoCrop({
        url: objectUrl,
        width: image.naturalWidth || image.width,
        height: image.naturalHeight || image.height,
        name: file.name,
      });
      setPublicPhotoZoom(1);
      setPublicPhotoOffset({ x: 0, y: 0 });
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setError('No se pudo abrir la foto pública. Probá con otra imagen.');
      event.target.value = '';
    };

    image.src = objectUrl;
  };

  const handlePublicPhotoZoomChange = (event) => {
    const nextZoom = Number(event.target.value);
    setPublicPhotoZoom(nextZoom);
    setPublicPhotoOffset((current) => clampPublicPhotoOffset(current, nextZoom));
  };

  const handlePublicPhotoPointerDown = (event) => {
    if (!publicPhotoCrop) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    publicPhotoDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: publicPhotoOffset.x,
      originY: publicPhotoOffset.y,
    };
  };

  const handlePublicPhotoPointerMove = (event) => {
    const drag = publicPhotoDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    setPublicPhotoOffset(
      clampPublicPhotoOffset({
        x: drag.originX + (event.clientX - drag.startX),
        y: drag.originY + (event.clientY - drag.startY),
      })
    );
  };

  const handlePublicPhotoPointerEnd = (event) => {
    if (publicPhotoDragRef.current?.pointerId === event.pointerId) {
      publicPhotoDragRef.current = null;
    }
  };

  const applyPublicPhotoCrop = async () => {
    if (!publicPhotoCrop) return;

    setError('');

    try {
      const image = new Image();
      image.src = publicPhotoCrop.url;
      await image.decode();

      // La foto original puede pesar hasta 48 MB, pero nunca se envía así al servidor.
      // Guardamos un recorte cuadrado liviano, suficiente para la foto circular del perfil.
      const outputSize = 720;
      const viewport = 280;
      const baseScale = Math.max(viewport / publicPhotoCrop.width, viewport / publicPhotoCrop.height);
      const displayScale = baseScale * publicPhotoZoom;
      const outputScale = outputSize / viewport;
      const displayedWidth = publicPhotoCrop.width * displayScale;
      const displayedHeight = publicPhotoCrop.height * displayScale;

      const canvas = document.createElement('canvas');
      canvas.width = outputSize;
      canvas.height = outputSize;
      const context = canvas.getContext('2d');

      if (!context) throw new Error('canvas-unavailable');

      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, outputSize, outputSize);
      context.drawImage(
        image,
        ((viewport - displayedWidth) / 2 + publicPhotoOffset.x) * outputScale,
        ((viewport - displayedHeight) / 2 + publicPhotoOffset.y) * outputScale,
        displayedWidth * outputScale,
        displayedHeight * outputScale
      );

      const canvasToBlob = (quality) =>
        new Promise((resolve, reject) => {
          canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error('image-compression-failed'))),
            'image/jpeg',
            quality
          );
        });

      // Intentamos mantener el archivo final por debajo de ~600 KB.
      let quality = 0.78;
      let optimizedBlob = await canvasToBlob(quality);
      while (optimizedBlob.size > 600 * 1024 && quality > 0.48) {
        quality = Math.max(0.48, quality - 0.08);
        optimizedBlob = await canvasToBlob(quality);
      }

      const optimizedDataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('image-read-failed'));
        reader.readAsDataURL(optimizedBlob);
      });

      if (!optimizedDataUrl.startsWith('data:image/jpeg;base64,')) {
        throw new Error('image-output-invalid');
      }

      setForm((current) => ({
        ...current,
        publicProfileImageUrl: optimizedDataUrl,
      }));
      setMessage('Foto encuadrada y optimizada. Guardá el perfil para aplicar el cambio.');
      closePublicPhotoCrop();
    } catch (cropError) {
      console.error('Error al encuadrar la foto pública:', cropError);
      setError('No se pudo procesar la foto. Probá con otra imagen.');
    }
  };

  const clearPublicProfileImage = () => {
    setForm((current) => ({
      ...current,
      publicProfileImageUrl: '',
    }));
    setMessage('Foto pública quitada. Guardá el perfil para aplicar el cambio.');

    if (publicProfileImageInputRef.current) {
      publicProfileImageInputRef.current.value = '';
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

    if (!isValidLogoValue(form.publicProfileImageUrl)) {
      setError('La foto pública debe ser una URL válida o una imagen cargada desde archivo.');
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
          publicProfileImageUrl: form.publicProfileImageUrl.trim(),
        }),
      });

      const responseText = await res.text();
      let data = {};

      if (responseText) {
        try {
          data = JSON.parse(responseText);
        } catch {
          data = {};
        }
      }

      if (!res.ok) {
        const serverMessage = data.error || data.message;
        if (serverMessage) {
          setError(serverMessage);
        } else if (res.status === 413) {
          setError('La imagen sigue siendo demasiado pesada para el servidor. Volvé a encuadrarla e intentá nuevamente.');
        } else {
          setError(`No se pudo guardar el perfil (error ${res.status}).`);
        }
      } else {
        const normalized = normalizeProfessionalFromApi(data.professional);
        localStorage.setItem('tuagendaya_professional', JSON.stringify(normalized));
        onProfileUpdated(normalized);
        setMessage('Perfil del negocio guardado correctamente.');
      }
    } catch (saveError) {
      console.error('Error al guardar el perfil:', saveError);
      setError('No se pudo conectar con el servidor. Revisá tu conexión e intentá nuevamente.');
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
  const publicLink = publicSlug ? `https://tuagendaya.com/reservar/${publicSlug}` : '';
  const statusText = professional?.status === 'suspended' ? 'Suspendido' : 'Activo';
  const statusColor = professional?.status === 'suspended' ? '#ff453a' : '#30d158';
  const billingStatus = billingInfo?.paymentStatus || billingInfo?.payment_status || professional?.planPaymentStatus || professional?.plan_payment_status || 'pending';
  const planAmount = Number(billingInfo?.amount || professional?.planPrice || professional?.plan_price || 0) || 0;
  const planCurrency = billingInfo?.currency || professional?.planCurrency || professional?.plan_currency || 'UYU';
  const planExpiresAt = billingInfo?.expiresAt || billingInfo?.expires_at || professional?.planExpiresAt || professional?.plan_expires_at || '';
  const bankInfo = billingInfo?.bankInfo || {};
  const transferReference = billingInfo?.transferReference || billingInfo?.transfer_reference || `TuAgendaYa-${professional?.id || publicSlug || 'plan'}`;
  const transferConcept = billingInfo?.transferConcept || billingInfo?.transfer_concept || `TuAgendaYa plan ${professional?.businessName || professional?.business_name || professional?.name || ''}`.trim();
  const promotion = billingInfo?.promotion || {};
  const promoStage = promotion.stage || 'normal';
  const promoLabel = promotion.label || '';
  const promoDaysLeft = Number(promotion.daysLeft || promotion.days_left || 0);
  const basePlanAmount = Number(billingInfo?.baseAmount || billingInfo?.base_amount || planAmount || 0) || 0;
  const isPromoFree = promoStage === 'free';
  const isPromoDiscount = promoStage === 'discount';
  const billingStatusText = isPromoFree
    ? 'Gratis'
    : isPromoDiscount
      ? '50% descuento'
      : billingStatus === 'paid'
        ? 'Pago'
        : billingStatus === 'overdue'
          ? 'Vencido'
          : billingStatus === 'pending_transfer'
            ? 'Transferencia pendiente'
            : 'Pendiente';
  const billingStatusColor = isPromoFree || isPromoDiscount ? '#0071e3' : billingStatus === 'paid' ? '#188038' : billingStatus === 'overdue' ? '#ff453a' : '#ff9f0a';
  const planExpiresLabel = planExpiresAt ? new Date(planExpiresAt).toLocaleDateString('es-UY') : 'Sin vencimiento cargado';
  const planGraceDays = Number(billingInfo?.graceDays || billingInfo?.grace_days || 5);
  const planExpiresDate = planExpiresAt ? new Date(planExpiresAt) : null;
  const planGraceUntil = planExpiresDate && !Number.isNaN(planExpiresDate.getTime())
    ? new Date(planExpiresDate.getTime() + planGraceDays * 24 * 60 * 60 * 1000)
    : null;
  const planDaysToExpire = planExpiresDate && !Number.isNaN(planExpiresDate.getTime())
    ? Math.ceil((planExpiresDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const planGraceDaysLeft = planGraceUntil
    ? Math.ceil((planGraceUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const shouldShowPlanReminder = isPromoFree || isPromoDiscount || billingStatus !== 'paid' || (planDaysToExpire !== null && planDaysToExpire <= 5);
  const planReminderText = isPromoFree
    ? `Promoción de lanzamiento activa: te quedan ${promoDaysLeft} día${promoDaysLeft === 1 ? '' : 's'} gratis. Después tenés 2 meses con 50% de descuento.`
    : isPromoDiscount
      ? `Promoción de lanzamiento activa: estás pagando con 50% de descuento. Te quedan ${promoDaysLeft} día${promoDaysLeft === 1 ? '' : 's'} de precio promocional.`
      : planDaysToExpire === null
        ? 'Tu plan no tiene vencimiento cargado. Revisá el pago para mantener tu agenda activa.'
        : planDaysToExpire >= 0
          ? `Tu plan vence en ${planDaysToExpire} día${planDaysToExpire === 1 ? '' : 's'}. Luego tenés ${planGraceDays} días de gracia para pagar.`
          : planGraceDaysLeft > 0
            ? `Tu plan venció. Te quedan ${planGraceDaysLeft} día${planGraceDaysLeft === 1 ? '' : 's'} de gracia para pagar antes de pausar las reservas públicas.`
            : 'Tu período de gracia terminó. Tu link público queda pausado hasta regularizar el pago.';

  const copyPublicLinkFromProfile = async () => {
    if (!publicLink) return;

    try {
      await navigator.clipboard.writeText(publicLink);
      setMessage('Link público copiado correctamente.');
    } catch {
      setError('No se pudo copiar el link.');
    }
  };


  const startAutomaticPlanPayment = async () => {
    setBillingActionLoading('automatic');
    setMessage('');
    setError('');

    try {
      const response = await fetch(`${API_BASE}/payments/me/checkout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.checkoutUrl) {
        throw new Error(data.error || 'No se pudo iniciar el pago automático.');
      }

      if (data.paymentId) {
        localStorage.setItem('tuagendaya_pending_plan_payment_id', String(data.paymentId));
      }
      localStorage.setItem('tuagendaya_returning_from_mp', '1');

      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(err.message || 'No se pudo iniciar el pago automático.');
    } finally {
      setBillingActionLoading('');
    }
  };

  const requestTransferPlanPayment = async () => {
    setMessage('');
    setError('');
    setShowTransferDetails((current) => !current);
  };

  const notifyTransferSent = async () => {
    setTransferNotifyLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch(`${API_BASE}/payments/me/transfer-notify`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo avisar la transferencia.');
      }

      setMessage('Aviso enviado. TuAgendaYa recibió la notificación de transferencia.');
      fetchBillingInfo();
    } catch (err) {
      setError(err.message || 'No se pudo avisar la transferencia.');
    } finally {
      setTransferNotifyLoading(false);
    }
  };

  const refreshProfilePushStatus = useCallback(async () => {
    const support = getPushBrowserSupport();

    if (!support.supported) {
      setProfilePushStatus('unsupported');
      setProfilePushMessage('Este navegador no permite notificaciones push web.');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration('/sw.js');

      if (!registration) {
        setProfilePushStatus(Notification.permission === 'denied' ? 'blocked' : 'disabled');
        setProfilePushMessage(Notification.permission === 'denied' ? 'Las notificaciones están bloqueadas en el navegador.' : 'No hay notificaciones activas en este dispositivo.');
        return;
      }

      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        setProfilePushStatus('enabled');
        setProfilePushMessage('Las notificaciones están activas en este dispositivo.');
      } else {
        setProfilePushStatus(Notification.permission === 'denied' ? 'blocked' : 'disabled');
        setProfilePushMessage(Notification.permission === 'denied' ? 'Las notificaciones están bloqueadas en el navegador.' : 'No hay notificaciones activas en este dispositivo.');
      }
    } catch {
      setProfilePushStatus('disabled');
      setProfilePushMessage('No se pudo revisar el estado de las notificaciones.');
    }
  }, []);

  useEffect(() => {
    refreshProfilePushStatus();
  }, [refreshProfilePushStatus]);

  const disableProfilePushNotifications = async () => {
    setProfilePushLoading(true);
    setProfilePushMessage('');

    try {
      const support = getPushBrowserSupport();

      if (!support.supported) {
        setProfilePushStatus('unsupported');
        setProfilePushMessage('Este navegador no permite notificaciones push web.');
        return;
      }

      const registration = await navigator.serviceWorker.getRegistration('/sw.js');

      if (!registration) {
        setProfilePushStatus('disabled');
        setProfilePushMessage('No hay notificaciones activas en este dispositivo.');
        return;
      }

      const subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        setProfilePushStatus('disabled');
        setProfilePushMessage('No hay notificaciones activas en este dispositivo.');
        return;
      }

      await subscription.unsubscribe();
      setProfilePushStatus('disabled');
      setProfilePushMessage('Notificaciones desactivadas en este dispositivo.');
    } catch {
      setProfilePushMessage('No se pudieron desactivar las notificaciones.');
    } finally {
      setProfilePushLoading(false);
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
    <div className="profile-mobile-section" style={{ display: 'grid', gap: 16 }}>
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

        {shouldShowPlanReminder && (
          <div style={{ marginTop: 14, background: planGraceDaysLeft !== null && planGraceDaysLeft <= 0 ? '#fff0f0' : '#fff8ee', border: '0.5px solid #ffe2b8', borderRadius: 18, padding: 14 }}>
            <div style={{ color: planGraceDaysLeft !== null && planGraceDaysLeft <= 0 ? '#ff3b30' : '#b26a00', fontSize: 14, fontWeight: 950, marginBottom: 4 }}>
              {isPromoFree || isPromoDiscount ? 'Promoción de lanzamiento' : 'Recordatorio de pago'}
            </div>
            <div style={{ color: '#6e6e73', fontSize: 12.5, fontWeight: 750, lineHeight: 1.45 }}>
              {planReminderText}
            </div>
          </div>
        )}

        <div id="pago-del-plan" style={{ marginTop: 14, color: '#1a1a1a', fontSize: 16, fontWeight: 950 }}>
          Promoción y pago
        </div>

        {paymentSyncLoading && (
          <div style={{ marginTop: 10, borderRadius: 14, padding: '10px 12px', background: '#eef6ff', border: '0.5px solid #cfe5ff', color: '#0071e3', fontSize: 12.5, fontWeight: 850 }}>
            Confirmando pago con Mercado Pago...
          </div>
        )}

        <div className="plan-payment-card" style={{ marginTop: 8, background: '#fff', border: '0.5px solid #e8e8ed', borderRadius: 18, padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 950, color: '#1a1a1a' }}>Pago del plan</div>
              <div style={{ fontSize: 12.5, color: '#6e6e73', fontWeight: 700, marginTop: 3 }}>
                Acá ves si está gratis, con 50% de descuento o si corresponde pagar.
              </div>
            </div>
            <div style={{ borderRadius: 999, padding: '6px 10px', background: billingStatus === 'paid' ? '#edfff3' : '#fff8ee', color: billingStatusColor, fontSize: 11.5, fontWeight: 950, whiteSpace: 'nowrap' }}>
              {billingLoading ? 'Revisando...' : billingStatusText}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, marginBottom: 12 }}>
            <div style={{ background: '#f7f7fb', borderRadius: 15, padding: 12 }}>
              <div style={{ fontSize: 11, color: '#8e8e93', fontWeight: 850 }}>Monto</div>
              <div style={{ fontSize: 17, color: '#1a1a1a', fontWeight: 950, marginTop: 3 }}>
                {isPromoFree ? 'Gratis' : planAmount > 0 ? `${planCurrency} ${planAmount}` : 'A definir'}
              </div>
              {isPromoDiscount && basePlanAmount > planAmount && (
                <div style={{ fontSize: 11, color: '#8e8e93', fontWeight: 850, marginTop: 3, textDecoration: 'line-through' }}>
                  {planCurrency} {basePlanAmount}
                </div>
              )}
            </div>
            <div style={{ background: '#f7f7fb', borderRadius: 15, padding: 12 }}>
              <div style={{ fontSize: 11, color: '#8e8e93', fontWeight: 850 }}>Vence</div>
              <div style={{ fontSize: 14, color: '#1a1a1a', fontWeight: 950, marginTop: 5 }}>{planExpiresLabel}</div>
            </div>
            <div style={{ background: '#f7f7fb', borderRadius: 15, padding: 12 }}>
              <div style={{ fontSize: 11, color: '#8e8e93', fontWeight: 850 }}>Método</div>
              <div style={{ fontSize: 14, color: '#1a1a1a', fontWeight: 950, marginTop: 5 }}>
                {billingInfo?.billingMethod === 'transfer' ? 'Transferencia' : billingInfo?.billingMethod === 'mercadopago' ? 'Automático' : 'Sin elegir'}
              </div>
            </div>
          </div>

          <div className="plan-payment-actions" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button
              type="button"
              onClick={startAutomaticPlanPayment}
              disabled={billingActionLoading === 'automatic' || isPromoFree}
              style={{ border: 'none', borderRadius: 15, padding: '12px 14px', background: isPromoFree ? '#d1d1d6' : '#0071e3', color: '#fff', fontSize: 13, fontWeight: 950, fontFamily: 'inherit', cursor: (billingActionLoading === 'automatic' || isPromoFree) ? 'not-allowed' : 'pointer' }}
            >
              {isPromoFree ? 'Gratis activo' : billingActionLoading === 'automatic' ? 'Abriendo...' : isPromoDiscount ? 'Pagar con 50%' : 'Pagar automático'}
            </button>
            <button
              type="button"
              onClick={requestTransferPlanPayment}
              style={{ border: '0.5px solid #d0d0d5', borderRadius: 15, padding: '12px 14px', background: '#fff', color: '#0071e3', fontSize: 13, fontWeight: 950, fontFamily: 'inherit', cursor: 'pointer' }}
            >
              {showTransferDetails ? 'Ocultar datos' : 'Ver datos para transferir'}
            </button>
          </div>

          {showTransferDetails && (
            <div style={{ marginTop: 12, background: '#f7f7fb', borderRadius: 16, padding: 14, fontSize: 12.5, color: '#6e6e73', fontWeight: 750, lineHeight: 1.55 }}>
              <div style={{ color: '#1a1a1a', fontSize: 14, fontWeight: 950, marginBottom: 8 }}>Datos para transferir</div>
              {bankInfo.bankName && <div><strong>Banco:</strong> {bankInfo.bankName}</div>}
              {bankInfo.accountType && <div><strong>Tipo:</strong> {bankInfo.accountType}</div>}
              {bankInfo.accountHolder && <div><strong>Titular:</strong> {bankInfo.accountHolder}</div>}
              {bankInfo.accountNumber && <div><strong>Cuenta:</strong> {bankInfo.accountNumber}</div>}
              <div style={{ marginTop: 10, background: '#fff', border: '0.5px solid #e0e0e5', borderRadius: 13, padding: 11 }}>
                <div style={{ color: '#8e8e93', fontSize: 11, fontWeight: 900, marginBottom: 3 }}>Poner en concepto / referencia</div>
                <div style={{ color: '#0071e3', fontSize: 14, fontWeight: 950 }}>{transferReference}</div>
              </div>
              <div style={{ marginTop: 8 }}>
                <strong>Detalle:</strong> {transferConcept}
              </div>
              <div style={{ marginTop: 8, color: '#8e8e93' }}>
                Luego de transferir, tocá el botón para avisar a TuAgendaYa.
              </div>

              <button
                type="button"
                onClick={notifyTransferSent}
                disabled={transferNotifyLoading}
                style={{ width: '100%', marginTop: 12, border: 'none', borderRadius: 15, padding: '12px 14px', background: transferNotifyLoading ? '#aeaeb2' : '#1c1c1e', color: '#fff', fontSize: 13, fontWeight: 950, fontFamily: 'inherit', cursor: transferNotifyLoading ? 'not-allowed' : 'pointer' }}
              >
                {transferNotifyLoading ? 'Enviando aviso...' : 'Ya transferí'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 20, padding: '20px 24px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 19, fontWeight: 950, color: '#1a1a1a', letterSpacing: '-0.01em' }}>Perfil del negocio</div>
          <div style={{ fontSize: 13, color: '#6e6e73', marginTop: 4 }}>
            Configurá cómo se ve tu negocio para tus clientes en la página pública de reservas.
          </div>
        </div>

        <ProfilePublicPreviewCard
          form={form}
          publicLink={publicLink}
          copyPublicLinkFromProfile={copyPublicLinkFromProfile}
        />

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
                placeholder="Ej: 93405195"
              />
            </div>
          </div>

          <label style={smallLabelStyle}>Dirección</label>
          <input
            style={{ ...inputStyle, marginBottom: 12 }}
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Ej: Av. Italia 1234, Montevideo"
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
                  Recomendado: PNG o JPG horizontal, fondo limpio y peso menor a 1 MB. Este logo aparecerá en la reserva pública.
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

          {publicPhotoCrop && (
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Encuadrar foto pública"
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 99999,
                background: 'rgba(0, 0, 0, 0.56)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 18,
              }}
            >
              <div
                style={{
                  width: 'min(100%, 390px)',
                  background: '#fff',
                  borderRadius: 24,
                  padding: 18,
                  boxShadow: '0 24px 70px rgba(0,0,0,0.28)',
                }}
              >
                <div style={{ fontSize: 20, fontWeight: 900, color: '#111827', marginBottom: 4 }}>
                  Encuadrar foto
                </div>
                <div style={{ fontSize: 13, color: '#6e6e73', lineHeight: 1.45, marginBottom: 16 }}>
                  Arrastrá la imagen para acomodarla y usá el zoom hasta que quede como querés.
                </div>

                <div
                  onPointerDown={handlePublicPhotoPointerDown}
                  onPointerMove={handlePublicPhotoPointerMove}
                  onPointerUp={handlePublicPhotoPointerEnd}
                  onPointerCancel={handlePublicPhotoPointerEnd}
                  style={{
                    width: 280,
                    height: 280,
                    maxWidth: '100%',
                    margin: '0 auto',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    position: 'relative',
                    background: '#e9eaee',
                    touchAction: 'none',
                    cursor: 'grab',
                    boxShadow: 'inset 0 0 0 2px rgba(0,113,227,0.28)',
                  }}
                >
                  <div
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      left: `calc(50% + ${publicPhotoOffset.x}px)`,
                      top: `calc(50% + ${publicPhotoOffset.y}px)`,
                      width: `${publicPhotoCrop.width * Math.max(280 / publicPhotoCrop.width, 280 / publicPhotoCrop.height) * publicPhotoZoom}px`,
                      height: `${publicPhotoCrop.height * Math.max(280 / publicPhotoCrop.width, 280 / publicPhotoCrop.height) * publicPhotoZoom}px`,
                      transform: 'translate(-50%, -50%)',
                      backgroundImage: `url("${publicPhotoCrop.url}")`,
                      backgroundSize: '100% 100%',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat',
                      userSelect: 'none',
                      pointerEvents: 'none',
                    }}
                  />
                </div>

                <div style={{ marginTop: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 800, color: '#6e6e73', marginBottom: 7 }}>
                    <span>Zoom</span>
                    <span>{Math.round(publicPhotoZoom * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.01"
                    value={publicPhotoZoom}
                    onChange={handlePublicPhotoZoomChange}
                    style={{ width: '100%', accentColor: '#0071e3' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 18 }}>
                  <button
                    type="button"
                    onClick={closePublicPhotoCrop}
                    style={{
                      minHeight: 46,
                      borderRadius: 14,
                      border: '1px solid #d8d8dd',
                      background: '#fff',
                      color: '#1a1a1a',
                      fontWeight: 800,
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={applyPublicPhotoCrop}
                    style={{
                      minHeight: 46,
                      borderRadius: 14,
                      border: 'none',
                      background: '#0071e3',
                      color: '#fff',
                      fontWeight: 800,
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                    }}
                  >
                    Usar foto
                  </button>
                </div>
              </div>
            </div>
          )}

          <label style={smallLabelStyle}>Foto pública del profesional</label>

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
                gridTemplateColumns: form.publicProfileImageUrl
                  ? 'auto minmax(0, 1fr) auto'
                  : 'minmax(0, 1fr) auto',
                gap: 14,
                alignItems: 'center',
              }}
            >
              {form.publicProfileImageUrl && (
                <img
                  src={form.publicProfileImageUrl}
                  alt="Foto pública del profesional"
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    display: 'block',
                    border: '1px solid #e1e4e8',
                    background: '#fff',
                  }}
                />
              )}

              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#1a1a1a', marginBottom: 4 }}>
                  Imagen que verá el cliente
                </div>
                <div style={{ fontSize: 12, color: '#6e6e73', lineHeight: 1.45 }}>
                  Podés elegir una imagen de hasta 48 MB. Antes de guardarla vas a poder moverla y hacer zoom para encuadrarla; TuAgendaYa la optimiza automáticamente. Es independiente del logo principal del negocio.
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <input
                  ref={publicProfileImageInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handlePublicProfileImageFileChange}
                  style={{ display: 'none' }}
                />

                <button
                  type="button"
                  onClick={() => publicProfileImageInputRef.current?.click()}
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
                  Seleccionar foto
                </button>

                {form.publicProfileImageUrl && (
                  <button
                    type="button"
                    onClick={clearPublicProfileImage}
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
                    Quitar foto
                  </button>
                )}
              </div>
            </div>
          </div>

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

      <div style={{ background: '#fff', borderRadius: 20, padding: '20px 24px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 16, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#1a1a1a' }}>Notificaciones</div>
            <div style={{ fontSize: 13, color: '#6e6e73', marginTop: 5, lineHeight: 1.45 }}>
              {profilePushMessage || 'Gestioná las notificaciones de nuevas reservas en este dispositivo.'}
            </div>
          </div>

          <button
            type="button"
            onClick={disableProfilePushNotifications}
            disabled={profilePushLoading || profilePushStatus !== 'enabled'}
            style={{
              padding: '11px 16px',
              borderRadius: 14,
              border: profilePushStatus === 'enabled' ? 'none' : '0.5px solid #d0d0d5',
              background: profilePushStatus === 'enabled' ? '#ff453a' : '#f2f2f7',
              color: profilePushStatus === 'enabled' ? '#fff' : '#8e8e93',
              fontSize: 13,
              fontWeight: 800,
              fontFamily: 'inherit',
              cursor: profilePushLoading || profilePushStatus !== 'enabled' ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {profilePushLoading ? 'Desactivando...' : 'Desactivar notificaciones'}
          </button>
        </div>
      </div>
    </div>
  );
}




function MinimalCircleCheck({ checked, onChange, disabled = false }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (!disabled && typeof onChange === 'function') {
          onChange(!checked);
        }
      }}
      style={{
        width: 24,
        height: 24,
        borderRadius: 999,
        border: checked ? '1.5px solid #0071e3' : '1.5px solid #c7c7cc',
        background: checked ? '#0071e3' : '#fff',
        color: '#fff',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 13,
        fontWeight: 950,
        lineHeight: 1,
        padding: 0,
        flex: '0 0 auto',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        boxShadow: checked ? '0 4px 10px rgba(0,113,227,0.18)' : 'none',
      }}
      aria-pressed={checked}
    >
      {checked ? '✓' : ''}
    </button>
  );
}

function ProfessionalSettingsSection() {
  const token = localStorage.getItem('tuagendaya_token');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [settings, setSettings] = useState({
    notifyNewBooking: true,
    notifyReminder: true,
    reminderHoursBefore: 2,
    allowClientCancellations: true,
    cancellationLimitMinutes: 0,
    acceptedPaymentMethods: ['cash', 'transfer', 'online'],
  });

  const [mpConnection, setMpConnection] = useState({ connected: false, loading: true, connection: null });
  const [mpConnecting, setMpConnecting] = useState(false);

  const paymentOptions = [
    { value: 'cash', label: 'Efectivo' },
    { value: 'transfer', label: 'Transferencia' },
    { value: 'online', label: 'Pago online' },
  ];

  const loadSettings = useCallback(() => {
    if (!token) return;

    setLoading(true);
    setError('');

    fetch(`${API_BASE}/professionals/me/settings`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => response.json().then((data) => ({ response, data })))
      .then(({ response, data }) => {
        if (!response.ok) {
          throw new Error(data.error || 'No se pudo cargar la configuración.');
        }

        const next = data.settings || data || {};
        const acceptedMethods = normalizeAcceptedPaymentMethodsList(
          next.acceptedPaymentMethods ?? next.accepted_payment_methods ?? ['cash', 'transfer', 'online']
        );

        saveConfiguredPaymentMethodsForCash(acceptedMethods);

        setSettings({
          notifyNewBooking: Boolean(next.notifyNewBooking ?? next.notify_new_booking ?? true),
          notifyReminder: Boolean(next.notifyReminder ?? next.notify_reminder ?? true),
          reminderHoursBefore: 2,
          allowClientCancellations: Boolean(next.allowClientCancellations ?? next.allow_client_cancellations ?? true),
          cancellationLimitMinutes: Number(next.cancellationLimitMinutes ?? next.cancellation_limit_minutes ?? 0) || 0,
          acceptedPaymentMethods: acceptedMethods,
        });
      })
      .catch((err) => setError(err.message || 'No se pudo cargar la configuración.'))
      .finally(() => setLoading(false));
  }, [token]);

  const loadMercadoPagoConnection = useCallback(() => {
    if (!token) return;

    setMpConnection((current) => ({ ...current, loading: true }));

    fetch(`${API_BASE}/payments/mercadopago/connect/status`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => response.json().then((data) => ({ response, data })))
      .then(({ response, data }) => {
        if (!response.ok) {
          throw new Error(data.error || 'No se pudo cargar Mercado Pago.');
        }

        setMpConnection({
          connected: Boolean(data.connected),
          loading: false,
          connection: data.connection || null,
        });
      })
      .catch(() => {
        setMpConnection({ connected: false, loading: false, connection: null });
      });
  }, [token]);

  useEffect(() => {
    loadSettings();
    loadMercadoPagoConnection();
  }, [loadSettings, loadMercadoPagoConnection]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mpConnectionResult = params.get('mp_connection');

    if (mpConnectionResult === 'success') {
      setMessage('Mercado Pago conectado correctamente.');
      window.history.replaceState({}, '', window.location.pathname);
      loadMercadoPagoConnection();
    }

    if (mpConnectionResult === 'error') {
      setError('No se pudo conectar Mercado Pago. Intentá nuevamente.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [loadMercadoPagoConnection]);


  const togglePaymentMethod = (value) => {
    setSettings((current) => {
      const currentMethods = Array.isArray(current.acceptedPaymentMethods) ? current.acceptedPaymentMethods : [];
      const exists = currentMethods.includes(value);
      const nextMethods = exists ? currentMethods.filter((item) => item !== value) : [...currentMethods, value];
      const safeMethods = nextMethods.length > 0 ? nextMethods : currentMethods;
      saveConfiguredPaymentMethodsForCash(safeMethods);
      return { ...current, acceptedPaymentMethods: safeMethods };
    });
  };

  const connectMercadoPago = async () => {
    if (!token || mpConnecting) return;

    setMpConnecting(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch(`${API_BASE}/payments/mercadopago/connect/start`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.url) {
        throw new Error(data.error || 'No se pudo iniciar la conexión con Mercado Pago.');
      }

      window.location.href = data.url;
    } catch (err) {
      setError(err.message || 'No se pudo iniciar la conexión con Mercado Pago.');
      setMpConnecting(false);
    }
  };

  const disconnectMercadoPago = async () => {
    if (!token || mpConnecting) return;

    const confirmed = window.confirm('¿Desconectar Mercado Pago de este profesional?');
    if (!confirmed) return;

    setMpConnecting(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch(`${API_BASE}/payments/mercadopago/connect`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo desconectar Mercado Pago.');
      }

      setMpConnection({ connected: false, loading: false, connection: null });
      setMessage('Mercado Pago desconectado correctamente.');
    } catch (err) {
      setError(err.message || 'No se pudo desconectar Mercado Pago.');
    } finally {
      setMpConnecting(false);
    }
  };

  const saveSettings = async () => {
    if (!token) return;
    setSaving(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch(`${API_BASE}/professionals/me/settings`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notifyNewBooking: settings.notifyNewBooking,
          notifyReminder: settings.notifyReminder,
          reminderHoursBefore: 2,
          allowClientCancellations: settings.allowClientCancellations,
          cancellationLimitMinutes: Number(settings.cancellationLimitMinutes) || 0,
          acceptedPaymentMethods: settings.acceptedPaymentMethods,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar la configuración.');
      const savedSettings = data.settings || {};
      const savedMethods = normalizeAcceptedPaymentMethodsList(
        savedSettings.acceptedPaymentMethods ??
        savedSettings.accepted_payment_methods ??
        settings.acceptedPaymentMethods
      );

      saveConfiguredPaymentMethodsForCash(savedMethods);

      setSettings((current) => ({
        ...current,
        ...savedSettings,
        acceptedPaymentMethods: savedMethods,
        reminderHoursBefore: 2,
      }));

      setMessage('Configuración guardada correctamente.');
    } catch (err) {
      setError(err.message || 'No se pudo guardar la configuración.');
    } finally {
      setSaving(false);
    }
  };

  const sectionStyle = {
    background: '#fff',
    border: '0.5px solid #ececf2',
    borderRadius: 20,
    padding: 16,
    boxShadow: '0 4px 14px rgba(0,0,0,0.035)',
  };

  const sectionHeaderStyle = {
    fontSize: 15,
    fontWeight: 950,
    color: '#1a1a1a',
    letterSpacing: '-0.01em',
    marginBottom: 4,
  };

  const sectionTextStyle = {
    fontSize: 12.5,
    color: '#6e6e73',
    fontWeight: 700,
    lineHeight: 1.4,
    marginBottom: 12,
  };

  const rowStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    padding: '13px 0',
    borderTop: '0.5px solid #f0f0f2',
  };

  const titleStyle = { fontSize: 14, fontWeight: 900, color: '#1a1a1a' };
  const textStyle = { fontSize: 12, color: '#6e6e73', fontWeight: 700, lineHeight: 1.4, marginTop: 3 };

  if (loading) {
    return (
      <div style={{ background: '#fff', borderRadius: 22, padding: 22, boxShadow: '0 1px 8px rgba(0,0,0,0.06)', color: '#8e8e93', fontWeight: 800 }}>
        Cargando ajustes...
      </div>
    );
  }

  return (
    <div className="settings-mobile-section" style={{ background: '#fff', borderRadius: 22, padding: '20px 24px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 19, fontWeight: 950, color: '#1a1a1a', marginBottom: 4, letterSpacing: '-0.01em' }}>Ajustes del negocio</div>
      <div style={{ fontSize: 13, color: '#6e6e73', lineHeight: 1.45, marginBottom: 16, fontWeight: 700 }}>
        Configurá reservas, pagos y avisos sin mezclar opciones.
      </div>

      <div className="settings-cards-grid" style={{ display: 'grid', gap: 12 }}>
        <div className="settings-card" style={sectionStyle}>
          <div style={sectionHeaderStyle}>Notificaciones</div>
          <div style={sectionTextStyle}>Avisos importantes para el profesional.</div>

          <div style={rowStyle}>
            <div>
              <div style={titleStyle}>Nueva reserva</div>
              <div style={textStyle}>Avisar cuando entra una reserva nueva.</div>
            </div>
            <MinimalCircleCheck checked={settings.notifyNewBooking} onChange={(checked) => setSettings({ ...settings, notifyNewBooking: checked })} />
          </div>

          <div style={rowStyle}>
            <div>
              <div style={titleStyle}>Recordatorio 2 horas antes</div>
              <div style={textStyle}>Enviar recordatorio automático antes del turno.</div>
            </div>
            <MinimalCircleCheck checked={settings.notifyReminder} onChange={(checked) => setSettings({ ...settings, notifyReminder: checked, reminderHoursBefore: 2 })} />
          </div>
        </div>

        <div className="settings-card" style={sectionStyle}>
          <div style={sectionHeaderStyle}>Reservas y cancelaciones</div>
          <div style={sectionTextStyle}>Reglas para cuando el cliente confirma o cancela.</div>

          <div style={rowStyle}>
            <div>
              <div style={titleStyle}>Cancelación del cliente</div>
              <div style={textStyle}>Permitir cancelar desde el link de confirmación o WhatsApp.</div>
            </div>
            <MinimalCircleCheck checked={settings.allowClientCancellations} onChange={(checked) => setSettings({ ...settings, allowClientCancellations: checked })} />
          </div>

          <div style={{ ...rowStyle, alignItems: 'flex-start' }}>
            <div>
              <div style={titleStyle}>Límite para cancelar</div>
              <div style={textStyle}>No bloquea reservas nuevas. Solo controla hasta cuándo puede cancelar el cliente.</div>
            </div>
            <select
              value={String(settings.cancellationLimitMinutes)}
              onChange={(event) => setSettings({ ...settings, cancellationLimitMinutes: Number(event.target.value) })}
              disabled={!settings.allowClientCancellations}
              style={{ ...inputStyle, width: 220, marginBottom: 0 }}
            >
              <option value="0">Hasta la hora del turno</option>
              <option value="30">Hasta 30 min antes</option>
              <option value="60">Hasta 1 hora antes</option>
              <option value="120">Hasta 2 horas antes</option>
              <option value="360">Hasta 6 horas antes</option>
              <option value="1440">Hasta 24 horas antes</option>
            </select>
          </div>
        </div>

        <div className="settings-card" style={sectionStyle}>
          <div style={sectionHeaderStyle}>Pagos</div>
          <div style={sectionTextStyle}>Métodos que verá el cliente al reservar y que se usan en caja.</div>

          <div className="settings-payment-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, marginTop: 12 }}>
            {paymentOptions.map((option) => {
              const checked = (settings.acceptedPaymentMethods || []).includes(option.value);
              return (
                <label
                  key={option.value}
                  className={`settings-payment-option ${checked ? 'active' : ''}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    background: checked ? '#eef6ff' : '#f7f7fb',
                    border: checked ? '1px solid rgba(0,113,227,0.30)' : '0.5px solid #ececf2',
                    borderRadius: 16,
                    padding: 13,
                    fontSize: 13,
                    fontWeight: 900,
                    color: checked ? '#0071e3' : '#1a1a1a',
                    cursor: 'pointer',
                  }}
                >
                  <MinimalCircleCheck checked={checked} onChange={() => togglePaymentMethod(option.value)} />
                  <span>{option.label}</span>
                </label>
              );
            })}
          </div>

          {(settings.acceptedPaymentMethods || []).includes('online') && (
            <div
              style={{
                marginTop: 14,
                padding: 14,
                borderRadius: 16,
                background: mpConnection.connected ? '#f0fff5' : '#fff8ee',
                border: mpConnection.connected ? '1px solid rgba(24,128,56,0.18)' : '1px solid rgba(255,159,10,0.18)',
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 950, color: '#1a1a1a', marginBottom: 4 }}>
                Mercado Pago del profesional
              </div>
              <div style={{ fontSize: 12.5, color: '#6e6e73', fontWeight: 700, lineHeight: 1.4, marginBottom: 12 }}>
                Para cobrar Pago online, este profesional debe conectar su propia cuenta. El dinero entra directo a su Mercado Pago.
              </div>

              {mpConnection.loading ? (
                <div style={{ fontSize: 12.5, color: '#8e8e93', fontWeight: 800 }}>Verificando conexión...</div>
              ) : mpConnection.connected ? (
                <div style={{ display: 'grid', gap: 10 }}>
                  <div style={{ fontSize: 13, color: '#188038', fontWeight: 900 }}>
                    Conectado correctamente
                  </div>
                  {mpConnection.connection?.connectedAt && (
                    <div style={{ fontSize: 12, color: '#6e6e73', fontWeight: 700 }}>
                      Conectado: {formatDate(mpConnection.connection.connectedAt)}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={disconnectMercadoPago}
                    disabled={mpConnecting}
                    style={{
                      border: 'none',
                      borderRadius: 14,
                      padding: '11px 13px',
                      background: '#fff',
                      color: '#ff3b30',
                      fontSize: 13,
                      fontWeight: 950,
                      fontFamily: 'inherit',
                      cursor: mpConnecting ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {mpConnecting ? 'Procesando...' : 'Desconectar Mercado Pago'}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={connectMercadoPago}
                  disabled={mpConnecting}
                  style={{
                    width: '100%',
                    border: 'none',
                    borderRadius: 14,
                    padding: '12px 14px',
                    background: mpConnecting ? '#aeaeb2' : '#0071e3',
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 950,
                    fontFamily: 'inherit',
                    cursor: mpConnecting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {mpConnecting ? 'Conectando...' : 'Conectar Mercado Pago'}
                </button>
              )}
            </div>
          )}
        </div>

        <ChangePasswordCard
          title="Contraseña del profesional"
          description="Cambiá la contraseña de acceso a este panel."
          endpoint="/auth/change-password"
          token={token}
        />
      </div>

      {error && <div style={{ marginTop: 12, color: '#ff453a', fontSize: 13, fontWeight: 800 }}>{error}</div>}
      {message && <div style={{ marginTop: 12, color: '#188038', fontSize: 13, fontWeight: 800 }}>{message}</div>}

      <button type="button" onClick={saveSettings} disabled={saving} className="settings-save-button" style={{ width: '100%', marginTop: 16, border: 'none', borderRadius: 16, padding: '14px 16px', background: saving ? '#aeaeb2' : '#0071e3', color: '#fff', fontSize: 15, fontWeight: 950, fontFamily: 'inherit', cursor: saving ? 'not-allowed' : 'pointer', boxShadow: saving ? 'none' : '0 10px 22px rgba(0,113,227,0.22)' }}>
        {saving ? 'Guardando...' : 'Guardar ajustes'}
      </button>
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
    {
      key: 'settings',
      title: 'Ajustes',
      description: 'Notificaciones, cancelaciones del cliente y métodos de pago.',
      action: 'Gestionar ajustes',
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

    if (openPanel === 'settings') {
      return <ProfessionalSettingsSection />;
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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, marginTop: 18 }} className="config-summary-grid">
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
    ? `https://tuagendaya.com/reservar/${professional.slug}`
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
    localStorage.removeItem('tuagendaya_session_persistent');
    onLogout();
  };

  const dashboardTabs = ['reservas', 'clientes', 'caja', 'configuracion', 'perfil'];
  const touchStartRef = useRef(null);

  const handleDashboardTouchStart = (event) => {
    const target = event.target;

    if (
      target?.closest?.('input, textarea, select, button, a, [data-no-swipe="true"]')
    ) {
      touchStartRef.current = null;
      return;
    }

    const touch = event.touches?.[0];
    if (!touch) return;

    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
    };
  };

  const handleDashboardTouchEnd = (event) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;

    if (!start) return;

    const touch = event.changedTouches?.[0];
    if (!touch) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;

    if (Math.abs(deltaX) < 55 || Math.abs(deltaX) < Math.abs(deltaY) * 1.35) {
      return;
    }

    const currentIndex = dashboardTabs.indexOf(activeTab);
    if (currentIndex === -1) return;

    const nextIndex = deltaX < 0
      ? Math.min(currentIndex + 1, dashboardTabs.length - 1)
      : Math.max(currentIndex - 1, 0);

    if (nextIndex !== currentIndex) {
      setActiveTab(dashboardTabs[nextIndex]);
    }
  };

  const tabStyle = (key) => ({
    flex: 1,
    minWidth: 0,
    padding: key === 'configuracion' ? '10px 0' : '10px 4px',
    borderRadius: 18,
    border: activeTab === key ? '0.5px solid rgba(0,113,227,0.18)' : '0.5px solid rgba(0,0,0,0.05)',
    background: activeTab === key ? '#0071e3' : 'rgba(255,255,255,0.74)',
    color: activeTab === key ? '#fff' : '#1a1a1a',
    fontSize: 12,
    fontWeight: 900,
    cursor: 'pointer',
    fontFamily: 'inherit',
    boxShadow: activeTab === key ? '0 8px 18px rgba(0,113,227,0.22)' : '0 1px 8px rgba(0,0,0,0.025)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    whiteSpace: 'nowrap',
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

        .config-tab-icon {
          display: none;
        }

        .config-tab-text {
          display: inline;
        }

        @media (max-width: 720px) {
          .cash-mobile-main-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }

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
            padding: calc(env(safe-area-inset-top, 0px) + 52px) 8px calc(env(safe-area-inset-bottom, 0px) + 178px) !important;
            background: #f2f2f7 !important;
          }

          .dashboard-panel::before {
            content: "";
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: calc(env(safe-area-inset-top, 0px) + 22px);
            background: linear-gradient(180deg, #f2f2f7 0%, rgba(242,242,247,0.96) 72%, rgba(242,242,247,0) 100%);
            z-index: 999;
            pointer-events: none;
          }

          .dashboard-content-swipe {
            padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 150px) !important;
            scroll-padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 160px) !important;
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
            grid-template-columns: 1fr 1fr 1fr 54px 1fr !important;
            align-items: center !important;
            gap: 6px !important;
            padding: 8px !important;
            margin: 0 !important;
            border-radius: 24px !important;
            background: rgba(255, 255, 255, 0.88) !important;
            border: 0.5px solid rgba(255,255,255,0.72) !important;
            box-shadow: 0 12px 34px rgba(0,0,0,0.18) !important;
            backdrop-filter: blur(22px);
            -webkit-backdrop-filter: blur(22px);
            overflow: hidden !important;
          }

          .dashboard-tabs button {
            width: 100% !important;
            min-width: 0 !important;
            min-height: 46px !important;
            padding: 10px 4px !important;
            border-radius: 18px !important;
            font-size: 11.5px !important;
            line-height: 1.1 !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }

          .dashboard-tabs button[aria-label="Configuración"] {
            min-width: 0 !important;
            width: 100% !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
          }

          .dashboard-tabs .config-tab-text {
            display: none !important;
          }

          .dashboard-tabs .config-tab-icon {
            display: block !important;
          }

          .dashboard-content-swipe {
            touch-action: pan-y;
          }

          .dashboard-panel input[type="number"] {
            appearance: textfield;
          }

          .dashboard-panel input[type="number"]::-webkit-outer-spin-button,
          .dashboard-panel input[type="number"]::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
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

          /* Almanaque TuAgendaYa: conservar la misma estructura compacta en móvil */
          .dashboard-panel .tay-almanac {
            width: min(100%, 326px) !important;
            max-width: 326px !important;
            margin-left: auto !important;
            margin-right: auto !important;
            padding: 9px !important;
            border-radius: 16px !important;
            overflow: visible !important;
          }

          .dashboard-panel .tay-almanac-header {
            display: grid !important;
            grid-template-columns: 30px minmax(0, 1fr) 30px !important;
            align-items: center !important;
            gap: 6px !important;
          }

          .dashboard-panel .tay-almanac-weekdays,
          .dashboard-panel .tay-almanac-days {
            display: grid !important;
            grid-template-columns: repeat(7, minmax(0, 1fr)) !important;
            gap: 3px !important;
          }

          .dashboard-panel .tay-almanac-nav {
            width: 30px !important;
            height: 30px !important;
            min-height: 30px !important;
            padding: 0 !important;
            border-radius: 9px !important;
          }

          .dashboard-panel .tay-almanac-day {
            width: 100% !important;
            height: auto !important;
            min-height: 28px !important;
            aspect-ratio: 1 / 1 !important;
            padding: 0 !important;
            border-radius: 9px !important;
            font-size: 10.5px !important;
            line-height: 1 !important;
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

          .reservation-card {
            border-radius: 22px !important;
            margin-bottom: 12px !important;
            box-shadow: 0 6px 20px rgba(0,0,0,0.055) !important;
          }

          .reservation-card-button {
            grid-template-columns: 78px minmax(0, 1fr) !important;
            gap: 10px !important;
            align-items: start !important;
            padding: 14px !important;
          }

          .reservation-time-box {
            min-height: 68px !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
            border-radius: 18px !important;
            background: #f2f7ff !important;
            color: #0071e3 !important;
          }

          .reservation-time-box > div:first-child {
            font-size: 18px !important;
            font-weight: 950 !important;
            letter-spacing: -0.02em !important;
          }

          .reservation-main-info {
            padding-top: 2px !important;
          }

          .reservation-main-info > div:first-child > div {
            font-size: 15px !important;
            letter-spacing: -0.01em !important;
          }

          .reservation-status-group {
            grid-column: 1 / -1 !important;
            margin-left: 88px !important;
            margin-top: -26px !important;
            flex-wrap: wrap !important;
            justify-content: flex-start !important;
            gap: 6px !important;
            padding-right: 24px !important;
          }

          .reservation-status-group span {
            font-size: 10.5px !important;
            padding: 5px 8px !important;
          }

          .reservation-status-group span:last-child {
            position: absolute !important;
            right: 16px !important;
            margin-top: 2px !important;
          }

          .reservation-detail-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 8px !important;
          }

          .reservation-action-grid {
            grid-template-columns: 1fr !important;
            gap: 8px !important;
          }

          .reservation-action-grid button {
            min-height: 46px !important;
            border-radius: 15px !important;
            font-size: 13.5px !important;
            font-weight: 900 !important;
          }


          .services-mobile-section {
            display: grid !important;
            gap: 14px !important;
          }

          .services-mobile-section > div {
            border-radius: 24px !important;
            overflow: visible !important;
          }

          .services-mobile-section h2,
          .services-mobile-section h3 {
            letter-spacing: -0.01em !important;
            padding-left: 2px !important;
            overflow: visible !important;
          }

          .services-mobile-section input,
          .services-mobile-section select,
          .services-mobile-section textarea {
            border-radius: 15px !important;
            min-height: 46px !important;
            font-size: 16px !important;
          }

          .services-mobile-section button {
            border-radius: 15px !important;
            min-height: 44px !important;
            touch-action: manipulation !important;
          }

          .services-mobile-section div[style*="grid-template-columns"] {
            grid-template-columns: 1fr !important;
          }

          .services-mobile-section label {
            font-size: 12.5px !important;
          }

          .services-mobile-section [style*="repeat(auto-fit"] {
            grid-template-columns: 1fr !important;
          }

          .services-mobile-section [style*="repeat(2"] {
            grid-template-columns: 1fr !important;
          }

          .services-mobile-section [style*="repeat(3"] {
            grid-template-columns: 1fr !important;
          }

          .services-mobile-section [style*="minmax(145px"] {
            grid-template-columns: 1fr !important;
          }

          .services-mobile-section [style*="box-shadow"] {
            box-shadow: 0 6px 22px rgba(0,0,0,0.055) !important;
          }

          .services-mobile-section [style*="Activo"],
          .services-mobile-section [style*="Inactivo"] {
            white-space: nowrap !important;
          }


          .availability-mobile-section {
            display: grid !important;
            gap: 14px !important;
          }

          .availability-mobile-section > div {
            border-radius: 24px !important;
            padding: 16px !important;
            overflow: visible !important;
          }

          .availability-mobile-section button {
            min-height: 46px !important;
            border-radius: 16px !important;
            font-weight: 900 !important;
          }

          .availability-mobile-section input,
          .availability-mobile-section select,
          .availability-mobile-section textarea {
            min-height: 46px !important;
            border-radius: 15px !important;
            font-size: 16px !important;
          }

          .availability-mobile-section div[style*="grid-template-columns"] {
            grid-template-columns: 1fr !important;
          }

          .availability-day-card {
            grid-template-columns: 1fr !important;
            gap: 11px !important;
            padding: 14px !important;
            border-radius: 20px !important;
            box-shadow: 0 6px 18px rgba(0,0,0,0.045) !important;
          }

          .availability-day-toggle {
            justify-content: space-between !important;
            width: 100% !important;
            background: #fff !important;
            border: 0.5px solid #ececf2 !important;
            border-radius: 16px !important;
            padding: 11px 12px !important;
          }

          .availability-day-toggle input {
            width: 20px !important;
            height: 20px !important;
            min-height: 20px !important;
            flex: 0 0 auto !important;
          }

          .availability-day-toggle span:nth-child(2) {
            flex: 1 !important;
            font-size: 14px !important;
            font-weight: 950 !important;
          }

          .availability-day-status {
            flex: 0 0 auto !important;
            border-radius: 999px !important;
            padding: 5px 9px !important;
            background: #f2f7ff !important;
            color: #0071e3 !important;
            font-size: 11px !important;
            font-weight: 950 !important;
          }

          .availability-time-field {
            min-width: 0 !important;
          }

          .availability-mobile-section [style*="1.2fr 1fr 1fr"],
          .availability-mobile-section [style*="1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }

          .availability-mobile-section label {
            font-size: 12.5px !important;
          }


          .profile-mobile-section {
            display: grid !important;
            gap: 14px !important;
          }

          .profile-mobile-section > div {
            border-radius: 24px !important;
            padding: 16px !important;
            overflow: visible !important;
          }

          .profile-mobile-section input,
          .profile-mobile-section textarea,
          .profile-mobile-section select {
            min-height: 46px !important;
            border-radius: 15px !important;
            font-size: 16px !important;
          }

          .profile-mobile-section button {
            min-height: 46px !important;
            border-radius: 16px !important;
            font-weight: 900 !important;
            touch-action: manipulation !important;
          }

          .profile-mobile-section div[style*="grid-template-columns"] {
            grid-template-columns: 1fr !important;
          }

          .profile-mobile-section label {
            font-size: 12.5px !important;
            font-weight: 850 !important;
          }

          .profile-public-preview-card {
            border-radius: 22px !important;
            padding: 14px !important;
            background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%) !important;
          }

          .profile-public-preview-card button {
            width: 100% !important;
            margin-top: 8px !important;
          }

          .profile-completion-card {
            border-radius: 22px !important;
            padding: 14px !important;
          }

          .profile-mobile-section [style*="Seleccionar archivo"],
          .profile-mobile-section [style*="Quitar logo"] {
            width: 100% !important;
          }

          .profile-mobile-section img {
            max-width: 100% !important;
          }


          .settings-mobile-section {
            padding: 16px !important;
            border-radius: 24px !important;
          }

          .settings-mobile-section .settings-cards-grid {
            gap: 12px !important;
          }

          .settings-mobile-section .settings-card {
            padding: 15px !important;
            border-radius: 22px !important;
          }

          .settings-mobile-section .settings-card > div[style*="13px 0"] {
            align-items: center !important;
          }

          .settings-mobile-section select,
          .settings-mobile-section input {
            min-height: 46px !important;
            border-radius: 15px !important;
            font-size: 16px !important;
          }

          .settings-mobile-section button {
            min-height: 44px !important;
            touch-action: manipulation !important;
          }

          .settings-mobile-section div[style*="grid-template-columns"] {
            grid-template-columns: 1fr !important;
          }

          .settings-mobile-section .settings-payment-grid {
            grid-template-columns: 1fr !important;
          }

          .settings-mobile-section .settings-payment-option {
            min-height: 52px !important;
            border-radius: 18px !important;
          }

          .settings-mobile-section .settings-save-button {
            min-height: 50px !important;
            border-radius: 18px !important;
            font-size: 15.5px !important;
          }


          .agenda-start-notice {
            margin-bottom: 12px !important;
            padding: 14px 15px !important;
            border-radius: 22px !important;
          }

          .agenda-start-notice h2 {
            font-size: 18px !important;
            line-height: 1.15 !important;
          }

          .agenda-start-notice p {
            font-size: 12.5px !important;
            line-height: 1.42 !important;
          }

          .agenda-start-pill {
            min-height: 22px !important;
            padding: 4px 9px !important;
            font-size: 11.5px !important;
            margin-bottom: 7px !important;
          }

          .dashboard-header-card {
            position: relative !important;
          }

          .dashboard-header-card > div:first-child {
            min-width: 0 !important;
          }

          .dashboard-header-card p,
          .dashboard-header-card div {
            word-break: break-word !important;
          }

          .dashboard-business-logo-box {
            height: 62px !important;
            font-size: 12px !important;
            color: #c7c7cc !important;
          }

          .dashboard-tabs {
            transform: translateZ(0);
          }

          .dashboard-tabs button {
            -webkit-tap-highlight-color: transparent;
          }

          .clients-panel-card,
          .settings-mobile-section,
          .services-mobile-section,
          .availability-mobile-section,
          .profile-mobile-section {
            margin-bottom: 12px !important;
          }

          .clients-stats-grid {
            grid-template-columns: 1fr !important;
          }

          .clients-stats-grid > div {
            min-height: 72px !important;
          }

          .reservation-status-group {
            margin-left: 0 !important;
            margin-top: 8px !important;
            padding-right: 0 !important;
          }

          .reservation-status-group span:last-child {
            position: static !important;
            margin-top: 0 !important;
          }

          .reservation-card-button {
            grid-template-columns: 86px minmax(0, 1fr) !important;
          }

          .reservation-main-info {
            min-width: 0 !important;
          }

          .reservation-main-info * {
            max-width: 100% !important;
          }

          .settings-mobile-section .settings-card {
            overflow: visible !important;
          }

          .settings-mobile-section select {
            width: 100% !important;
            max-width: 100% !important;
          }

          .plan-payment-card {
            margin-bottom: 12px !important;
          }

          .dashboard-panel input,
          .dashboard-panel textarea {
            scroll-margin-bottom: calc(env(safe-area-inset-bottom, 0px) + 150px) !important;
          }

          .plan-payment-card {
            border-radius: 20px !important;
            padding: 13px !important;
          }

          .plan-payment-card div[style*="repeat(3"] {
            grid-template-columns: 1fr !important;
          }

          .plan-payment-actions {
            grid-template-columns: 1fr !important;
          }

          .plan-payment-actions button {
            min-height: 48px !important;
            border-radius: 17px !important;
          }

          .clients-summary-button {
            border-radius: 22px !important;
            padding: 15px !important;
          }

          .clients-panel-card {
            border-radius: 24px !important;
            padding: 16px !important;
          }

          .clients-panel-header {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 12px !important;
          }

          .clients-export-button {
            width: 100% !important;
            min-height: 42px !important;
            border-radius: 15px !important;
          }

          .clients-stats-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 8px !important;
          }

          .clients-stats-grid > div {
            border-radius: 17px !important;
            padding: 11px !important;
          }

          .clients-search-input {
            border-radius: 18px !important;
            padding: 14px 15px !important;
            background: #f5f5f7 !important;
            border: 0.5px solid #ececf2 !important;
            margin-bottom: 14px !important;
          }

          .clients-list {
            gap: 12px !important;
          }

          .client-card {
            border-radius: 22px !important;
            box-shadow: 0 6px 20px rgba(0,0,0,0.055) !important;
          }

          .client-card-button {
            grid-template-columns: 52px minmax(0, 1fr) !important;
            gap: 11px !important;
            align-items: start !important;
            padding: 14px !important;
          }

          .client-avatar {
            width: 52px !important;
            height: 52px !important;
            border-radius: 18px !important;
            background: #f2f7ff !important;
            font-size: 18px !important;
          }

          .client-main-info > div:first-child {
            font-size: 15.5px !important;
            letter-spacing: -0.01em !important;
          }

          .client-type-group {
            grid-column: 1 / -1 !important;
            margin-left: 63px !important;
            margin-top: -8px !important;
            flex-wrap: wrap !important;
            justify-content: space-between !important;
          }

          .client-type-group span:first-child {
            font-size: 10.5px !important;
            padding: 5px 8px !important;
          }

          .client-expanded {
            padding: 0 14px 14px 14px !important;
          }

          .client-expanded-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 8px !important;
          }

          .client-whatsapp-button {
            display: flex !important;
            width: 100% !important;
            min-height: 46px !important;
            border-radius: 16px !important;
            margin-bottom: 12px !important;
          }

          .client-notes-box {
            border-radius: 18px !important;
            padding: 13px !important;
          }

          .client-notes-box textarea {
            min-height: 104px !important;
            border-radius: 16px !important;
          }

          .client-note-footer {
            display: grid !important;
            grid-template-columns: 1fr !important;
            align-items: stretch !important;
            gap: 8px !important;
          }

          .client-note-footer button {
            width: 100% !important;
            min-height: 44px !important;
            border-radius: 15px !important;
          }

          .client-history-row {
            grid-template-columns: 1fr !important;
            gap: 8px !important;
            border-radius: 16px !important;
          }

          .client-history-row > div:last-child {
            justify-self: flex-start !important;
          }

          /*
           * Almanaque TuAgendaYa en móvil/app:
           * estas reglas son deliberadamente más específicas que la regla
           * general del dashboard que convierte todas las grillas en 1 columna.
           */
          .dashboard-panel div.tay-almanac-header[style*="grid-template-columns"] {
            display: grid !important;
            grid-template-columns: 30px minmax(0, 1fr) 30px !important;
            align-items: center !important;
            gap: 6px !important;
          }

          .dashboard-panel div.tay-almanac-weekdays[style*="grid-template-columns"],
          .dashboard-panel div.tay-almanac-days[style*="grid-template-columns"] {
            display: grid !important;
            grid-template-columns: repeat(7, minmax(0, 1fr)) !important;
            gap: 3px !important;
          }

          .dashboard-panel .tay-almanac {
            width: min(100%, 326px) !important;
            max-width: 326px !important;
            margin-left: auto !important;
            margin-right: auto !important;
            box-sizing: border-box !important;
          }

          .dashboard-panel .tay-almanac .tay-almanac-nav {
            width: 30px !important;
            height: 30px !important;
            min-width: 30px !important;
            min-height: 30px !important;
            padding: 0 !important;
          }

          .dashboard-panel .tay-almanac .tay-almanac-day {
            width: 100% !important;
            height: auto !important;
            min-width: 0 !important;
            min-height: 28px !important;
            aspect-ratio: 1 / 1 !important;
            padding: 0 !important;
            line-height: 1 !important;
          }

          .dashboard-panel .repeat-booking-modal {
            width: min(430px, calc(100vw - 16px)) !important;
            max-width: calc(100vw - 16px) !important;
            padding: 15px !important;
            box-sizing: border-box !important;
          }

          .dashboard-panel .repeat-booking-modal .tay-almanac {
            width: min(100%, 326px) !important;
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
        <style>{tipEditorStyles}</style>
        <SetupChecklistSection />

        <div className="dashboard-tabs" style={{ display: 'flex', gap: 10, marginBottom: 16, overflowX: 'auto' }}>
          <button style={tabStyle('reservas')} onClick={() => setActiveTab('reservas')}>Reservas</button>
          <button style={tabStyle('clientes')} onClick={() => setActiveTab('clientes')}>Clientes</button>
          <button style={tabStyle('caja')} onClick={() => setActiveTab('caja')}>Caja</button>
          <button
            style={tabStyle('configuracion')}
            onClick={() => setActiveTab('configuracion')}
            aria-label="Configuración"
            title="Configuración"
          >
            <span className="config-tab-text">Configuración</span>
            <svg className="config-tab-icon" width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="3.15" stroke="currentColor" strokeWidth="1.9" />
              <path d="M12 2.9v2.05M12 19.05v2.05M5.56 5.56l1.45 1.45M16.99 16.99l1.45 1.45M2.9 12h2.05M19.05 12h2.05M5.56 18.44l1.45-1.45M16.99 7.01l1.45-1.45" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <circle cx="12" cy="12" r="7.25" stroke="currentColor" strokeWidth="1.45" opacity="0.55" />
            </svg>
          </button>
          <button style={tabStyle('perfil')} onClick={() => setActiveTab('perfil')}>Perfil</button>
        </div>

        <div
          className="dashboard-content-swipe"
          onTouchStart={handleDashboardTouchStart}
          onTouchEnd={handleDashboardTouchEnd}
        >
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
    </div>
  );
}


function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAdminApp = location.pathname.startsWith('/admin-app');
  const adminDashboardPath = isAdminApp ? '/admin-app/dashboard' : '/admin/dashboard';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('tuagendaya_admin_token');
    if (token) {
      navigate(adminDashboardPath, { replace: true });
    }
  }, [navigate, adminDashboardPath]);

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
      navigate(adminDashboardPath, { replace: true });
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
        <PasswordInputField
          value={password}
          onChange={(event) => setPassword(event.target.value)}
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
  const location = useLocation();
  const isAdminApp = location.pathname.startsWith('/admin-app');
  const adminLoginPath = '/login';
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
      localStorage.removeItem('tuagendaya_admin_user');
      navigate(adminLoginPath, { replace: true });
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
      navigate(adminLoginPath, { replace: true });
      return;
    }

    loadAdminData();
  }, [token, navigate, loadAdminData, adminLoginPath]);

  useEffect(() => {
    if (!token) return;
    const timer = setInterval(loadAdminData, 10000);
    return () => clearInterval(timer);
  }, [token, loadAdminData]);

  const handleLogout = () => {
    localStorage.removeItem('tuagendaya_admin_token');
    localStorage.removeItem('tuagendaya_admin_user');
    localStorage.removeItem('tuagendaya_token');
    localStorage.removeItem('tuagendaya_professional');
    navigate('/login', { replace: true });
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
          .admin-billing-simple { grid-template-columns: 1fr !important; }
          .admin-detail-grid { grid-template-columns: 1fr !important; }
          .admin-transfer-card { grid-template-columns: 1fr !important; }
          .admin-transfer-actions { grid-template-columns: 1fr !important; }
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
                const publicUrl = professional.slug ? `https://tuagendaya.com/reservar/${professional.slug}` : '';
                const isActive = professional.status !== 'suspended';
                const planName = professional.plan || 'Profesional';
                const monthlyLimit = Number(professional.monthlyLimit || professional.monthly_limit || 1000);
                const monthlyUsed = Number(professional.monthlyBookingsCount || professional.monthly_bookings_count || 0);
                const monthlyPercent = monthlyLimit > 0 ? Math.min(100, Math.round((monthlyUsed / monthlyLimit) * 100)) : 0;
                const rawPaymentStatus = professional.planPaymentStatus || professional.plan_payment_status || 'pending';
                const billingMethod = professional.billingMethod || professional.billing_method || 'Sin elegir';
                const planExpiresAt = professional.planExpiresAt || professional.plan_expires_at || '';
                const lastPaymentAt = professional.lastPaymentAt || professional.last_payment_at || '';
                const planPrice = Number(professional.planPrice || professional.plan_price || 0);
                const planCurrency = professional.planCurrency || professional.plan_currency || 'UYU';
                const expiresDate = planExpiresAt ? new Date(planExpiresAt) : null;
                const daysToExpire = expiresDate && !Number.isNaN(expiresDate.getTime())
                  ? Math.ceil((expiresDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                  : null;
                const isPaidByExpiration = daysToExpire !== null && daysToExpire >= 0;
                const paymentStatus = isPaidByExpiration ? 'paid' : rawPaymentStatus;
                const promotion = professional.promotion || professional.planPromotion || professional.plan_promotion || {};
                const promoStage = isPaidByExpiration ? 'normal' : promotion.stage || professional.promoStage || professional.promo_stage || 'normal';
                const planNameClean = String(planName || '').trim().toLowerCase();
                const isTrialPlan = !isPaidByExpiration && (
                  promoStage === 'free' ||
                  promoStage === 'discount' ||
                  planNameClean === 'free' ||
                  planNameClean === 'gratis'
                );
                const promoLabel = promoStage === 'free' ? 'Estado de prueba' : promoStage === 'discount' ? 'Prueba 50%' : '';
                const paymentLabel = isTrialPlan
                  ? 'Estado de prueba'
                  : paymentStatus === 'paid'
                    ? 'Pago'
                    : paymentStatus === 'overdue'
                      ? 'Vencido'
                      : paymentStatus === 'pending_transfer'
                        ? 'Transferencia'
                        : 'Pendiente';
                const paymentColor = isTrialPlan ? '#0071e3' : paymentStatus === 'paid' ? '#188038' : paymentStatus === 'overdue' ? '#ff3b30' : '#ff9500';
                const paymentBg = isTrialPlan ? '#eef6ff' : paymentStatus === 'paid' ? '#edfff3' : paymentStatus === 'overdue' ? '#fff0f0' : '#fff7e8';
                const billingMethodLabel = billingMethod === 'mercadopago'
                  ? 'Automático'
                  : billingMethod === 'transfer'
                    ? 'Transferencia'
                    : 'Sin elegir';
                const formatAdminDate = (value) => {
                  if (!value) return 'Sin dato';
                  const parsed = new Date(value);
                  return Number.isNaN(parsed.getTime()) ? 'Sin dato' : parsed.toLocaleDateString('es-UY');
                };

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
                        <div style={{ color: '#6e6e73', fontSize: 13, marginTop: 4 }}>
                          Teléfono: {professional.phone || 'Sin teléfono'}
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
                      <div style={{ background: paymentBg, borderRadius: 14, padding: 12 }}>
                        <div style={{ fontSize: 18, fontWeight: 950, color: paymentColor }}>{paymentLabel}</div>
                        <div style={{ fontSize: 12, color: '#8e8e93', fontWeight: 800 }}>Estado de pago</div>
                      </div>
                      <div style={{ background: '#f7f7fb', borderRadius: 14, padding: 12 }}>
                        <div style={{ fontSize: 18, fontWeight: 900, color: '#1a1a1a' }}>{professional.clientsCount || 0}</div>
                        <div style={{ fontSize: 12, color: '#8e8e93', fontWeight: 800 }}>Clientes</div>
                      </div>
                    </div>

                    <div className="admin-billing-simple" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10, background: '#fbfbfd', border: '0.5px solid #ececf2', borderRadius: 16, padding: 12 }}>
                      <div>
                        <div style={{ color: '#8e8e93', fontSize: 11, fontWeight: 850 }}>Vencimiento</div>
                        <div style={{ color: daysToExpire !== null && daysToExpire < 0 ? '#ff3b30' : '#1a1a1a', fontSize: 13, fontWeight: 950, marginTop: 3 }}>
                          {formatAdminDate(planExpiresAt)}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: '#8e8e93', fontSize: 11, fontWeight: 850 }}>Faltan</div>
                        <div style={{ color: daysToExpire !== null && daysToExpire <= 3 ? '#ff9500' : '#1a1a1a', fontSize: 13, fontWeight: 950, marginTop: 3 }}>
                          {daysToExpire === null ? 'Sin dato' : daysToExpire < 0 ? `${Math.abs(daysToExpire)} días vencido` : `${daysToExpire} días`}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: '#8e8e93', fontSize: 11, fontWeight: 850 }}>Último pago</div>
                        <div style={{ color: '#1a1a1a', fontSize: 13, fontWeight: 950, marginTop: 3 }}>{formatAdminDate(lastPaymentAt)}</div>
                      </div>
                      <div>
                        <div style={{ color: '#8e8e93', fontSize: 11, fontWeight: 850 }}>Cobro</div>
                        <div style={{ color: '#1a1a1a', fontSize: 13, fontWeight: 950, marginTop: 3 }}>
                          {billingMethodLabel}{planPrice > 0 ? ` · ${planCurrency} ${planPrice}` : ''}
                        </div>
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
                    <div><strong style={{ color: '#1a1a1a' }}>Link público:</strong> {selectedBusiness.slug ? `https://tuagendaya.com/reservar/${selectedBusiness.slug}` : '-'}</div>
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
                      onClick={() => copyText(selectedBusiness.slug ? `https://tuagendaya.com/reservar/${selectedBusiness.slug}` : '', 'Link público copiado')}
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
      return JSON.parse(localStorage.getItem('tuagendaya_professional')) || {};
    } catch {
      return {};
    }
  });
  const [accountSuspended, setAccountSuspended] = useState(false);

  useEffect(() => {
    if (!professional) return undefined;

    let active = true;

    const checkAccountStatus = async () => {
      const token = localStorage.getItem('tuagendaya_token');
      if (!token) return;

      try {
        const response = await fetch(
          `${API_BASE}/auth/me?status_check=${Date.now()}`,
          {
            cache: 'no-store',
            headers: {
              Authorization: `Bearer ${token}`,
              'Cache-Control': 'no-cache',
            },
          }
        );

        const data = await response.json().catch(() => ({}));

        if (!active) return;

        if (response.status === 403) {
          const message = String(data.error || '').toLowerCase();

          if (message.includes('suspend') || message.includes('inactiva')) {
            setAccountSuspended(true);
          }

          return;
        }

        if (response.ok) {
          setAccountSuspended(false);
        }
      } catch {
        // Un problema de red no modifica el estado de la sesión.
      }
    };

    const handleWindowFocus = () => {
      checkAccountStatus();
    };

    checkAccountStatus();
    const intervalId = window.setInterval(checkAccountStatus, 2000);
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleWindowFocus);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleWindowFocus);
    };
  }, [professional]);

  const handleProfessionalUpdate = (updatedProfessional) => {
    const normalized = normalizeProfessionalFromApi({
      ...(professional || {}),
      ...(updatedProfessional || {}),
    });

    setProfessional(normalized);
    localStorage.setItem('tuagendaya_professional', JSON.stringify(normalized));
  };

  if (accountSuspended) {
    return (
      <AuthLayout>
        <div
          style={{
            width: '100%',
            maxWidth: 520,
            margin: '0 auto',
            background: '#fff',
            border: '1px solid #ececf2',
            borderRadius: 28,
            padding: '34px 28px',
            boxShadow: '0 18px 48px rgba(15,23,42,0.08)',
            textAlign: 'center',
          }}
        >
          <TuAgendaLogo height={54} centered />

          <div
            style={{
              width: 58,
              height: 58,
              margin: '26px auto 18px',
              borderRadius: 18,
              display: 'grid',
              placeItems: 'center',
              background: '#fff3f2',
              color: '#d92d20',
              fontSize: 26,
              fontWeight: 950,
            }}
          >
            !
          </div>

          <h1
            style={{
              margin: 0,
              color: '#111827',
              fontSize: 28,
              lineHeight: 1.15,
              letterSpacing: '-0.025em',
            }}
          >
            Cuenta suspendida
          </h1>

          <p
            style={{
              margin: '14px auto 0',
              maxWidth: 410,
              color: '#6e6e73',
              fontSize: 15,
              lineHeight: 1.65,
            }}
          >
            Tu cuenta se encuentra temporalmente suspendida. Tus reservas y datos permanecen guardados y no se eliminaron.
            Cuando la cuenta sea reactivada, el acceso volverá automáticamente. Si necesitás asistencia, contactá con TuAgendaYa.
          </p>

          <a
            href="mailto:contacto@tuagendaya.com"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 48,
              marginTop: 24,
              padding: '0 20px',
              borderRadius: 15,
              background: '#0071e3',
              color: '#fff',
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 900,
            }}
          >
            Contactar soporte
          </a>
        </div>
      </AuthLayout>
    );
  }

  if (!professional) {
    return (
      <LoginForm
        onLogin={(prof) => {
          const normalized = normalizeProfessionalFromApi(prof || {});
          localStorage.setItem('tuagendaya_session_persistent', 'true');
          localStorage.setItem('tuagendaya_professional', JSON.stringify(normalized));
          setAccountSuspended(false);
          setProfessional(normalized);
        }}
      />
    );
  }

  return (
    <Dashboard
      professional={professional}
      onLogout={() => setProfessional(null)}
      onProfileUpdated={handleProfessionalUpdate}
    />
  );
}



function ProfessionalOnlyRoute() {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const professionalToken = localStorage.getItem('tuagendaya_token');

    if (!professionalToken) {
      navigate('/login?tipo=profesional', { replace: true });
      return;
    }

    setChecked(true);
  }, [navigate]);

  if (!checked) {
    return (
      <AuthLayout>
        <div style={{ textAlign: 'center' }}>
          <TuAgendaLogo height={52} centered />
          <div style={{ marginTop: 16, color: '#6e6e73', fontSize: 14, fontWeight: 750 }}>
            Preparando acceso profesional...
          </div>
        </div>
      </AuthLayout>
    );
  }

  return <ProfesionalPage />;
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
        html,
        body,
        #root {
          max-width: 100vw !important;
        }

        input,
        textarea,
        select {
          font-size: 16px !important;
          line-height: 1.35 !important;
          max-width: 100% !important;
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
          max-width: 100%;
        }

        img,
        video,
        canvas,
        svg {
          max-width: 100%;
        }

        [style*="grid-template-columns"] {
          min-width: 0;
        }

        .config-summary-grid {
          grid-template-columns: 1fr !important;
          gap: 10px !important;
        }

        .admin-filters,
        .admin-business-actions,
        .admin-detail-grid,
        .admin-business-metrics {
          grid-template-columns: 1fr !important;
        }
      }

      @media (max-width: 430px) {
        body {
          background: #f5f5f7;
        }

        #root > div {
          max-width: 100vw !important;
        }
      }
    `;
  }, []);

  return null;
}


function LandingPage() {
  const navigate = useNavigate();

  const goRegister = () => navigate('/profesional/register');
  const goLogin = () => navigate('/login');

  const sidebarItems = [
    ['⌂', 'Inicio', true],
    ['▦', 'Agenda'],
    ['☑', 'Reservas'],
    ['◎', 'Clientes'],
    ['▣', 'Cobros'],
    ['✉', 'Mensajes'],
    ['◇', 'Promociones'],
    ['▥', 'Reportes'],
    ['⚙', 'Configuración'],
  ];

  const appointments = [
    { time: '09:30', name: 'María González', service: 'Consulta inicial', status: 'Confirmada' },
    { time: '10:20', name: 'Ana Silva', service: 'Limpieza dental', status: 'Pendiente' },
    { time: '11:10', name: 'Carlos Díaz', service: 'Control', status: 'Confirmada' },
  ];

  const highlights = [
    {
      key: 'agenda',
      title: 'Agenda inteligente',
      text: 'Reservas y horarios siempre ordenados.',
    },
    {
      key: 'ausencias',
      title: 'Menos ausencias',
      text: 'Recordatorios y confirmaciones por WhatsApp.',
    },
    {
      key: 'cobros',
      title: 'Cobros en un solo lugar',
      text: 'Transferencias, pagos y control simple.',
    },
    {
      key: 'clientes',
      title: 'Clientes e historial',
      text: 'Toda la información organizada y disponible.',
    },
  ];

  const HighlightIcon = ({ type }) => {
    const commonProps = {
      width: 24,
      height: 24,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: '1.8',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      'aria-hidden': 'true',
    };

    if (type === 'agenda') {
      return (
        <svg {...commonProps}>
          <rect x="3.5" y="5" width="17" height="15.5" rx="3.2" />
          <path d="M8 3.8v3.1M16 3.8v3.1M3.5 9.2h17" />
          <path d="M8 12.7h3.5M8 16.1h7.3" />
        </svg>
      );
    }

    if (type === 'ausencias') {
      return (
        <svg {...commonProps}>
          <path d="M12 20.2a8.2 8.2 0 1 0 0-16.4 8.2 8.2 0 0 0 0 16.4Z" />
          <path d="M12 7.6v4.4l3.2 1.9" />
          <path d="M17.1 7.2 18.9 5.4" />
        </svg>
      );
    }

    if (type === 'cobros') {
      return (
        <svg {...commonProps}>
          <rect x="3.2" y="5.5" width="17.6" height="13" rx="3.1" />
          <path d="M3.8 10h16.4" />
          <path d="M7.2 14.2h3.5M14.4 14.2h2.5" />
        </svg>
      );
    }

    return (
      <svg {...commonProps}>
        <rect x="3.8" y="4.6" width="16.4" height="14.8" rx="3.2" />
        <circle cx="9.4" cy="10.1" r="2.1" />
        <path d="M6.8 15.4c.7-1.5 2-2.3 3.4-2.3 1.3 0 2.6.8 3.3 2.3" />
        <path d="M14.7 9.5h2.8M14.7 12.3h2.8M14.7 15.1h2" />
      </svg>
    );
  };

  return (
    <div className="tay-landing">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900;1000&display=swap');

        .tay-landing {
          min-height: 100vh;
          font-family: ${APP_FONT};
          color: #080f25;
          background:
            radial-gradient(circle at 78% 18%, rgba(0,113,227,0.075), transparent 31%),
            linear-gradient(180deg, #ffffff 0%, #fbfdff 58%, #f7faff 100%);
          overflow-x: hidden;
        }

        .tay-landing * {
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
        }

        .tay-landing-shell {
          width: min(1380px, calc(100% - 56px));
          margin: 0 auto;
        }

        .tay-landing-header {
          min-height: 90px;
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 34px;
          border-bottom: 0.5px solid rgba(15,23,42,0.055);
        }

        .tay-logo-button {
          border: 0;
          background: transparent;
          padding: 0;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
        }

        .tay-nav {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 38px;
          color: #20263a;
          font-size: 14px;
          font-weight: 750;
          letter-spacing: 0.012em;
        }

        .tay-nav a {
          border: 0;
          background: transparent;
          padding: 8px 0;
          color: inherit;
          font: inherit;
          font-weight: inherit;
          letter-spacing: inherit;
          white-space: nowrap;
          cursor: pointer;
          position: relative;
          text-decoration: none;
        }

        .tay-nav a::after {
          content: "";
          position: absolute;
          left: 0;
          right: 100%;
          bottom: 2px;
          height: 2px;
          border-radius: 999px;
          background: #0071e3;
          transition: right .18s ease;
        }

        .tay-nav a:hover {
          color: #0071e3;
        }

        .tay-nav a:hover::after {
          right: 0;
        }

        .tay-nav-actions {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .tay-nav-login,
        .tay-nav-register,
        .tay-main-cta,
        .tay-login-cta {
          font: inherit;
          cursor: pointer;
          transition: transform .18s ease, box-shadow .18s ease, background .18s ease;
        }

        .tay-nav-login {
          border: 0;
          background: transparent;
          color: #111827;
          padding: 12px 8px;
          font-size: 14px;
          font-weight: 850;
          letter-spacing: 0.012em;
        }

        .tay-nav-register {
          min-height: 48px;
          border: 0;
          border-radius: 15px;
          padding: 0 23px;
          background: linear-gradient(135deg, #0878ff 0%, #0068ed 100%);
          color: #fff;
          font-size: 14px;
          font-weight: 950;
          letter-spacing: 0.012em;
          box-shadow: 0 12px 30px rgba(0,113,227,.18);
        }

        .tay-nav-register:hover,
        .tay-main-cta:hover {
          transform: translateY(-1px);
          box-shadow: 0 18px 36px rgba(0,113,227,.24);
        }

        .tay-hero {
          display: grid;
          grid-template-columns: minmax(430px, .88fr) minmax(610px, 1.12fr);
          align-items: center;
          gap: 54px;
          min-height: 690px;
          padding: 72px 0 54px;
        }

        .tay-hero-copy {
          align-self: center;
          padding-bottom: 10px;
        }

        .tay-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: 999px;
          background: #eef6ff;
          border: 0.5px solid rgba(0,113,227,.12);
          color: #006ee8;
          font-size: 13px;
          font-weight: 850;
          letter-spacing: 0.012em;
          margin-bottom: 31px;
        }

        .tay-title {
          margin: 0;
          max-width: 630px;
          font-size: clamp(50px, 4.45vw, 75px);
          line-height: 1.12;
          letter-spacing: 0.004em;
          font-weight: 900;
          color: #070e24;
          text-wrap: balance;
        }

        .tay-title span {
          color: #0878ff;
        }

        .tay-subtitle {
          max-width: 580px;
          margin: 30px 0 0;
          color: #4e5b73;
          font-size: 17.5px;
          line-height: 1.82;
          font-weight: 650;
          letter-spacing: 0.018em;
        }

        .tay-actions {
          display: flex;
          align-items: center;
          gap: 18px;
          margin-top: 36px;
        }

        .tay-main-cta,
        .tay-login-cta {
          min-height: 58px;
          border-radius: 17px;
          padding: 0 28px;
          font-size: 16px;
          font-weight: 950;
          letter-spacing: 0.016em;
        }

        .tay-main-cta {
          border: 0;
          min-width: 235px;
          background: linear-gradient(135deg, #0878ff 0%, #0068ed 100%);
          color: #fff;
          box-shadow: 0 18px 40px rgba(0,113,227,.22);
        }

        .tay-login-cta {
          min-width: 184px;
          border: 1px solid rgba(15,23,42,.15);
          background: rgba(255,255,255,.86);
          color: #111827;
          box-shadow: 0 8px 22px rgba(15,23,42,.035);
        }

        .tay-login-cta:hover {
          background: #fff;
          transform: translateY(-1px);
        }

        .tay-showcase {
          position: relative;
          min-height: 555px;
          display: flex;
          align-items: flex-end;
          justify-content: flex-end;
        }

        .tay-laptop {
          position: relative;
          width: min(870px, 100%);
          margin-right: -64px;
          padding-bottom: 10px;
          filter: drop-shadow(0 28px 38px rgba(15,23,42,.09));
        }

        /* Marco inspirado en MacBook: fino arriba/laterales y con mentón inferior negro. */
        .tay-laptop-bezel {
          position: relative;
          border-radius: 24px 24px 8px 8px;
          background:
            linear-gradient(180deg, #12151a 0%, #07090c 56%, #0b0e12 100%);
          padding: 13px 13px 28px;
          border: 1px solid rgba(0,0,0,.62);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.11),
            inset 0 -1px 0 rgba(255,255,255,.025);
        }

        .tay-laptop-bezel::before {
          content: "";
          position: absolute;
          top: 5px;
          left: 50%;
          width: 5px;
          height: 5px;
          margin-left: -2.5px;
          border-radius: 999px;
          background: #252a31;
          box-shadow:
            0 0 0 1px rgba(255,255,255,.02),
            inset 0 0 2px rgba(0,0,0,.65);
          z-index: 2;
        }

        /* Reflejo sutil sobre el borde inferior de la tapa. */
        .tay-laptop-bezel::after {
          content: "";
          position: absolute;
          left: 6%;
          right: 6%;
          bottom: 7px;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,.12), transparent);
        }

        .tay-laptop-screen {
          min-height: 478px;
          border-radius: 13px 13px 2px 2px;
          overflow: hidden;
          background: #fff;
          display: grid;
          grid-template-columns: 150px 1fr;
          border: 1px solid rgba(255,255,255,.08);
          box-shadow: inset 0 0 0 1px rgba(0,0,0,.02);
        }

        /* Bisagra negra visible entre pantalla y aluminio. */
        .tay-laptop-base {
          position: relative;
          width: 116%;
          height: 30px;
          margin-left: -8%;
          margin-top: -3px;
          background:
            linear-gradient(180deg,
              #2a2f36 0px,
              #15191f 5px,
              #e4e7ea 6px,
              #cfd4d9 12px,
              #aeb4bb 21px,
              #838a92 30px);
          border-radius: 2px 2px 8px 8px;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.82),
            inset 0 -1px 0 rgba(65,71,80,.10),
            0 8px 12px rgba(15,23,42,.05);
        }

        /* Rebaje central típico en el borde frontal. */
        .tay-laptop-base::before {
          content: "";
          position: absolute;
          top: 6px;
          left: 43%;
          width: 14%;
          height: 6px;
          background: linear-gradient(180deg, #a7adb4, #9299a1);
          border-radius: 0 0 9px 9px;
          box-shadow: inset 0 1px 1px rgba(255,255,255,.28);
        }

        .tay-laptop-base::after {
          content: "";
          position: absolute;
          left: 4%;
          right: 4%;
          bottom: -6px;
          height: 8px;
          border-radius: 50%;
          background: rgba(15,23,42,.055);
          filter: blur(4px);
        }

        .tay-dash-sidebar {
          background: #fbfcfe;
          border-right: 0.5px solid #edf0f4;
          padding: 23px 14px 15px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .tay-mini-brand {
          font-size: 13px;
          color: #111827;
          font-weight: 1000;
          letter-spacing: -.005em;
          margin-bottom: 22px;
        }

        .tay-mini-brand span {
          color: #0071e3;
        }

        .tay-dash-menu {
          display: grid;
          gap: 5px;
        }

        .tay-dash-menu-item {
          display: flex;
          align-items: center;
          gap: 9px;
          min-height: 36px;
          padding: 0 10px;
          border-radius: 11px;
          color: #344054;
          font-size: 10.5px;
          font-weight: 900;
          letter-spacing: 0.01em;
        }

        .tay-dash-menu-item.active {
          color: #0071e3;
          background: #eaf4ff;
        }

        .tay-account {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px;
          background: #fff;
          border: .5px solid #edf0f4;
          border-radius: 13px;
        }

        .tay-avatar {
          width: 30px;
          height: 30px;
          border-radius: 999px;
          background: #eaf4ff;
          color: #0071e3;
          display: grid;
          place-items: center;
          font-size: 10.5px;
          font-weight: 1000;
        }

        .tay-dash-main {
          padding: 28px 27px 24px;
          background: linear-gradient(180deg, #ffffff 0%, #fcfdff 100%);
        }

        .tay-dash-title {
          margin: 0;
          color: #111827;
          font-size: 23px;
          line-height: 1.04;
          font-weight: 1000;
          letter-spacing: -0.01em;
        }

        .tay-dash-caption {
          margin-top: 7px;
          color: #667085;
          font-size: 10.8px;
          font-weight: 800;
          letter-spacing: 0.01em;
        }

        .tay-dash-grid {
          display: grid;
          grid-template-columns: 1.45fr .75fr;
          gap: 14px;
          margin-top: 22px;
        }

        .tay-card {
          background: #fff;
          border: .5px solid #edf0f4;
          border-radius: 18px;
          box-shadow: 0 8px 22px rgba(15,23,42,.025);
        }

        .tay-reservations-card {
          padding: 16px;
        }

        .tay-card-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .tay-card-title {
          color: #111827;
          font-size: 13px;
          font-weight: 1000;
          letter-spacing: 0.005em;
        }

        .tay-link {
          color: #0071e3;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 0.012em;
        }

        .tay-appointment {
          display: grid;
          grid-template-columns: 45px minmax(0,1fr) auto;
          align-items: center;
          gap: 10px;
          margin-top: 9px;
          padding: 11px 12px;
          border-radius: 13px;
          background: #f8fafc;
        }

        .tay-appointment-time {
          color: #0071e3;
          font-size: 11px;
          font-weight: 1000;
          letter-spacing: 0.01em;
        }

        .tay-appointment-name {
          color: #111827;
          font-size: 11px;
          font-weight: 1000;
          letter-spacing: 0.005em;
        }

        .tay-appointment-service {
          margin-top: 1px;
          color: #667085;
          font-size: 9.3px;
          font-weight: 750;
          letter-spacing: 0.01em;
        }

        .tay-status {
          border-radius: 999px;
          padding: 5px 7px;
          font-size: 8.5px;
          font-weight: 1000;
          white-space: nowrap;
          letter-spacing: 0.01em;
        }

        .tay-status.confirmed {
          color: #16803a;
          background: #edfff4;
        }

        .tay-status.pending {
          color: #c06300;
          background: #fff7e8;
        }

        .tay-income-card {
          padding: 16px;
          min-height: 100%;
        }

        .tay-income-label {
          color: #667085;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.01em;
        }

        .tay-income-value {
          margin-top: 8px;
          color: #111827;
          font-size: 26px;
          line-height: 1;
          font-weight: 1000;
          letter-spacing: -0.015em;
        }

        .tay-income-change {
          margin-top: 7px;
          color: #16a34a;
          font-size: 9.8px;
          font-weight: 950;
          letter-spacing: 0.01em;
        }

        .tay-chart {
          height: 88px;
          margin-top: 20px;
          display: flex;
          align-items: flex-end;
          gap: 4px;
          padding-bottom: 6px;
          border-bottom: 1px solid #eef2f6;
        }

        .tay-chart span {
          flex: 1;
          border-radius: 5px 5px 1px 1px;
          background: linear-gradient(180deg, #0878ff 0%, #cfe4ff 100%);
          opacity: .92;
        }

        .tay-dash-bottom {
          display: grid;
          grid-template-columns: 1.25fr .75fr;
          gap: 14px;
          margin-top: 14px;
        }

        .tay-reminder-card,
        .tay-link-card {
          padding: 15px;
        }

        .tay-reminder-line {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .tay-reminder-icon {
          width: 35px;
          height: 35px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          background: #ecfff2;
          color: #16803a;
          font-weight: 1000;
        }

        .tay-link-box {
          margin-top: 10px;
          border-radius: 10px;
          background: #eef6ff;
          color: #0071e3;
          padding: 9px 10px;
          font-size: 9.5px;
          font-weight: 950;
          letter-spacing: 0.01em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .tay-highlights-wrap {
          border-top: .5px solid rgba(15,23,42,.065);
          background: rgba(255,255,255,.62);
        }

        .tay-highlights {
          min-height: 162px;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          align-items: center;
          gap: 0;
        }

        .tay-highlight {
          min-height: 88px;
          display: grid;
          grid-template-columns: 58px 1fr;
          align-items: center;
          gap: 16px;
          padding: 0 28px;
          border-right: 1px solid rgba(15,23,42,.08);
        }

        .tay-highlight:first-child {
          padding-left: 0;
        }

        .tay-highlight:last-child {
          border-right: 0;
          padding-right: 0;
        }

        .tay-highlight-icon {
          width: 56px;
          height: 56px;
          border-radius: 17px;
          display: grid;
          place-items: center;
          background: linear-gradient(180deg, #eff6ff 0%, #ebf4ff 100%);
          border: .5px solid rgba(0,113,227,.10);
          color: #0071e3;
          box-shadow: inset 0 1px 0 rgba(255,255,255,.85);
        }

        .tay-highlight-icon svg {
          width: 24px;
          height: 24px;
          display: block;
        }

        .tay-highlight-title {
          color: #111827;
          font-size: 13.5px;
          font-weight: 1000;
          line-height: 1.25;
          letter-spacing: 0.01em;
        }

        .tay-highlight-text {
          margin-top: 5px;
          color: #667085;
          font-size: 11.5px;
          line-height: 1.45;
          font-weight: 700;
          letter-spacing: 0.01em;
        }

        .tay-section-block {
          scroll-margin-top: 24px;
          padding: 92px 0;
          border-top: 0.5px solid rgba(15,23,42,.06);
          background: rgba(255,255,255,.72);
        }

        .tay-section-block.alt {
          background: #f8fbff;
        }

        .tay-section-eyebrow {
          color: #0071e3;
          font-size: 13px;
          font-weight: 950;
          letter-spacing: .04em;
          text-transform: uppercase;
        }

        .tay-section-title {
          margin: 12px 0 0;
          max-width: 760px;
          color: #0a1125;
          font-size: clamp(34px, 3.2vw, 52px);
          line-height: 1.12;
          letter-spacing: -.02em;
          font-weight: 950;
        }

        .tay-section-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-top: 34px;
        }

        .tay-section-card {
          padding: 24px;
          border-radius: 22px;
          background: #fff;
          border: .5px solid rgba(15,23,42,.08);
          box-shadow: 0 12px 28px rgba(15,23,42,.035);
        }

        .tay-section-card-title {
          color: #111827;
          font-size: 16px;
          font-weight: 1000;
        }

        .tay-section-card-text {
          margin-top: 9px;
          color: #667085;
          font-size: 13px;
          line-height: 1.6;
          font-weight: 700;
        }

        .tay-price-card {
          margin-top: 34px;
          padding: 28px;
          border-radius: 26px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 28px;
          background: linear-gradient(135deg, #0068ed 0%, #5f5cff 100%);
          color: #fff;
          box-shadow: 0 22px 50px rgba(0,113,227,.18);
        }

        .tay-price-badge {
          font-size: 12px;
          font-weight: 900;
          opacity: .8;
        }

        .tay-price-title {
          margin-top: 6px;
          font-size: 26px;
          font-weight: 1000;
        }

        .tay-price-text {
          margin-top: 5px;
          font-size: 13px;
          font-weight: 750;
          opacity: .85;
        }

        .tay-price-card .tay-main-cta {
          background: #fff;
          color: #0068ed;
          box-shadow: none;
          min-width: 210px;
        }

        .tay-pill-row {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 30px;
        }

        .tay-pill {
          padding: 11px 16px;
          border-radius: 999px;
          background: #eef6ff;
          border: .5px solid rgba(0,113,227,.12);
          color: #125fb8;
          font-size: 13px;
          font-weight: 900;
        }

        .tay-company-copy {
          max-width: 760px;
          margin: 22px 0 0;
          color: #5a667a;
          font-size: 17px;
          line-height: 1.75;
          font-weight: 650;
        }

        .tay-contact-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
          margin-top: 32px;
        }

        .tay-contact-card {
          min-height: 118px;
          padding: 24px;
          border: 1px solid rgba(15, 23, 42, .08);
          border-radius: 22px;
          background: #fff;
          box-shadow: 0 10px 30px rgba(15, 23, 42, .04);
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 8px;
          text-decoration: none;
          transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
        }

        .tay-contact-card:hover {
          transform: translateY(-2px);
          border-color: rgba(0, 113, 227, .18);
          box-shadow: 0 14px 34px rgba(15, 23, 42, .07);
        }

        .tay-contact-card-muted:hover {
          transform: none;
          border-color: rgba(15, 23, 42, .08);
          box-shadow: 0 10px 30px rgba(15, 23, 42, .04);
        }

        .tay-contact-label {
          color: #7a8495;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: .02em;
        }

        .tay-contact-card strong {
          color: #111827;
          font-size: 17px;
          line-height: 1.35;
          overflow-wrap: anywhere;
        }

        @media (max-width: 1180px) {
          .tay-nav {
            gap: 22px;
          }

          .tay-hero {
            grid-template-columns: 1fr;
            padding-top: 54px;
            gap: 32px;
          }

          .tay-hero-copy {
            max-width: 760px;
          }

          .tay-showcase {
            justify-content: center;
            min-height: auto;
          }

          .tay-laptop {
            margin-right: 0;
            width: min(900px, 100%);
          }

          .tay-highlights {
            grid-template-columns: repeat(2, 1fr);
            padding: 24px 0;
          }

          .tay-highlight:nth-child(2) {
            border-right: 0;
          }

          .tay-highlight:nth-child(n+3) {
            margin-top: 20px;
          }
        }

        @media (max-width: 820px) {
          .tay-landing {
            overflow-x: hidden;
          }

          .tay-landing-shell {
            width: calc(100% - 24px);
          }

          .tay-landing-header {
            min-height: 72px;
            grid-template-columns: 1fr auto;
            gap: 12px;
            padding: 10px 0;
          }

          .tay-logo-button svg {
            max-width: 190px;
            height: auto;
          }

          .tay-nav {
            display: none;
          }

          .tay-nav-login {
            display: none;
          }

          .tay-nav-register {
            min-height: 40px;
            padding: 0 14px;
            border-radius: 12px;
            font-size: 12.5px;
            white-space: nowrap;
          }

          .tay-hero {
            display: block;
            min-height: auto;
            padding: 34px 0 28px;
          }

          .tay-hero-copy {
            padding: 0;
          }

          .tay-badge {
            margin-bottom: 22px;
            font-size: 12px;
            padding: 7px 11px;
          }

          .tay-title {
            max-width: none;
            font-size: clamp(38px, 11.3vw, 54px);
            line-height: 1.08;
            letter-spacing: -0.006em;
          }

          .tay-subtitle {
            max-width: none;
            margin-top: 22px;
            font-size: 15.5px;
            line-height: 1.66;
            letter-spacing: 0.006em;
          }

          .tay-actions {
            display: grid;
            grid-template-columns: 1fr;
            gap: 11px;
            margin-top: 28px;
          }

          .tay-main-cta,
          .tay-login-cta {
            width: 100%;
            min-width: 0;
            min-height: 52px;
            border-radius: 15px;
            font-size: 15px;
          }

          .tay-showcase {
            margin-top: 34px;
            min-height: auto;
            display: block;
          }

          /* En móvil el mockup deja de mantener proporciones de escritorio.
             Lo convertimos en una vista compacta y proporcionada. */
          .tay-laptop {
            width: 100%;
            max-width: 520px;
            margin: 0 auto;
            padding-bottom: 0;
            transform: none;
            filter: drop-shadow(0 18px 28px rgba(15,23,42,.08));
          }

          .tay-laptop-bezel {
            padding: 8px 8px 15px;
            border-radius: 17px 17px 6px 6px;
          }

          .tay-laptop-bezel::before {
            top: 3px;
            width: 3px;
            height: 3px;
            margin-left: -1.5px;
          }

          .tay-laptop-screen {
            min-height: 0;
            aspect-ratio: 1.34 / 1;
            grid-template-columns: 1fr;
            border-radius: 10px 10px 2px 2px;
          }

          .tay-dash-sidebar {
            display: none;
          }

          .tay-dash-main {
            padding: 14px;
            overflow: hidden;
          }

          .tay-dash-title {
            font-size: 18px;
          }

          .tay-dash-caption {
            font-size: 9.5px;
          }

          .tay-dash-grid {
            grid-template-columns: 1fr;
            gap: 10px;
            margin-top: 14px;
          }

          .tay-dash-bottom {
            grid-template-columns: 1fr;
            gap: 10px;
            margin-top: 10px;
          }

          .tay-reservations-card {
            padding: 12px;
          }

          .tay-appointment {
            grid-template-columns: 42px minmax(0,1fr) auto;
            gap: 8px;
            padding: 9px 10px;
            margin-top: 7px;
          }

          .tay-appointment-time {
            font-size: 10px;
          }

          .tay-appointment-name {
            font-size: 10px;
          }

          .tay-appointment-service {
            font-size: 8.5px;
          }

          .tay-status {
            font-size: 7.8px;
            padding: 4px 6px;
          }

          .tay-income-card,
          .tay-link-card {
            display: none;
          }

          .tay-reminder-card {
            padding: 12px;
          }

          .tay-laptop-base {
            width: 110%;
            height: 16px;
            margin-left: -5%;
            margin-top: -2px;
            border-radius: 2px 2px 5px 5px;
          }

          .tay-laptop-base::before {
            height: 4px;
          }

          .tay-laptop-base::after {
            bottom: -3px;
            height: 5px;
          }

          .tay-highlights {
            grid-template-columns: 1fr;
            padding: 18px 0 24px;
          }

          .tay-highlight,
          .tay-highlight:first-child,
          .tay-highlight:last-child {
            min-height: 0;
            grid-template-columns: 50px 1fr;
            gap: 13px;
            padding: 15px 0;
            border-right: 0;
            border-bottom: 1px solid rgba(15,23,42,.07);
          }

          .tay-highlight-icon {
            width: 48px;
            height: 48px;
            border-radius: 15px;
          }

          .tay-highlight:last-child {
            border-bottom: 0;
          }

          .tay-highlight:nth-child(n+3) {
            margin-top: 0;
          }

          .tay-section-block {
            padding: 54px 0;
          }

          .tay-section-title {
            font-size: clamp(30px, 9vw, 42px);
            line-height: 1.13;
          }

          .tay-section-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .tay-section-card {
            padding: 20px;
            border-radius: 19px;
          }

          .tay-price-card {
            align-items: flex-start;
            flex-direction: column;
            padding: 22px;
            border-radius: 22px;
          }

          .tay-price-title {
            font-size: 22px;
          }

          .tay-price-card .tay-main-cta {
            width: 100%;
          }

          .tay-company-copy {
            font-size: 15.5px;
            line-height: 1.7;
          }

          .tay-contact-grid {
            grid-template-columns: 1fr;
            gap: 12px;
            margin-top: 24px;
          }

          .tay-contact-card {
            min-height: 102px;
            padding: 20px;
            border-radius: 19px;
          }
        }

        @media (max-width: 430px) {
          .tay-landing-shell {
            width: calc(100% - 20px);
          }

          .tay-logo-button svg {
            max-width: 165px;
          }

          .tay-nav-register {
            padding: 0 12px;
            font-size: 12px;
          }

          .tay-title {
            font-size: clamp(35px, 11vw, 46px);
          }

          .tay-badge {
            font-size: 11.5px;
          }

          .tay-laptop {
            max-width: 100%;
          }

          .tay-laptop-screen {
            aspect-ratio: 1.2 / 1;
          }

          .tay-card-title {
            font-size: 11.5px;
          }

          .tay-section-block {
            padding: 48px 0;
          }
        }
      `}</style>

      <header className="tay-landing-shell tay-landing-header">
        <button className="tay-logo-button" type="button" onClick={() => navigate('/')}>
          <TuAgendaLogo height={42} />
        </button>

        <nav className="tay-nav" aria-label="Navegación principal">
          <a href="#funciones">Funciones</a>
          <a href="#precios">Precios</a>
          <a href="#para-quien-es">Para quién es</a>
          <a href="#recursos">Recursos</a>
          <a href="#empresa">Empresa</a>
          <a href="#contacto">Contacto</a>
        </nav>

        <div className="tay-nav-actions">
          <button className="tay-nav-login" type="button" onClick={goLogin}>
            Iniciar sesión
          </button>
          <button className="tay-nav-register" type="button" onClick={goRegister}>
            Crear cuenta →
          </button>
        </div>
      </header>

      <main className="tay-landing-shell tay-hero">
        <section className="tay-hero-copy">
          <div className="tay-badge">
            ☆ Agenda online para negocios y profesionales
          </div>

          <h1 className="tay-title">
            Organización,<br />
            menos ausencias,<br />
            <span>más control.</span>
          </h1>

          <p className="tay-subtitle">
            Gestioná reservas, clientes, recordatorios y pagos en un solo sistema.
            Ahorrá tiempo, cobrá automáticamente y hacé crecer tu negocio.
          </p>

          <div className="tay-actions">
            <button className="tay-main-cta" type="button" onClick={goRegister}>
              Crear cuenta gratis →
            </button>
            <button className="tay-login-cta" type="button" onClick={goLogin}>
              Ingresar cuenta
            </button>
          </div>
        </section>

        <section className="tay-showcase" aria-label="Vista previa de TuAgendaYa">
          <div className="tay-laptop">
            <div className="tay-laptop-bezel">
              <div className="tay-laptop-screen">
                <aside className="tay-dash-sidebar">
                  <div>
                    <div className="tay-mini-brand">Tu Agenda <span>Ya</span></div>
                    <div className="tay-dash-menu">
                      {sidebarItems.map(([icon, label, active]) => (
                        <div className={`tay-dash-menu-item${active ? ' active' : ''}`} key={label}>
                          <span>{icon}</span>
                          <span>{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="tay-account">
                    <div className="tay-avatar">JP</div>
                    <div>
                      <div style={{ color: '#111827', fontSize: 10.5, fontWeight: 1000, letterSpacing: '0.01em' }}>Juan Pérez</div>
                      <div style={{ marginTop: 1, color: '#8a94a6', fontSize: 8.8, fontWeight: 800, letterSpacing: '0.01em' }}>Mi cuenta</div>
                    </div>
                  </div>
                </aside>

                <div className="tay-dash-main">
                  <h2 className="tay-dash-title">Hola, Juan</h2>
                  <div className="tay-dash-caption">Este es el resumen de tu negocio hoy.</div>

                  <div className="tay-dash-grid">
                    <div className="tay-card tay-reservations-card">
                      <div className="tay-card-head">
                        <div className="tay-card-title">Reservas de hoy</div>
                        <div className="tay-link">Ver agenda →</div>
                      </div>

                      {appointments.map((item) => (
                        <div className="tay-appointment" key={`${item.time}-${item.name}`}>
                          <div className="tay-appointment-time">{item.time}</div>
                          <div>
                            <div className="tay-appointment-name">{item.name}</div>
                            <div className="tay-appointment-service">{item.service}</div>
                          </div>
                          <div className={`tay-status ${item.status === 'Confirmada' ? 'confirmed' : 'pending'}`}>
                            {item.status}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="tay-card tay-income-card">
                      <div className="tay-income-label">Ingresos del día</div>
                      <div className="tay-income-value">$ 248.500</div>
                      <div className="tay-income-change">▲ 32% vs ayer</div>
                      <div className="tay-chart" aria-hidden="true">
                        {[22, 34, 29, 45, 39, 58, 51, 66].map((height, index) => (
                          <span key={index} style={{ height: `${height}%` }} />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="tay-dash-bottom">
                    <div className="tay-card tay-reminder-card">
                      <div className="tay-reminder-line">
                        <div className="tay-reminder-icon">✉</div>
                        <div>
                          <div className="tay-card-title">Recordatorio enviado</div>
                          <div style={{ marginTop: 3, color: '#667085', fontSize: 9.5, fontWeight: 800, letterSpacing: '0.01em' }}>Hoy 08:45</div>
                        </div>
                      </div>
                      <div style={{ marginTop: 12, color: '#475467', fontSize: 10.5, fontWeight: 800, letterSpacing: '0.01em' }}>
                        Recordatorio enviado a María Pérez
                      </div>
                      <div style={{ display: 'inline-flex', marginTop: 9, borderRadius: 999, padding: '5px 8px', background: '#edfff4', color: '#16803a', fontSize: 8.8, fontWeight: 1000, letterSpacing: '0.01em' }}>
                        Entregado
                      </div>
                    </div>

                    <div className="tay-card tay-link-card">
                      <div className="tay-card-title">Tu link de reservas</div>
                      <div className="tay-link-box">tuagendaya.com/mi-negocio ⧉</div>
                      <div style={{ marginTop: 11, color: '#667085', fontSize: 9.2, fontWeight: 850, letterSpacing: '0.01em' }}>
                        Compartilo con tus clientes
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="tay-laptop-base" />
          </div>
        </section>
      </main>

      <section className="tay-highlights-wrap">
        <div className="tay-landing-shell tay-highlights">
          {highlights.map((item) => (
            <div className="tay-highlight" key={item.title}>
              <div className="tay-highlight-icon">
                <HighlightIcon type={item.key} />
              </div>
              <div>
                <div className="tay-highlight-title">{item.title}</div>
                <div className="tay-highlight-text">{item.text}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="funciones" className="tay-section-block">
        <div className="tay-landing-shell">
          <div className="tay-section-eyebrow">Funciones</div>
          <h2 className="tay-section-title">Todo lo necesario para gestionar tu negocio.</h2>
          <div className="tay-section-grid">
            <div className="tay-section-card">
              <div className="tay-section-card-title">Agenda y reservas</div>
              <div className="tay-section-card-text">Organizá horarios, disponibilidad y reservas desde una sola vista.</div>
            </div>
            <div className="tay-section-card">
              <div className="tay-section-card-title">Clientes e historial</div>
              <div className="tay-section-card-text">Accedé a datos, reservas anteriores y seguimiento de cada cliente.</div>
            </div>
            <div className="tay-section-card">
              <div className="tay-section-card-title">Automatizaciones</div>
              <div className="tay-section-card-text">Confirmaciones y recordatorios por WhatsApp para reducir ausencias.</div>
            </div>
            <div className="tay-section-card">
              <div className="tay-section-card-title">Cobros y control</div>
              <div className="tay-section-card-text">Centralizá pagos, transferencias e ingresos en el mismo sistema.</div>
            </div>
          </div>
        </div>
      </section>

      <section id="precios" className="tay-section-block alt">
        <div className="tay-landing-shell">
          <div className="tay-section-eyebrow">Precios</div>
          <h2 className="tay-section-title">Empezá simple y escalá cuando lo necesites.</h2>
          <div className="tay-price-card">
            <div>
              <div className="tay-price-badge">Oferta de lanzamiento</div>
              <div className="tay-price-title">2 meses gratis + 2 meses al 50%</div>
              <div className="tay-price-text">Para nuevos usuarios de TuAgendaYa.</div>
            </div>
            <button className="tay-main-cta" type="button" onClick={goRegister}>Crear cuenta gratis →</button>
          </div>
        </div>
      </section>

      <section id="para-quien-es" className="tay-section-block">
        <div className="tay-landing-shell">
          <div className="tay-section-eyebrow">Para quién es</div>
          <h2 className="tay-section-title">Hecho para profesionales y negocios que quieren trabajar mejor.</h2>
          <p className="tay-company-copy">
            TuAgendaYa está diseñado para quienes buscan una gestión más clara, eficiente y profesional.
            Centralizá reservas, clientes, recordatorios y cobros en una sola plataforma, reducí tareas repetitivas
            y mantené el control de tu operación diaria con una experiencia simple, ordenada y confiable.
            Menos tiempo administrando. Más tiempo atendiendo, creciendo y ofreciendo un mejor servicio.
          </p>
        </div>
      </section>

      <section id="recursos" className="tay-section-block alt">
        <div className="tay-landing-shell">
          <div className="tay-section-eyebrow">Recursos</div>
          <h2 className="tay-section-title">Todo para empezar sin complicaciones.</h2>
          <div className="tay-section-grid">
            <div className="tay-section-card">
              <div className="tay-section-card-title">Preguntas frecuentes</div>
              <div className="tay-section-card-text">Respuestas rápidas sobre reservas, WhatsApp, pagos y configuración.</div>
            </div>
            <div className="tay-section-card">
              <div className="tay-section-card-title">Ayuda</div>
              <div className="tay-section-card-text">Guías para configurar tu cuenta y empezar a recibir reservas.</div>
            </div>
            <div className="tay-section-card">
              <div className="tay-section-card-title">Contacto</div>
              <div className="tay-section-card-text">Soporte directo para consultas sobre tu cuenta o el servicio.</div>
            </div>
            <div className="tay-section-card">
              <div className="tay-section-card-title">Seguridad</div>
              <div className="tay-section-card-text">Buenas prácticas para proteger tus datos y los de tus clientes.</div>
            </div>
          </div>
        </div>
      </section>

      <section id="empresa" className="tay-section-block">
        <div className="tay-landing-shell">
          <div className="tay-section-eyebrow">Empresa</div>
          <h2 className="tay-section-title">TuAgendaYa nació para simplificar la gestión diaria.</h2>
          <p className="tay-company-copy">
            Una plataforma pensada para que profesionales y negocios puedan concentrarse en atender a sus clientes,
            mientras la agenda, los recordatorios y el control quedan organizados en un solo lugar.
          </p>
        </div>
      </section>

      <section id="contacto" className="tay-section-block">
        <div className="tay-landing-shell">
          <div className="tay-section-eyebrow">Contacto</div>
          <h2 className="tay-section-title">Estamos para ayudarte.</h2>
          <p className="tay-company-copy">
            ¿Tenés alguna consulta sobre TuAgendaYa? Contactanos a través de nuestros canales oficiales.
          </p>

          <div className="tay-contact-grid">
            <a className="tay-contact-card" href="mailto:contacto@tuagendaya.com">
              <span className="tay-contact-label">Correo electrónico</span>
              <strong>contacto@tuagendaya.com</strong>
            </a>

            <a
              className="tay-contact-card"
              href="https://www.instagram.com/tuagendaya/"
              target="_blank"
              rel="noreferrer"
            >
              <span className="tay-contact-label">Instagram</span>
              <strong>@tuagendaya</strong>
            </a>

            <div className="tay-contact-card tay-contact-card-muted">
              <span className="tay-contact-label">Teléfono</span>
              <strong>Próximamente</strong>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}



function LegalDocumentPage({ title, lastUpdated, children }) {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f7', padding: 'max(18px, env(safe-area-inset-top)) 14px 40px', fontFamily: APP_FONT, boxSizing: 'border-box' }}>
      <div style={{ width: 'min(860px, 100%)', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
          <button type="button" onClick={() => navigate('/')} style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer' }}>
            <TuAgendaLogo height={36} />
          </button>
          <button type="button" onClick={() => navigate(-1)} style={{ border: '0.5px solid #d0d0d5', background: '#fff', color: '#1a1a1a', borderRadius: 999, padding: '9px 14px', fontSize: 13, fontWeight: 850, fontFamily: 'inherit', cursor: 'pointer' }}>
            Volver
          </button>
        </div>

        <article style={{ background: '#fff', border: '0.5px solid #e0e0e5', borderRadius: 28, padding: 'clamp(22px, 5vw, 46px)', boxShadow: '0 12px 40px rgba(0,0,0,0.05)' }}>
          <h1 style={{ margin: 0, color: '#111827', fontSize: 'clamp(28px, 5vw, 42px)', lineHeight: 1.05, letterSpacing: '-1.2px', fontWeight: 950 }}>{title}</h1>
          <div style={{ marginTop: 10, color: '#8e8e93', fontSize: 13, fontWeight: 750 }}>Última actualización: {lastUpdated}</div>
          <div className="legal-document-content" style={{ marginTop: 30, color: '#334155', fontSize: 15, lineHeight: 1.75 }}>
            {children}
          </div>
        </article>

        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 14, fontSize: 12.5, fontWeight: 800 }}>
          <a href="/terminos" style={{ color: '#0071e3' }}>Términos y Condiciones</a>
          <a href="/privacidad" style={{ color: '#0071e3' }}>Privacidad</a>
          <a href="/cookies" style={{ color: '#0071e3' }}>Cookies</a>
        </div>
      </div>
    </div>
  );
}

const legalHeadingStyle = { margin: '28px 0 8px', color: '#111827', fontSize: 19, lineHeight: 1.25, fontWeight: 950 };
const legalParagraphStyle = { margin: '0 0 12px' };
const legalListStyle = { margin: '0 0 14px', paddingLeft: 22 };

function TermsPage() {
  return (
    <LegalDocumentPage title="Términos y Condiciones" lastUpdated="29 de julio de 2026">
      <p style={legalParagraphStyle}>TuAgendaYa es una plataforma digital operada por <strong>Valentino Oestrich Centena</strong>, persona física domiciliada en Maldonado, República Oriental del Uruguay. El correo de contacto es <strong>contacto@tuagendaya.com</strong>.</p>

      <h2 style={legalHeadingStyle}>1. Aceptación</h2>
      <p style={legalParagraphStyle}>Estos términos regulan el registro, contratación y uso de TuAgendaYa. Al crear una cuenta o utilizar la plataforma, el usuario declara haberlos leído, comprendido y aceptado. Quien actúe en nombre de un negocio declara contar con autorización suficiente para hacerlo.</p>

      <h2 style={legalHeadingStyle}>2. Usuarios y alcance</h2>
      <p style={legalParagraphStyle}>TuAgendaYa está dirigida a profesionales, comercios, empresas y organizaciones que administran servicios y reservas. Las personas que reservan mediante la página pública de un negocio son clientes finales de ese negocio y no clientes comerciales directos de TuAgendaYa.</p>

      <h2 style={legalHeadingStyle}>3. Servicio</h2>
      <p style={legalParagraphStyle}>La plataforma puede incluir gestión de agenda, servicios, disponibilidad, clientes, reservas, comunicaciones, recordatorios, estadísticas y otras herramientas relacionadas. TuAgendaYa brinda infraestructura tecnológica y no presta los servicios ofrecidos por los negocios.</p>

      <h2 style={legalHeadingStyle}>4. Cuenta y seguridad</h2>
      <p style={legalParagraphStyle}>El usuario debe proporcionar información verdadera y actualizada, proteger sus credenciales e informar cualquier acceso no autorizado. Es responsable de las actividades realizadas desde su cuenta, salvo que deriven directamente de una falla atribuible a TuAgendaYa.</p>

      <h2 style={legalHeadingStyle}>5. Uso permitido</h2>
      <p style={legalParagraphStyle}>La plataforma solo puede utilizarse con fines lícitos. Queda prohibido usarla para fraude, suplantación, spam, acceso no autorizado, vulneración de sistemas, tratamiento ilegítimo de datos o actividades que infrinjan derechos de terceros.</p>

      <h2 style={legalHeadingStyle}>6. Responsabilidad del negocio</h2>
      <p style={legalParagraphStyle}>Cada negocio es responsable de sus servicios, precios, horarios, disponibilidad, políticas de cancelación, cumplimiento profesional, obligaciones fiscales y del tratamiento legítimo de los datos de sus clientes. Las reservas se celebran directamente entre el cliente final y el negocio.</p>

      <h2 style={legalHeadingStyle}>7. Comunicaciones</h2>
      <p style={legalParagraphStyle}>TuAgendaYa puede enviar confirmaciones, cancelaciones, reprogramaciones, alertas y recordatorios mediante correo electrónico, notificaciones web, WhatsApp u otros canales habilitados. La entrega puede depender de proveedores externos, conexión, permisos y configuración del dispositivo. Un recordatorio es auxiliar y su falta de recepción no anula una reserva.</p>

      <h2 style={legalHeadingStyle}>8. Planes, pagos y cancelación</h2>
      <p style={legalParagraphStyle}>Los precios, límites y funciones se informarán antes de contratar. El Plan Base podrá incluir hasta 1.000 reservas conforme a las condiciones comerciales vigentes. El usuario puede cancelar su suscripción; la cuenta permanecerá activa hasta finalizar el período ya pagado y no se renovará.</p>
      <p style={legalParagraphStyle}>No se realizan devoluciones automáticas por períodos iniciados, salvo cobro incorrecto, falla grave atribuible a TuAgendaYa, obligación legal o condición particular más favorable.</p>

      <h2 style={legalHeadingStyle}>9. Suspensión</h2>
      <p style={legalParagraphStyle}>TuAgendaYa puede suspender o cancelar cuentas por incumplimiento, fraude, riesgo de seguridad, falta de pago o requerimiento de autoridad competente. Cuando sea razonablemente posible, se permitirá corregir el incumplimiento.</p>

      <h2 style={legalHeadingStyle}>10. Disponibilidad y terceros</h2>
      <p style={legalParagraphStyle}>Se procurará mantener el servicio disponible, pero no se garantiza funcionamiento ininterrumpido. Puede haber mantenimiento, actualizaciones, fallas técnicas, incidentes de seguridad o interrupciones de proveedores externos como alojamiento, correo, mensajería, autenticación o pagos.</p>

      <h2 style={legalHeadingStyle}>11. Propiedad intelectual</h2>
      <p style={legalParagraphStyle}>La marca, código, diseño, textos, interfaces y funcionalidades propias de TuAgendaYa pertenecen a su titular o se utilizan con autorización. El usuario recibe un derecho limitado, no exclusivo e intransferible de uso mientras mantenga su cuenta habilitada.</p>

      <h2 style={legalHeadingStyle}>12. Datos personales</h2>
      <p style={legalParagraphStyle}>El tratamiento de datos se rige por la Política de Privacidad. El negocio determina el uso profesional de los datos de sus clientes y TuAgendaYa proporciona la infraestructura para procesarlos. No deben cargarse datos sensibles que no sean estrictamente necesarios.</p>

      <h2 style={legalHeadingStyle}>13. Limitación de responsabilidad</h2>
      <p style={legalParagraphStyle}>Dentro de los límites legales, TuAgendaYa no responde por la calidad o resultado de los servicios de los negocios, información incorrecta ingresada por usuarios, ausencias, cancelaciones, conflictos entre negocios y clientes finales, fallas de terceros o uso indebido de credenciales. Esta cláusula no limita responsabilidades que legalmente no puedan excluirse.</p>

      <h2 style={legalHeadingStyle}>14. Cambios</h2>
      <p style={legalParagraphStyle}>Estos términos pueden actualizarse por cambios legales, técnicos o comerciales. Los cambios sustanciales serán informados por un medio adecuado antes de su vigencia.</p>

      <h2 style={legalHeadingStyle}>15. Legislación y contacto</h2>
      <p style={legalParagraphStyle}>Se aplican las leyes de la República Oriental del Uruguay y la jurisdicción uruguaya competente, sin perjuicio de normas obligatorias aplicables. Consultas: <strong>contacto@tuagendaya.com</strong>.</p>
    </LegalDocumentPage>
  );
}

function PrivacyPage() {
  return (
    <LegalDocumentPage title="Política de Privacidad" lastUpdated="29 de julio de 2026">
      <p style={legalParagraphStyle}>El responsable de TuAgendaYa es <strong>Valentino Oestrich Centena</strong>, domiciliado en Maldonado, República Oriental del Uruguay. Para consultas o ejercicio de derechos: <strong>contacto@tuagendaya.com</strong>.</p>

      <h2 style={legalHeadingStyle}>1. Alcance</h2>
      <p style={legalParagraphStyle}>Esta política se aplica a visitantes, negocios registrados, usuarios autorizados, clientes finales que realizan reservas y personas que contactan al soporte.</p>

      <h2 style={legalHeadingStyle}>2. Roles en el tratamiento</h2>
      <p style={legalParagraphStyle}>TuAgendaYa es responsable de los datos usados para crear cuentas, gestionar planes, brindar soporte, proteger la plataforma y cumplir obligaciones legales. Cada negocio determina cómo utiliza los datos de sus clientes finales para administrar reservas y prestar sus servicios; TuAgendaYa procesa esa información para proporcionar la plataforma.</p>

      <h2 style={legalHeadingStyle}>3. Datos recopilados</h2>
      <ul style={legalListStyle}>
        <li>Datos del negocio y de cuenta: nombre, nombre comercial, correo, teléfono, profesión, dirección, perfil, servicios, precios, horarios y preferencias.</li>
        <li>Datos de clientes finales: nombre, teléfono, correo, servicio, profesional, fecha, hora, estado, cancelación, observaciones e historial de reservas.</li>
        <li>Datos técnicos: dirección IP, dispositivo, navegador, sistema operativo, sesiones, registros, errores, rendimiento y permisos de notificaciones.</li>
        <li>Comunicaciones con soporte y datos administrativos de planes, pagos o facturación.</li>
      </ul>

      <h2 style={legalHeadingStyle}>4. Finalidades</h2>
      <ul style={legalListStyle}>
        <li>Crear y administrar cuentas, agendas, servicios y reservas.</li>
        <li>Confirmar, cancelar, reprogramar y recordar reservas.</li>
        <li>Enviar comunicaciones administrativas y de seguridad.</li>
        <li>Gestionar planes, pagos, soporte y facturación.</li>
        <li>Prevenir fraude, abuso y accesos no autorizados.</li>
        <li>Corregir errores, medir rendimiento y mejorar el servicio.</li>
        <li>Cumplir obligaciones legales y defender derechos.</li>
      </ul>

      <h2 style={legalHeadingStyle}>5. Fundamentos</h2>
      <p style={legalParagraphStyle}>Los datos se tratan cuando es necesario para ejecutar el servicio, responder solicitudes, cumplir obligaciones legales, proteger intereses legítimos de seguridad o cuando existe consentimiento válido. El consentimiento puede retirarse sin afectar tratamientos anteriores.</p>

      <h2 style={legalHeadingStyle}>6. Proveedores y transferencias</h2>
      <p style={legalParagraphStyle}>La información puede ser procesada por proveedores de alojamiento, base de datos, almacenamiento, correo, WhatsApp, notificaciones, autenticación, mapas, pagos, seguridad y soporte. Algunos proveedores pueden procesar datos fuera de Uruguay; se procurarán garantías adecuadas conforme a la normativa aplicable. TuAgendaYa no vende datos personales.</p>

      <h2 style={legalHeadingStyle}>7. Conservación</h2>
      <p style={legalParagraphStyle}>Los datos se conservan mientras la cuenta permanezca activa y sean necesarios. Tras el cierre, podrán mantenerse hasta 90 días para recuperación, exportación o resolución de incidencias, y luego eliminarse o anonimizarse. Las copias de respaldo pueden conservarse hasta 180 días por su ciclo de rotación. La información fiscal, contable, de seguridad o reclamos podrá conservarse durante los plazos legales correspondientes.</p>

      <h2 style={legalHeadingStyle}>8. Seguridad e incidentes</h2>
      <p style={legalParagraphStyle}>TuAgendaYa aplica medidas técnicas y organizativas razonables, como comunicaciones cifradas, protección de contraseñas, controles de acceso, respaldos y limitación de accesos administrativos. Ningún sistema conectado a Internet ofrece seguridad absoluta. Los incidentes serán evaluados, contenidos y comunicados cuando corresponda legalmente.</p>

      <h2 style={legalHeadingStyle}>9. Derechos</h2>
      <p style={legalParagraphStyle}>Los titulares pueden solicitar información, acceso, rectificación, actualización, inclusión o supresión de sus datos y ejercer los demás derechos reconocidos por la normativa uruguaya. La solicitud debe enviarse a <strong>contacto@tuagendaya.com</strong> con información suficiente para verificar la identidad.</p>

      <h2 style={legalHeadingStyle}>10. Menores y datos sensibles</h2>
      <p style={legalParagraphStyle}>TuAgendaYa no está dirigida a menores como usuarios contratantes ni está diseñada para historias clínicas o datos sensibles. Los negocios no deben ingresar datos de salud, biométricos, ideológicos, religiosos, sindicales o relativos a la vida sexual salvo que cuenten con una solución específicamente adecuada y con base legal suficiente.</p>

      <h2 style={legalHeadingStyle}>11. Cookies y notificaciones</h2>
      <p style={legalParagraphStyle}>Se pueden utilizar cookies, almacenamiento local y tecnologías similares para sesiones, preferencias, seguridad, funcionamiento de la aplicación web y notificaciones. Los detalles se encuentran en la Política de Cookies.</p>

      <h2 style={legalHeadingStyle}>12. Cambios y contacto</h2>
      <p style={legalParagraphStyle}>Esta política puede actualizarse por cambios legales, técnicos o comerciales. Los cambios sustanciales se comunicarán mediante la plataforma, correo u otro medio adecuado. Contacto: <strong>contacto@tuagendaya.com</strong>.</p>
    </LegalDocumentPage>
  );
}

function CookiesPage() {
  return (
    <LegalDocumentPage title="Política de Cookies" lastUpdated="29 de julio de 2026">
      <p style={legalParagraphStyle}>TuAgendaYa utiliza cookies, almacenamiento local y tecnologías similares para permitir el funcionamiento seguro de su sitio y aplicación web.</p>

      <h2 style={legalHeadingStyle}>1. Tecnologías necesarias</h2>
      <p style={legalParagraphStyle}>Se utilizan para iniciar y mantener sesiones, autenticar usuarios, proteger cuentas, recordar configuraciones esenciales, habilitar la agenda y las reservas, gestionar la aplicación web progresiva y prestar funciones solicitadas. Bloquearlas puede impedir el funcionamiento correcto.</p>

      <h2 style={legalHeadingStyle}>2. Tecnologías funcionales</h2>
      <p style={legalParagraphStyle}>Pueden recordar preferencias de interfaz, vistas seleccionadas, configuraciones del negocio, métodos de pago aceptados y estado de funciones o notificaciones.</p>

      <h2 style={legalHeadingStyle}>3. Rendimiento y analítica</h2>
      <p style={legalParagraphStyle}>TuAgendaYa puede utilizar información técnica para detectar errores y mejorar rendimiento. Las herramientas analíticas no esenciales que requieran consentimiento no deberán activarse antes de obtenerlo.</p>

      <h2 style={legalHeadingStyle}>4. Terceros</h2>
      <p style={legalParagraphStyle}>Algunas funciones pueden depender de proveedores de autenticación, mapas, pagos, mensajería, soporte o seguridad. Estos proveedores pueden usar sus propios identificadores conforme a sus políticas.</p>

      <h2 style={legalHeadingStyle}>5. Notificaciones web</h2>
      <p style={legalParagraphStyle}>Al activar notificaciones, el navegador o dispositivo genera identificadores técnicos para enviar avisos autorizados. El permiso puede revocarse desde la configuración del navegador, dispositivo o perfil de TuAgendaYa.</p>

      <h2 style={legalHeadingStyle}>6. Administración</h2>
      <p style={legalParagraphStyle}>El usuario puede bloquear o eliminar cookies y datos del sitio desde su navegador. Esto puede cerrar la sesión, borrar preferencias o afectar algunas funciones.</p>

      <h2 style={legalHeadingStyle}>7. Cambios y contacto</h2>
      <p style={legalParagraphStyle}>Esta política puede actualizarse cuando cambien las tecnologías, proveedores u obligaciones legales. Consultas: <strong>contacto@tuagendaya.com</strong>.</p>
    </LegalDocumentPage>
  );
}

export default function App() {
  useEffect(() => {
    if (!isNativeIosApp()) return;

    const initializeLocalNotifications = async () => {
      try {
        let permission = await LocalNotifications.checkPermissions();

        if (permission.display === 'prompt' || permission.display === 'prompt-with-rationale') {
          permission = await LocalNotifications.requestPermissions();
        }

        if (permission.display !== 'granted') return;
      } catch (error) {
        console.error('No se pudieron inicializar las notificaciones locales:', error);
      }
    };

    initializeLocalNotifications();
  }, []);

  return (
    <>
      <MobileViewportController />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<UnifiedLoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route
          path="/profesional/login"
          element={
            localStorage.getItem('tuagendaya_token')
              ? <Navigate to="/profesional/dashboard" replace />
              : <Navigate to="/login?tipo=profesional" replace />
          }
        />
        <Route path="/profesional/register" element={<RegisterPage />} />
        <Route path="/profesional/dashboard" element={<ProfessionalOnlyRoute />} />

        <Route path="/admin" element={<Navigate to="/login" replace />} />
        <Route path="/admin/login" element={<Navigate to="/login" replace />} />
        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
        <Route path="/admin-app" element={<Navigate to="/login" replace />} />
        <Route path="/admin-app/dashboard" element={<AdminDashboardPage />} />

        <Route path="/terminos" element={<TermsPage />} />
        <Route path="/privacidad" element={<PrivacyPage />} />
        <Route path="/cookies" element={<CookiesPage />} />

        <Route path="/reservar/:slug" element={<BookPage />} />
        <Route path="/:slug" element={<BookPage />} />
      </Routes>
    </>
  );
}

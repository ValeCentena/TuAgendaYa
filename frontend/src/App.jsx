import { useState, useEffect, useRef } from 'react';
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
  const str = String(d).slice(0, 10);
  const [y, m, day] = str.split('-');
  if (!y || !m || !day) return 'Sin fecha';
  return `${day}/${m}/${y}`;
}

function formatTime(t) {
  if (!t) return null;
  return String(t).slice(0, 5);
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
        placeholder="Ej: Barbería, Odontología, Psicología..."
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
  const [email, setEmail] = useState('nuevo@tuagendaya.com');
  const [password, setPassword] = useState('12345678');
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
          placeholder="tu@email.com"
          required
          autoComplete="email"
        />

        <label style={smallLabelStyle}>Contraseña</label>
        <input
          style={{ ...inputStyle, marginBottom: 12 }}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) return setError('El nombre es obligatorio.');
    if (!form.businessName.trim()) return setError('El nombre del negocio es obligatorio.');
    if (!form.email.trim()) return setError('El email es obligatorio.');
    if (form.password.length < 8) return setError('La contraseña debe tener mínimo 8 caracteres.');
    if (!form.profession.trim()) return setError('El rubro o profesión es obligatorio.');
    if (!form.address.trim()) return setError('La dirección es obligatoria.');
    if (!form.slug.trim()) return setError('El link público es obligatorio.');

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

  return (
    <AuthLayout>
      <div style={{ textAlign: 'center', marginBottom: 22 }}>
        <TuAgendaLogo height={52} centered />
        <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a' }}>Crear cuenta profesional</div>
        <div style={{ fontSize: 13, color: '#6e6e73', marginTop: 4 }}>Configurá tu negocio en minutos</div>
      </div>

      <form onSubmit={handleSubmit}>
        <label style={smallLabelStyle}>Nombre del profesional *</label>
        <input
          style={{ ...inputStyle, marginBottom: 10 }}
          value={form.name}
          onChange={(e) => updateForm('name', e.target.value)}
          placeholder="Ej: Valentino"
          required
        />

        <label style={smallLabelStyle}>Nombre del negocio *</label>
        <input
          style={{ ...inputStyle, marginBottom: 10 }}
          value={form.businessName}
          onChange={(e) => updateForm('businessName', e.target.value)}
          placeholder="Ej: Barbería Centro"
          required
        />

        <label style={smallLabelStyle}>Email *</label>
        <input
          style={{ ...inputStyle, marginBottom: 10 }}
          type="email"
          value={form.email}
          onChange={(e) => updateForm('email', e.target.value)}
          placeholder="negocio@email.com"
          required
        />

        <label style={smallLabelStyle}>Contraseña *</label>
        <input
          style={{ ...inputStyle, marginBottom: 10 }}
          type="password"
          value={form.password}
          onChange={(e) => updateForm('password', e.target.value)}
          placeholder="Mínimo 8 caracteres"
          required
        />

        <label style={smallLabelStyle}>Teléfono</label>
        <input
          style={{ ...inputStyle, marginBottom: 10 }}
          value={form.phone}
          onChange={(e) => updateForm('phone', e.target.value)}
          placeholder="099 123 456"
        />

        <label style={smallLabelStyle}>Rubro / profesión *</label>
        <ProfessionCombobox
          value={form.profession}
          onChange={(value) => updateForm('profession', value)}
        />

        <label style={smallLabelStyle}>Dirección del negocio *</label>
        <input
          style={{ ...inputStyle, marginBottom: 10 }}
          value={form.address}
          onChange={(e) => updateForm('address', e.target.value)}
          placeholder="Ej: Av. Italia 1234, Montevideo"
          required
        />

        <label style={smallLabelStyle}>Link público *</label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 12, color: '#8e8e93', whiteSpace: 'nowrap' }}>/reservar/</span>
          <input
            style={{ ...inputStyle, marginBottom: 0 }}
            value={form.slug}
            onChange={(e) => updateForm('slug', e.target.value)}
            placeholder="barberia-centro"
            required
          />
        </div>

        {error && (
          <div style={{ background: '#fff2f2', border: '0.5px solid #ffcdd2', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: '#c62828', marginBottom: 12 }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: loading ? '#aeaeb2' : '#0071e3', color: '#fff', fontSize: 15, fontWeight: 700, fontFamily: 'inherit', cursor: loading ? 'not-allowed' : 'pointer', marginTop: 4 }}
        >
          {loading ? 'Creando cuenta...' : 'Crear cuenta'}
        </button>
      </form>

      <button
        type="button"
        onClick={() => navigate('/profesional/login')}
        style={{ width: '100%', marginTop: 12, padding: '12px', borderRadius: 12, border: '0.5px solid #d0d0d5', background: '#fff', color: '#0071e3', fontSize: 14, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}
      >
        Ya tengo cuenta
      </button>
    </AuthLayout>
  );
}

function ReservationsSection() {
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  let storedProfessional = {};

  try {
    storedProfessional = JSON.parse(localStorage.getItem('tuagendaya_professional')) || {};
  } catch {
    storedProfessional = {};
  }

  const businessName = storedProfessional.businessName || storedProfessional.business_name || storedProfessional.name || '';

  const fetchBookings = () => {
    const token = localStorage.getItem('tuagendaya_token');

    setLoadingBookings(true);

    fetch(`${API_BASE}/bookings/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setBookings(data.bookings || []))
      .catch(() => setBookings([]))
      .finally(() => setLoadingBookings(false));
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleAction = async (id, action) => {
    setActionLoading(`${id}-${action}`);
    const token = localStorage.getItem('tuagendaya_token');

    try {
      await fetch(`${API_BASE}/bookings/${id}/${action}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });

      fetchBookings();
    } catch {
      // no-op
    } finally {
      setActionLoading(null);
    }
  };

  const statusColor = { pending: '#ff9f0a', confirmed: '#30d158', cancelled: '#ff453a' };
  const statusLabel = { pending: 'Pendiente', confirmed: 'Confirmada', cancelled: 'Cancelada' };
  const statusBg = { pending: '#fff8ee', confirmed: '#edfff3', cancelled: '#fff2f2' };

  const pendingCount = bookings.filter((b) => b.status === 'pending').length;
  const confirmedCount = bookings.filter((b) => b.status === 'confirmed').length;
  const cancelledCount = bookings.filter((b) => b.status === 'cancelled').length;

  return (
    <>
      {!loadingBookings && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
          <div style={{ background: '#fff8ee', borderRadius: 16, padding: '14px 16px' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#ff9f0a' }}>{pendingCount}</div>
            <div style={{ fontSize: 12, color: '#8e8e93', marginTop: 2 }}>Pendientes</div>
          </div>

          <div style={{ background: '#edfff3', borderRadius: 16, padding: '14px 16px' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#30d158' }}>{confirmedCount}</div>
            <div style={{ fontSize: 12, color: '#8e8e93', marginTop: 2 }}>Confirmadas</div>
          </div>

          <div style={{ background: '#fff2f2', borderRadius: 16, padding: '14px 16px' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#ff453a' }}>{cancelledCount}</div>
            <div style={{ fontSize: 12, color: '#8e8e93', marginTop: 2 }}>Canceladas</div>
          </div>

          <div style={{ background: '#f2f2f7', borderRadius: 16, padding: '14px 16px', border: '0.5px solid #e8e8ed' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a' }}>{bookings.length}</div>
            <div style={{ fontSize: 12, color: '#8e8e93', marginTop: 2 }}>Total</div>
          </div>
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: 20, padding: '20px 24px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', marginBottom: 16 }}>Reservas recibidas</div>

        {loadingBookings ? (
          <div style={{ textAlign: 'center', color: '#aeaeb2', padding: 32 }}>Cargando reservas...</div>
        ) : bookings.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#aeaeb2', padding: 32 }}>
            <div style={{ fontWeight: 500 }}>No tenés reservas todavía.</div>
          </div>
        ) : (
          bookings.map((b) => {
            const isPending = b.status === 'pending';
            const isCancelled = b.status === 'cancelled';
            const dateStr = formatDate(b.bookingDate ?? b.booking_date);
            const timeStr = formatTime(b.startTime ?? b.start_time);
            const endStr = formatTime(b.endTime ?? b.end_time);
            const clientName = b.clientName ?? b.client_name;
            const clientPhone = b.clientPhone ?? b.client_phone;
            const serviceName = b.serviceName ?? b.service_name;
            const serviceDuration = b.serviceDurationMinutes ?? b.service_duration_minutes;
            const servicePrice = b.servicePrice ?? b.service_price;
            const staffName = b.staffName ?? b.staff_name;
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

            return (
              <div
                key={b.id}
                style={{
                  border: `1px solid ${isCancelled ? '#ffe0e0' : '#e8e8ed'}`,
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 10,
                  background: isCancelled ? '#fffafa' : '#fafafa',
                  opacity: isCancelled ? 0.72 : 1,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#1a1a1a' }}>{clientName}</div>

                    {clientPhone && (
                      <div style={{ fontSize: 12, color: '#6e6e73', marginTop: 2 }}>Teléfono: {clientPhone}</div>
                    )}

                    {serviceName && (
                      <div style={{ fontSize: 12, color: '#0071e3', marginTop: 4 }}>
                        Servicio: {serviceName}
                        {serviceDuration ? ` · ${serviceDuration} min` : ''}
                        {servicePrice ? ` · $${servicePrice}` : ''}
                      </div>
                    )}

                    {staffName && (
                      <div style={{ fontSize: 12, color: '#6e6e73', marginTop: 4 }}>
                        Profesional: {staffName}
                      </div>
                    )}
                  </div>

                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      flexShrink: 0,
                      whiteSpace: 'nowrap',
                      color: statusColor[b.status] || '#6e6e73',
                      background: statusBg[b.status] || '#f2f2f7',
                      padding: '4px 12px',
                      borderRadius: 20,
                    }}
                  >
                    {statusLabel[b.status] || b.status}
                  </span>
                </div>

                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 12,
                    background: '#fff',
                    border: '0.5px solid #e8e8ed',
                    borderRadius: 10,
                    padding: '7px 12px',
                    marginBottom: 8,
                    fontSize: 13,
                  }}
                >
                  <span>Fecha: <strong>{dateStr}</strong></span>

                  {timeStr && (
                    <span style={{ color: '#3a3a3c' }}>
                      Hora: <strong>{timeStr}</strong>
                      {endStr && <span style={{ color: '#aeaeb2', fontWeight: 400 }}> → {endStr}</span>}
                    </span>
                  )}
                </div>

                {b.comment && (
                  <div style={{ fontSize: 12, color: '#8e8e93', fontStyle: 'italic', marginBottom: 10, paddingLeft: 2 }}>
                    "{b.comment}"
                  </div>
                )}

                {clientPhone && !isCancelled && whatsappUrl && (
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
                      padding: '10px 12px',
                      borderRadius: 12,
                      border: '0.5px solid #c8f2d3',
                      background: '#edfff3',
                      color: '#188038',
                      fontSize: 13,
                      fontWeight: 800,
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                      marginTop: 6,
                      marginBottom: isPending ? 8 : 0,
                    }}
                  >
                    Enviar WhatsApp al cliente
                  </a>
                )}

                {isPending && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    <button
                      onClick={() => handleAction(b.id, 'confirm')}
                      disabled={actionLoading === `${b.id}-confirm`}
                      style={{
                        flex: 1,
                        padding: '9px 0',
                        borderRadius: 10,
                        border: 'none',
                        background: '#30d158',
                        color: '#fff',
                        fontSize: 13,
                        fontWeight: 600,
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                        opacity: actionLoading === `${b.id}-confirm` ? 0.6 : 1,
                      }}
                    >
                      {actionLoading === `${b.id}-confirm` ? '...' : 'Confirmar'}
                    </button>

                    <button
                      onClick={() => handleAction(b.id, 'cancel')}
                      disabled={actionLoading === `${b.id}-cancel`}
                      style={{
                        flex: 1,
                        padding: '9px 0',
                        borderRadius: 10,
                        border: 'none',
                        background: '#ff453a',
                        color: '#fff',
                        fontSize: 13,
                        fontWeight: 600,
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                        opacity: actionLoading === `${b.id}-cancel` ? 0.6 : 1,
                      }}
                    >
                      {actionLoading === `${b.id}-cancel` ? '...' : 'Cancelar'}
                    </button>
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

  useEffect(() => {
    fetchProfile();
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
          .dashboard-header-card {
            flex-direction: column;
            align-items: stretch !important;
            gap: 18px;
          }

          .dashboard-header-side {
            width: 100%;
            align-items: stretch !important;
          }

          .dashboard-business-logo-box {
            width: 100% !important;
            min-width: 0 !important;
            align-self: stretch !important;
          }

          .dashboard-tabs {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .dashboard-public-link {
            align-items: flex-start !important;
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
          <button style={tabStyle('disponibilidad')} onClick={() => setActiveTab('disponibilidad')}>Disponibilidad</button>
          <button style={tabStyle('servicios')} onClick={() => setActiveTab('servicios')}>Servicios</button>
          <button style={tabStyle('profesionales')} onClick={() => setActiveTab('profesionales')}>Profesionales</button>
          <button style={tabStyle('perfil')} onClick={() => setActiveTab('perfil')}>Perfil</button>
        </div>

        {activeTab === 'reservas' && <ReservationsSection />}
        {activeTab === 'disponibilidad' && <AvailabilitySection />}
        {activeTab === 'servicios' && <ServicesSection />}
        {activeTab === 'profesionales' && <StaffSection />}
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

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/profesional/login" replace />} />
      <Route path="/profesional/login" element={<ProfesionalPage />} />
      <Route path="/profesional/register" element={<RegisterPage />} />
      <Route path="/profesional/dashboard" element={<ProfesionalPage />} />
      <Route path="/reservar/:slug" element={<BookPage />} />
      <Route path="/:slug" element={<BookPage />} />
    </Routes>
  );
}

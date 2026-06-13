import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import BookPage from './pages/BookPage.jsx';

const API_BASE = 'https://tuagendaya-api.onrender.com/api';

const DAYS = [
  { dayOfWeek: 0, label: 'Domingo' },
  { dayOfWeek: 1, label: 'Lunes' },
  { dayOfWeek: 2, label: 'Martes' },
  { dayOfWeek: 3, label: 'Miércoles' },
  { dayOfWeek: 4, label: 'Jueves' },
  { dayOfWeek: 5, label: 'Viernes' },
  { dayOfWeek: 6, label: 'Sábado' },
];

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

function LoginForm({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 10,
    border: '0.5px solid #d0d0d5',
    fontSize: 14,
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
    marginBottom: 12,
    background: '#fff',
    color: '#1a1a1a',
  };

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

        onLogin(data.professional);
      }
    } catch {
      setError('No se pudo conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f2f2f7',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>

      <div
        style={{
          background: '#fff',
          borderRadius: 24,
          padding: '36px 32px',
          border: '0.5px solid #e0e0e5',
          width: '100%',
          maxWidth: 400,
          animation: 'slideUp 250ms cubic-bezier(0.16,1,0.3,1) both',
          boxShadow: '0 2px 40px rgba(0,0,0,0.06)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: '-0.03em',
              color: '#0071e3',
              marginBottom: 4,
            }}
          >
            TuAgendaYa
          </div>

          <div style={{ fontSize: 14, color: '#6e6e73' }}>
            Accedé a tu panel profesional
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ fontSize: 11, color: '#6e6e73', marginBottom: 4 }}>Email</div>

          <input
            style={inputStyle}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            required
            autoComplete="email"
          />

          <div style={{ fontSize: 11, color: '#6e6e73', marginBottom: 4 }}>Contraseña</div>

          <input
            style={inputStyle}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />

          {error && (
            <div
              style={{
                background: '#fff2f2',
                border: '0.5px solid #ffcdd2',
                borderRadius: 10,
                padding: '10px 12px',
                fontSize: 13,
                color: '#c62828',
                marginBottom: 12,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '13px',
              borderRadius: 12,
              border: 'none',
              background: loading ? '#aeaeb2' : '#0071e3',
              color: '#fff',
              fontSize: 15,
              fontWeight: 600,
              fontFamily: 'inherit',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: 4,
            }}
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <div style={{ textAlign: 'center', fontSize: 11, color: '#aeaeb2', marginTop: 16 }}>
          🔒 Tus datos están cifrados y protegidos
        </div>
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

  const token = localStorage.getItem('tuagendaya_token');

  const loadAvailability = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/professionals/me/availability`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || 'No se pudo cargar la disponibilidad');
      }

      const list = data.availability || data.days || data;

      if (Array.isArray(list) && list.length > 0) {
        const normalized = getDefaultAvailability().map((defaultDay) => {
          const found = list.find((item) => {
            const itemDay = Number(item.dayOfWeek ?? item.day_of_week);
            return itemDay === defaultDay.dayOfWeek;
          });

          return found ? normalizeAvailabilityItem(found) : defaultDay;
        });

        setAvailability(normalized);
      } else {
        setAvailability(getDefaultAvailability());
      }
    } catch (err) {
      setError(err.message || 'No se pudo cargar la disponibilidad');
      setAvailability(getDefaultAvailability());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAvailability();
  }, []);

  const updateDay = (dayOfWeek, field, value) => {
    setAvailability((prev) =>
      prev.map((day) =>
        day.dayOfWeek === dayOfWeek
          ? {
              ...day,
              [field]: value,
            }
          : day
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    setError('');

    const payload = availability.map((day) => ({
      dayOfWeek: day.dayOfWeek,
      isActive: Boolean(day.isActive),
      startTime: day.startTime,
      endTime: day.endTime,
      slotDurationMinutes: Number(day.slotDurationMinutes || 30),
    }));

    try {
      let res = await fetch(`${API_BASE}/professionals/me/availability`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ availability: payload }),
      });

      if (!res.ok) {
        res = await fetch(`${API_BASE}/professionals/me/availability`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || 'No se pudo guardar la disponibilidad');
      }

      setMessage('✓ Disponibilidad guardada correctamente.');

      setTimeout(() => {
        setMessage('');
      }, 3000);
    } catch (err) {
      setError(err.message || 'No se pudo guardar la disponibilidad');
    } finally {
      setSaving(false);
    }
  };

  const rowStyle = {
    display: 'grid',
    gridTemplateColumns: '1.1fr 0.8fr 0.9fr 0.9fr 0.9fr',
    gap: 10,
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: '0.5px solid #e8e8ed',
  };

  const inputStyle = {
    width: '100%',
    height: 38,
    borderRadius: 10,
    border: '0.5px solid #d0d0d5',
    padding: '0 10px',
    fontSize: 13,
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    background: '#fff',
  };

  if (loading) {
    return (
      <div style={{ background: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ color: '#8e8e93', textAlign: 'center', padding: 24 }}>
          Cargando disponibilidad...
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#fff', borderRadius: 20, padding: '20px 24px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>Mi disponibilidad</div>
        <div style={{ fontSize: 13, color: '#6e6e73', marginTop: 4 }}>
          Configurá los días y horarios que tus clientes pueden reservar.
        </div>
      </div>

      {error && (
        <div
          style={{
            background: '#fff2f2',
            border: '0.5px solid #ffcdd2',
            borderRadius: 12,
            padding: '10px 12px',
            color: '#c62828',
            fontSize: 13,
            marginBottom: 14,
          }}
        >
          {error}
        </div>
      )}

      {message && (
        <div
          style={{
            background: '#edfff3',
            border: '0.5px solid #b7f5c6',
            borderRadius: 12,
            padding: '10px 12px',
            color: '#1c7c38',
            fontSize: 13,
            marginBottom: 14,
            fontWeight: 600,
          }}
        >
          {message}
        </div>
      )}

      <div
        style={{
          ...rowStyle,
          color: '#8e8e93',
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        <div>Día</div>
        <div>Estado</div>
        <div>Inicio</div>
        <div>Cierre</div>
        <div>Duración</div>
      </div>

      {availability.map((day) => {
        const dayInfo = DAYS.find((d) => d.dayOfWeek === day.dayOfWeek);

        return (
          <div key={day.dayOfWeek} style={rowStyle}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>
              {dayInfo?.label || `Día ${day.dayOfWeek}`}
            </div>

            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                color: day.isActive ? '#1c7c38' : '#8e8e93',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={day.isActive}
                onChange={(e) => updateDay(day.dayOfWeek, 'isActive', e.target.checked)}
              />
              {day.isActive ? 'Activo' : 'Inactivo'}
            </label>

            <input
              type="time"
              value={day.startTime}
              disabled={!day.isActive}
              onChange={(e) => updateDay(day.dayOfWeek, 'startTime', e.target.value)}
              style={{
                ...inputStyle,
                opacity: day.isActive ? 1 : 0.45,
              }}
            />

            <input
              type="time"
              value={day.endTime}
              disabled={!day.isActive}
              onChange={(e) => updateDay(day.dayOfWeek, 'endTime', e.target.value)}
              style={{
                ...inputStyle,
                opacity: day.isActive ? 1 : 0.45,
              }}
            />

            <select
              value={day.slotDurationMinutes}
              disabled={!day.isActive}
              onChange={(e) => updateDay(day.dayOfWeek, 'slotDurationMinutes', Number(e.target.value))}
              style={{
                ...inputStyle,
                opacity: day.isActive ? 1 : 0.45,
              }}
            >
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
              <option value={45}>45 min</option>
              <option value={60}>60 min</option>
              <option value={90}>90 min</option>
              <option value={120}>120 min</option>
            </select>
          </div>
        );
      })}

      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          width: '100%',
          marginTop: 18,
          padding: '13px',
          borderRadius: 12,
          border: 'none',
          background: saving ? '#aeaeb2' : '#0071e3',
          color: '#fff',
          fontSize: 15,
          fontWeight: 700,
          fontFamily: 'inherit',
          cursor: saving ? 'not-allowed' : 'pointer',
        }}
      >
        {saving ? 'Guardando...' : 'Guardar disponibilidad'}
      </button>
    </div>
  );
}

function Dashboard({ professional, onLogout }) {
  const [activeTab, setActiveTab] = useState('reservas');
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

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
      // No romper la pantalla
    } finally {
      setActionLoading(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('tuagendaya_token');
    localStorage.removeItem('tuagendaya_professional');
    onLogout();
  };

  const statusColor = {
    pending: '#ff9f0a',
    confirmed: '#30d158',
    cancelled: '#ff453a',
  };

  const statusLabel = {
    pending: 'Pendiente',
    confirmed: 'Confirmada',
    cancelled: 'Cancelada',
  };

  const statusBg = {
    pending: '#fff8ee',
    confirmed: '#edfff3',
    cancelled: '#fff2f2',
  };

  const pendingCount = bookings.filter((b) => b.status === 'pending').length;
  const confirmedCount = bookings.filter((b) => b.status === 'confirmed').length;
  const cancelledCount = bookings.filter((b) => b.status === 'cancelled').length;

  const tabButton = (key, label) => ({
    flex: 1,
    padding: '12px',
    borderRadius: 14,
    border: 'none',
    background: activeTab === key ? '#0071e3' : '#fff',
    color: activeTab === key ? '#fff' : '#1a1a1a',
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer',
    boxShadow: activeTab === key ? '0 4px 16px rgba(0,113,227,0.25)' : '0 1px 8px rgba(0,0,0,0.05)',
  });

  return (
    <div style={{ minHeight: '100vh', background: '#f2f2f7', padding: '20px 16px' }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <div
          style={{
            background: '#fff',
            borderRadius: 20,
            padding: '18px 24px',
            marginBottom: 16,
            boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#0071e3' }}>TuAgendaYa</div>
            <div style={{ fontSize: 13, color: '#6e6e73', marginTop: 2 }}>
              Hola, {professional?.name || 'profesional'} 👋
            </div>
          </div>

          <button
            onClick={handleLogout}
            style={{
              padding: '8px 16px',
              borderRadius: 10,
              border: '0.5px solid #e0e0e5',
              background: 'transparent',
              fontSize: 13,
              color: '#6e6e73',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Cerrar sesión
          </button>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <button onClick={() => setActiveTab('reservas')} style={tabButton('reservas', 'Reservas')}>
            📋 Reservas
          </button>

          <button onClick={() => setActiveTab('disponibilidad')} style={tabButton('disponibilidad', 'Disponibilidad')}>
            🗓 Disponibilidad
          </button>
        </div>

        {activeTab === 'reservas' && (
          <>
            {!loadingBookings && bookings.length > 0 && (
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
              <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', marginBottom: 16 }}>
                Reservas recibidas
              </div>

              {loadingBookings ? (
                <div style={{ textAlign: 'center', color: '#aeaeb2', padding: 32 }}>
                  Cargando reservas...
                </div>
              ) : bookings.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#aeaeb2', padding: 32 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>

                  <div style={{ fontWeight: 500 }}>No tenés reservas todavía.</div>

                  <div style={{ fontSize: 12, marginTop: 8, color: '#c0c0c5' }}>
                    Tu link público: <strong>tuagendaya-web.onrender.com/reservar/{professional?.slug}</strong>
                  </div>
                </div>
              ) : (
                bookings.map((b) => {
                  const isPending = b.status === 'pending';
                  const isCancelled = b.status === 'cancelled';
                  const dateStr = formatDate(b.booking_date);
                  const timeStr = formatTime(b.start_time);
                  const endStr = formatTime(b.end_time);
                  const hasDateTime = b.booking_date || b.start_time;

                  return (
                    <div
                      key={b.id}
                      style={{
                        border: `1px solid ${isCancelled ? '#ffe0e0' : '#e8e8ed'}`,
                        borderRadius: 16,
                        padding: '16px',
                        marginBottom: 10,
                        background: isCancelled ? '#fffafa' : '#fafafa',
                        opacity: isCancelled ? 0.72 : 1,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: 12,
                          marginBottom: 10,
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 14, color: '#1a1a1a' }}>
                            {b.client_name}
                          </div>

                          {b.client_phone && (
                            <div style={{ fontSize: 12, color: '#6e6e73', marginTop: 2 }}>
                              📞 {b.client_phone}
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

                      {hasDateTime && (
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
                          <span>
                            📅 <strong>{dateStr}</strong>
                          </span>

                          {timeStr && (
                            <span style={{ color: '#3a3a3c' }}>
                              ⏰ <strong>{timeStr}</strong>
                              {endStr && <span style={{ color: '#aeaeb2', fontWeight: 400 }}> → {endStr}</span>}
                            </span>
                          )}
                        </div>
                      )}

                      {b.comment && (
                        <div style={{ fontSize: 12, color: '#8e8e93', fontStyle: 'italic', marginBottom: 10, paddingLeft: 2 }}>
                          "{b.comment}"
                        </div>
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
                            {actionLoading === `${b.id}-confirm` ? '...' : '✓ Confirmar'}
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
                            {actionLoading === `${b.id}-cancel` ? '...' : '✕ Cancelar'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {activeTab === 'disponibilidad' && <AvailabilitySection />}
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

  if (!professional) {
    return <LoginForm onLogin={(prof) => setProfessional(prof || {})} />;
  }

  return <Dashboard professional={professional} onLogout={() => setProfessional(null)} />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/profesional/login" replace />} />
      <Route path="/profesional/login" element={<ProfesionalPage />} />
      <Route path="/profesional/dashboard" element={<ProfesionalPage />} />
      <Route path="/reservar/:slug" element={<BookPage />} />
      <Route path="/:slug" element={<BookPage />} />
    </Routes>
  );
}
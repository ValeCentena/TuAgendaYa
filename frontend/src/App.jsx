import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import BookPage from './pages/BookPage.jsx';

const API_BASE = 'https://tuagendaya-api.onrender.com/api';

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

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

// ── Login ─────────────────────────────────────────────────────
function LoginForm({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 10,
    border: '0.5px solid #d0d0d5', fontSize: 14, fontFamily: 'inherit',
    outline: 'none', boxSizing: 'border-box', marginBottom: 12,
    background: '#fff', color: '#1a1a1a',
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
    <div style={{ minHeight: '100vh', background: '#f2f2f7', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={{ background: '#fff', borderRadius: 24, padding: '36px 32px', border: '0.5px solid #e0e0e5', width: '100%', maxWidth: 400, animation: 'slideUp 250ms cubic-bezier(0.16,1,0.3,1) both', boxShadow: '0 2px 40px rgba(0,0,0,0.06)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', color: '#0071e3', marginBottom: 4 }}>TuAgendaYa</div>
          <div style={{ fontSize: 14, color: '#6e6e73' }}>Accedé a tu panel profesional</div>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ fontSize: 11, color: '#6e6e73', marginBottom: 4 }}>Email</div>
          <input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" required autoComplete="email" />
          <div style={{ fontSize: 11, color: '#6e6e73', marginBottom: 4 }}>Contraseña</div>
          <input style={inputStyle} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required autoComplete="current-password" />
          {error && (
            <div style={{ background: '#fff2f2', border: '0.5px solid #ffcdd2', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: '#c62828', marginBottom: 12 }}>
              {error}
            </div>
          )}
          <button type="submit" disabled={loading} style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: loading ? '#aeaeb2' : '#0071e3', color: '#fff', fontSize: 15, fontWeight: 600, fontFamily: 'inherit', cursor: loading ? 'not-allowed' : 'pointer', marginTop: 4 }}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
        <div style={{ textAlign: 'center', fontSize: 11, color: '#aeaeb2', marginTop: 16 }}>🔒 Tus datos están cifrados y protegidos</div>
      </div>
    </div>
  );
}

// ── Sección disponibilidad ────────────────────────────────────
function AvailabilitySection({ token }) {
  const makeDefault = () => [0,1,2,3,4,5,6].map(d => ({
    day_of_week:   d,
    is_active:     d >= 1 && d <= 5 ? 1 : 0,
    start_time:    '09:00',
    end_time:      '18:00',
    break_enabled: 0,
    break_start:   '13:00',
    break_end:     '14:00',
  }));

  const [days, setDays] = useState(makeDefault());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetch(`${API_BASE}/professionals/me/availability`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        if (data.availability && Array.isArray(data.availability)) {
          const defaults = makeDefault();
          const filled = [0,1,2,3,4,5,6].map(d => {
            const found = data.availability.find(a => a.day_of_week === d);
            return found ? {
              day_of_week:   found.day_of_week,
              is_active:     found.is_active     === 1 || found.is_active     === true ? 1 : 0,
              start_time:    found.start_time    || '09:00',
              end_time:      found.end_time      || '18:00',
              break_enabled: found.break_enabled === 1 || found.break_enabled === true ? 1 : 0,
              break_start:   found.break_start   || '13:00',
              break_end:     found.break_end     || '14:00',
            } : defaults[d];
          });
          setDays(filled);
        }
      })
      .catch(() => setErrorMsg('No se pudo cargar la disponibilidad.'))
      .finally(() => setLoading(false));
  }, [token]);

  const updateDay = (index, field, value) => {
    setDays(prev => prev.map((d, i) => i === index ? { ...d, [field]: value } : d));
  };

  const handleSave = async () => {
    setSaving(true);
    setSavedMsg('');
    setErrorMsg('');
    try {
      const body = {
        availability: days.map(d => ({
          dayOfWeek:    d.day_of_week,
          // Siempre enviar como integer 0/1, nunca como boolean
          isActive:     d.is_active === 1 || d.is_active === true ? 1 : 0,
          startTime:    d.start_time  || '09:00',
          endTime:      d.end_time    || '18:00',
          breakEnabled: d.break_enabled === 1 || d.break_enabled === true ? 1 : 0,
          // Enviar null si la pausa no está habilitada, para limpiar valores viejos
          breakStart:   (d.break_enabled === 1 || d.break_enabled === true) ? (d.break_start || '13:00') : null,
          breakEnd:     (d.break_enabled === 1 || d.break_enabled === true) ? (d.break_end   || '14:00') : null,
        })),
      };
      const res = await fetch(`${API_BASE}/professionals/me/availability`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Error al guardar disponibilidad.');
      } else {
        setSavedMsg('Disponibilidad guardada.');
        setTimeout(() => setSavedMsg(''), 3000);
        if (data.availability && Array.isArray(data.availability)) {
          const defaults = makeDefault();
          const filled = [0,1,2,3,4,5,6].map(d => {
            const found = data.availability.find(a => a.day_of_week === d);
            return found ? {
              day_of_week:   found.day_of_week,
              is_active:     found.is_active     === 1 || found.is_active     === true ? 1 : 0,
              start_time:    found.start_time    || '09:00',
              end_time:      found.end_time      || '18:00',
              break_enabled: found.break_enabled === 1 || found.break_enabled === true ? 1 : 0,
              break_start:   found.break_start   || '13:00',
              break_end:     found.break_end     || '14:00',
            } : defaults[d];
          });
          setDays(filled);
        }
      }
    } catch {
      setErrorMsg('No se pudo conectar con el servidor.');
    } finally {
      setSaving(false);
    }
  };

  const Toggle = ({ on, onChange, ariaLabel }) => (
    <button
      type="button"
      onClick={() => onChange(!on)}
      aria-label={ariaLabel}
      style={{
        width: 40, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
        background: on ? '#30d158' : '#d1d1d6',
        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: 2, left: on ? 18 : 2,
        width: 20, height: 20, borderRadius: '50%', background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.25)', transition: 'left 0.2s', display: 'block',
      }} />
    </button>
  );

  const inputSm = {
    padding: '6px 8px', borderRadius: 8, border: '0.5px solid #d0d0d5',
    fontSize: 13, fontFamily: 'inherit', outline: 'none', background: '#fff',
    color: '#1a1a1a', width: '100%', boxSizing: 'border-box',
  };

  return (
    <div style={{ background: '#fff', borderRadius: 20, padding: '20px 24px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', marginBottom: 16 }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', marginBottom: 4 }}>Mi disponibilidad</div>
      <div style={{ fontSize: 12, color: '#8e8e93', marginBottom: 16 }}>
        Configurá los días, horarios y pausas. La duración de cada turno se define en tus servicios.
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: '#aeaeb2', padding: '20px 0', fontSize: 13 }}>Cargando disponibilidad...</div>
      ) : (
        <>
          {days.map((day, i) => {
            const active       = day.is_active     === 1 || day.is_active     === true;
            const breakOn      = day.break_enabled === 1 || day.break_enabled === true;

            return (
              <div
                key={day.day_of_week}
                style={{
                  borderBottom: i < 6 ? '0.5px solid #f0f0f5' : 'none',
                  padding: '10px 0',
                }}
              >
                {/* Fila principal: día · activo · desde · hasta */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '100px 44px 1fr 1fr',
                  gap: 10, alignItems: 'center',
                  opacity: active ? 1 : 0.45,
                }}>
                  <div style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: '#1a1a1a' }}>
                    {DAY_NAMES[day.day_of_week]}
                  </div>
                  <Toggle
                    on={active}
                    ariaLabel={active ? 'Desactivar día' : 'Activar día'}
                    onChange={v => updateDay(i, 'is_active', v ? 1 : 0)}
                  />
                  <input
                    type="time"
                    style={{ ...inputSm, opacity: active ? 1 : 0.5 }}
                    value={day.start_time || '09:00'}
                    disabled={!active}
                    onChange={e => updateDay(i, 'start_time', e.target.value)}
                  />
                  <input
                    type="time"
                    style={{ ...inputSm, opacity: active ? 1 : 0.5 }}
                    value={day.end_time || '18:00'}
                    disabled={!active}
                    onChange={e => updateDay(i, 'end_time', e.target.value)}
                  />
                </div>

                {/* Fila pausa — solo si el día está activo */}
                {active && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '100px 44px 1fr 1fr',
                    gap: 10, alignItems: 'center',
                    marginTop: 6,
                    paddingLeft: 0,
                  }}>
                    <div style={{ fontSize: 11, color: '#8e8e93', paddingLeft: 2 }}>Pausa</div>
                    <Toggle
                      on={breakOn}
                      ariaLabel={breakOn ? 'Quitar pausa' : 'Agregar pausa'}
                      onChange={v => updateDay(i, 'break_enabled', v ? 1 : 0)}
                    />
                    <input
                      type="time"
                      style={{ ...inputSm, opacity: breakOn ? 1 : 0.4, fontSize: 12 }}
                      value={day.break_start || '13:00'}
                      disabled={!breakOn}
                      onChange={e => updateDay(i, 'break_start', e.target.value)}
                    />
                    <input
                      type="time"
                      style={{ ...inputSm, opacity: breakOn ? 1 : 0.4, fontSize: 12 }}
                      value={day.break_end || '14:00'}
                      disabled={!breakOn}
                      onChange={e => updateDay(i, 'break_end', e.target.value)}
                    />
                  </div>
                )}
              </div>
            );
          })}

          {/* Leyenda de columnas */}
          <div style={{
            display: 'grid', gridTemplateColumns: '100px 44px 1fr 1fr',
            gap: 10, marginTop: 10, paddingTop: 10, borderTop: '0.5px solid #f0f0f5',
          }}>
            {['Día', '', 'Apertura', 'Cierre'].map((h, k) => (
              <div key={k} style={{ fontSize: 10, color: '#b0b0b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</div>
            ))}
          </div>

          {/* Botón guardar */}
          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '10px 24px', borderRadius: 12, border: 'none',
                background: saving ? '#aeaeb2' : '#0071e3',
                color: '#fff', fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Guardando...' : 'Guardar disponibilidad'}
            </button>
            {savedMsg && <div style={{ fontSize: 13, color: '#30d158', fontWeight: 500 }}>✓ {savedMsg}</div>}
            {errorMsg && <div style={{ fontSize: 13, color: '#ff453a' }}>⚠ {errorMsg}</div>}
          </div>
        </>
      )}
    </div>
  );
}

// ── Dashboard ────────────────────────────────────────────────
function Dashboard({ professional, onLogout }) {
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [activeTab, setActiveTab] = useState('reservas');

  const token = localStorage.getItem('tuagendaya_token');

  const fetchBookings = () => {
    setLoadingBookings(true);
    fetch(`${API_BASE}/bookings/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => setBookings(data.bookings || []))
      .catch(() => setBookings([]))
      .finally(() => setLoadingBookings(false));
  };

  useEffect(() => { fetchBookings(); }, []);

  const handleAction = async (id, action) => {
    setActionLoading(`${id}-${action}`);
    try {
      await fetch(`${API_BASE}/bookings/${id}/${action}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchBookings();
    } catch {
      // silently ignore
    } finally {
      setActionLoading(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('tuagendaya_token');
    localStorage.removeItem('tuagendaya_professional');
    onLogout();
  };

  const statusColor = { pending: '#ff9f0a', confirmed: '#30d158', cancelled: '#ff453a' };
  const statusLabel = { pending: 'Pendiente', confirmed: 'Confirmada', cancelled: 'Cancelada' };
  const statusBg    = { pending: '#fff8ee', confirmed: '#edfff3', cancelled: '#fff2f2' };

  const pendingCount   = bookings.filter(b => b.status === 'pending').length;
  const confirmedCount = bookings.filter(b => b.status === 'confirmed').length;
  const cancelledCount = bookings.filter(b => b.status === 'cancelled').length;

  const tabStyle = (tab) => ({
    padding: '8px 18px', borderRadius: 10, border: 'none', fontSize: 13,
    fontWeight: activeTab === tab ? 600 : 400,
    background: activeTab === tab ? '#0071e3' : 'transparent',
    color: activeTab === tab ? '#fff' : '#6e6e73',
    cursor: 'pointer', fontFamily: 'inherit',
  });

  return (
    <div style={{ minHeight: '100vh', background: '#f2f2f7', padding: '20px 16px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ background: '#fff', borderRadius: 20, padding: '18px 24px', marginBottom: 16, boxShadow: '0 1px 8px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#0071e3' }}>TuAgendaYa</div>
            <div style={{ fontSize: 13, color: '#6e6e73', marginTop: 2 }}>Hola, {professional?.name || 'profesional'} 👋</div>
          </div>
          <button onClick={handleLogout} style={{ padding: '8px 16px', borderRadius: 10, border: '0.5px solid #e0e0e5', background: 'transparent', fontSize: 13, color: '#6e6e73', cursor: 'pointer', fontFamily: 'inherit' }}>
            Cerrar sesión
          </button>
        </div>

        {/* Tabs */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '8px 12px', marginBottom: 16, boxShadow: '0 1px 8px rgba(0,0,0,0.06)', display: 'flex', gap: 4 }}>
          <button style={tabStyle('reservas')} onClick={() => setActiveTab('reservas')}>📋 Reservas</button>
          <button style={tabStyle('disponibilidad')} onClick={() => setActiveTab('disponibilidad')}>🗓 Disponibilidad</button>
        </div>

        {/* Tab: Reservas */}
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
              <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', marginBottom: 16 }}>Reservas recibidas</div>

              {loadingBookings ? (
                <div style={{ textAlign: 'center', color: '#aeaeb2', padding: 32 }}>Cargando reservas...</div>
              ) : bookings.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#aeaeb2', padding: 32 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                  <div style={{ fontWeight: 500 }}>No tenés reservas todavía.</div>
                  <div style={{ fontSize: 12, marginTop: 8, color: '#c0c0c5' }}>
                    Tu link público: <strong>tuagendaya-web.onrender.com/reservar/{professional?.slug}</strong>
                  </div>
                </div>
              ) : (
                bookings.map(b => {
                  const isPending   = b.status === 'pending';
                  const isCancelled = b.status === 'cancelled';
                  const dateStr = formatDate(b.booking_date);
                  const timeStr = formatTime(b.start_time);
                  const endStr  = formatTime(b.end_time);
                  const hasDateTime = b.booking_date || b.start_time;

                  return (
                    <div
                      key={b.id}
                      style={{
                        border: `1px solid ${isCancelled ? '#ffe0e0' : '#e8e8ed'}`,
                        borderRadius: 16, padding: '16px', marginBottom: 10,
                        background: isCancelled ? '#fffafa' : '#fafafa',
                        opacity: isCancelled ? 0.72 : 1,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 14, color: '#1a1a1a' }}>{b.client_name}</div>
                          {b.client_phone && (
                            <div style={{ fontSize: 12, color: '#6e6e73', marginTop: 2 }}>📞 {b.client_phone}</div>
                          )}
                        </div>
                        <span style={{
                          fontSize: 11, fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap',
                          color: statusColor[b.status] || '#6e6e73',
                          background: statusBg[b.status] || '#f2f2f7',
                          padding: '4px 12px', borderRadius: 20,
                        }}>
                          {statusLabel[b.status] || b.status}
                        </span>
                      </div>

                      {hasDateTime && (
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', gap: 12,
                          background: '#fff', border: '0.5px solid #e8e8ed',
                          borderRadius: 10, padding: '7px 12px', marginBottom: 8, fontSize: 13,
                        }}>
                          <span>📅 <strong>{dateStr}</strong></span>
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
                              flex: 1, padding: '9px 0', borderRadius: 10, border: 'none',
                              background: '#30d158', color: '#fff', fontSize: 13, fontWeight: 600,
                              fontFamily: 'inherit', cursor: 'pointer',
                              opacity: actionLoading === `${b.id}-confirm` ? 0.6 : 1,
                            }}
                          >
                            {actionLoading === `${b.id}-confirm` ? '...' : '✓ Confirmar'}
                          </button>
                          <button
                            onClick={() => handleAction(b.id, 'cancel')}
                            disabled={actionLoading === `${b.id}-cancel`}
                            style={{
                              flex: 1, padding: '9px 0', borderRadius: 10, border: 'none',
                              background: '#ff453a', color: '#fff', fontSize: 13, fontWeight: 600,
                              fontFamily: 'inherit', cursor: 'pointer',
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

        {/* Tab: Disponibilidad */}
        {activeTab === 'disponibilidad' && (
          <AvailabilitySection token={token} />
        )}

      </div>
    </div>
  );
}

// ── Pantalla profesional ──────────────────────────────────────
function ProfesionalPage() {
  const [professional, setProfessional] = useState(() => {
    const token = localStorage.getItem('tuagendaya_token');
    if (!token) return null;
    try { return JSON.parse(localStorage.getItem('tuagendaya_professional')); } catch { return {}; }
  });

  if (!professional) {
    return <LoginForm onLogin={prof => setProfessional(prof || {})} />;
  }
  return <Dashboard professional={professional} onLogout={() => setProfessional(null)} />;
}

// ── App ───────────────────────────────────────────────────────
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

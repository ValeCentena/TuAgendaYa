import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getMe,
  getMyBookings,
  cancelBooking,
  getMyAvailability,
  updateMyAvailability,
  updateMe,
  ApiError,
} from '../api/client';

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const DEFAULT_SCHEDULE = [1, 2, 3, 4, 5].map((day) => ({
  day_of_week: day,
  start_time: '09:00',
  end_time: '17:00',
  enabled: true,
}));

export default function DashboardPage() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const [tab, setTab] = useState('agenda');
  const [professional, setProfessional] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [schedule, setSchedule] = useState(DEFAULT_SCHEDULE);
  const [profile, setProfile] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (!token) {
      navigate('/profesional/login');
      return;
    }

    Promise.all([getMe(token), getMyBookings(token), getMyAvailability(token)])
      .then(([me, bks, avail]) => {
        setProfessional(me);
        setProfile(me);
        setBookings(bks);

        if (avail.length > 0) {
          const sched = DAYS.map((_, i) => {
            const windows = avail.filter((a) => a.day_of_week === i);
            return {
              day_of_week: i,
              start_time: windows[0]?.start_time || '09:00',
              end_time: windows[0]?.end_time || '17:00',
              enabled: windows.length > 0,
            };
          });
          setSchedule(sched);
        }
      })
      .catch(() => navigate('/profesional/login'))
      .finally(() => setLoading(false));
  }, [token, navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('professional');
    navigate('/profesional/login');
  };

  const handleCancel = async (id) => {
    try {
      await cancelBooking(token, id);
      setBookings((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof ApiError ? err.message : 'Error al cancelar' });
    }
  };

  const handleSaveAvailability = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const slots = schedule
        .filter((s) => s.enabled)
        .map(({ day_of_week, start_time, end_time }) => ({ day_of_week, start_time, end_time }));
      await updateMyAvailability(token, slots);
      setMessage({ type: 'success', text: 'Disponibilidad actualizada' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof ApiError ? err.message : 'Error al guardar' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const updated = await updateMe(token, {
        name: profile.name,
        specialty: profile.specialty,
        phone: profile.phone,
        bio: profile.bio,
        durationMinutes: Number(profile.duration_minutes),
      });
      setProfessional(updated);
      setMessage({ type: 'success', text: 'Perfil actualizado' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof ApiError ? err.message : 'Error al guardar' });
    } finally {
      setSaving(false);
    }
  };

  const copyLink = () => {
    const url = `${window.location.origin}/reservar/${professional.slug}`;
    navigator.clipboard.writeText(url);
    setMessage({ type: 'success', text: 'Link copiado al portapapeles' });
  };

  if (loading) return <p className="empty-state">Cargando panel...</p>;

  return (
    <div>
      <header className="app-header">
        <Link to="/" className="app-logo">Tu<span>Agenda</span>Ya</Link>
        <button type="button" className="btn btn-secondary" onClick={handleLogout}>Cerrar sesión</button>
      </header>

      <div className="dashboard">
        <div className="dashboard-header">
          <div>
            <h1>Hola, {professional.name}</h1>
            <p style={{ color: 'var(--color-text-muted)', margin: '0.25rem 0 0' }}>
              Tu link de reservas:{' '}
              <button type="button" className="btn btn-ghost" onClick={copyLink} style={{ padding: 0, color: 'var(--color-primary)' }}>
                /reservar/{professional.slug}
              </button>
            </p>
          </div>
        </div>

        {message && (
          <div className={`alert alert-${message.type === 'success' ? 'success' : 'error'}`}>{message.text}</div>
        )}

        <div className="tabs">
          <button type="button" className={`tab${tab === 'agenda' ? ' active' : ''}`} onClick={() => setTab('agenda')}>
            Agenda ({bookings.length})
          </button>
          <button type="button" className={`tab${tab === 'disponibilidad' ? ' active' : ''}`} onClick={() => setTab('disponibilidad')}>
            Disponibilidad
          </button>
          <button type="button" className={`tab${tab === 'perfil' ? ' active' : ''}`} onClick={() => setTab('perfil')}>
            Perfil
          </button>
        </div>

        {tab === 'agenda' && (
          <div className="card">
            {bookings.length === 0 ? (
              <p className="empty-state">No tenés turnos agendados.</p>
            ) : (
              <ul className="booking-list" style={{ padding: '0.5rem' }}>
                {bookings.map((b) => (
                  <li key={b.id} className="booking-item card" style={{ boxShadow: 'none' }}>
                    <span className="date-badge">{b.date} · {b.time}</span>
                    <div className="client-info">
                      <strong>{b.client_name}</strong>
                      <span>{b.client_phone}</span>
                    </div>
                    <button type="button" className="btn btn-danger" onClick={() => handleCancel(b.id)}>
                      Cancelar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === 'disponibilidad' && (
          <div className="card card-padded">
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
              Configurá los días y horarios en los que aceptás turnos.
            </p>
            <div className="avail-grid">
              {schedule.map((row, i) => (
                <div key={row.day_of_week} className="avail-row">
                  <label>
                    <input
                      type="checkbox"
                      checked={row.enabled}
                      onChange={(e) => {
                        const next = [...schedule];
                        next[i] = { ...row, enabled: e.target.checked };
                        setSchedule(next);
                      }}
                      style={{ marginRight: '0.5rem' }}
                    />
                    {DAYS[row.day_of_week]}
                  </label>
                  <input
                    type="time"
                    className="form-input"
                    value={row.start_time}
                    disabled={!row.enabled}
                    onChange={(e) => {
                      const next = [...schedule];
                      next[i] = { ...row, start_time: e.target.value };
                      setSchedule(next);
                    }}
                  />
                  <input
                    type="time"
                    className="form-input"
                    value={row.end_time}
                    disabled={!row.enabled}
                    onChange={(e) => {
                      const next = [...schedule];
                      next[i] = { ...row, end_time: e.target.value };
                      setSchedule(next);
                    }}
                  />
                </div>
              ))}
            </div>
            <button type="button" className="btn btn-primary" onClick={handleSaveAvailability} disabled={saving} style={{ marginTop: '1.25rem' }}>
              {saving ? 'Guardando...' : 'Guardar disponibilidad'}
            </button>
          </div>
        )}

        {tab === 'perfil' && (
          <div className="card card-padded">
            <form onSubmit={handleSaveProfile}>
              <div className="form-group">
                <label>Nombre</label>
                <input className="form-input" value={profile.name || ''} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Especialidad</label>
                <input className="form-input" value={profile.specialty || ''} onChange={(e) => setProfile({ ...profile, specialty: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Teléfono / WhatsApp</label>
                <input className="form-input" value={profile.phone || ''} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Duración del turno (min)</label>
                <select className="form-select" value={profile.duration_minutes || 30} onChange={(e) => setProfile({ ...profile, duration_minutes: e.target.value })}>
                  <option value={15}>15</option>
                  <option value={30}>30</option>
                  <option value={45}>45</option>
                  <option value={60}>60</option>
                </select>
              </div>
              <div className="form-group">
                <label>Bio</label>
                <textarea className="form-textarea" value={profile.bio || ''} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} />
              </div>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar perfil'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

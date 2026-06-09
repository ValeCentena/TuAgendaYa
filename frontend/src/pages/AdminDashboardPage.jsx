import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getAdminStats,
  getAdminProfessionals,
  getAdminBookings,
  toggleProfessional,
} from '../api/client';

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const token = localStorage.getItem('adminToken');

  const [tab, setTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [professionals, setProfessionals] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    Promise.all([
      getAdminStats(token),
      getAdminProfessionals(token),
      getAdminBookings(token),
    ])
      .then(([s, p, b]) => {
        setStats(s);
        setProfessionals(p);
        setBookings(b);
      })
      .catch(() => navigate('/admin/login'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!token) {
      navigate('/admin/login');
      return;
    }
    load();
  }, [token, navigate]);

  const handleToggle = async (id, currentActive) => {
    await toggleProfessional(token, id, !currentActive);
    load();
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('admin');
    navigate('/admin/login');
  };

  if (loading) return <p className="empty-state">Cargando panel...</p>;

  return (
    <div>
      <header className="app-header">
        <Link to="/" className="app-logo">Tu<span>Agenda</span>Ya Admin</Link>
        <button type="button" className="btn btn-secondary" onClick={handleLogout}>Cerrar sesión</button>
      </header>

      <div className="dashboard">
        <h1>Panel administrativo</h1>

        <div className="tabs" style={{ marginTop: '1.5rem' }}>
          <button type="button" className={`tab${tab === 'stats' ? ' active' : ''}`} onClick={() => setTab('stats')}>Resumen</button>
          <button type="button" className={`tab${tab === 'professionals' ? ' active' : ''}`} onClick={() => setTab('professionals')}>Profesionales</button>
          <button type="button" className={`tab${tab === 'bookings' ? ' active' : ''}`} onClick={() => setTab('bookings')}>Turnos</button>
        </div>

        {tab === 'stats' && stats && (
          <div className="stats-grid">
            <div className="card stat-card">
              <div className="value">{stats.professionals}</div>
              <div className="label">Profesionales totales</div>
            </div>
            <div className="card stat-card">
              <div className="value">{stats.activeProfessionals}</div>
              <div className="label">Activos</div>
            </div>
            <div className="card stat-card">
              <div className="value">{stats.bookings}</div>
              <div className="label">Turnos confirmados</div>
            </div>
            <div className="card stat-card">
              <div className="value">{stats.todayBookings}</div>
              <div className="label">Turnos hoy</div>
            </div>
          </div>
        )}

        {tab === 'professionals' && (
          <div className="card" style={{ overflow: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Especialidad</th>
                  <th>Turnos</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {professionals.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{p.email}</td>
                    <td>{p.specialty}</td>
                    <td>{p.booking_count}</td>
                    <td>
                      <span className={`badge ${p.active ? 'badge-active' : 'badge-inactive'}`}>
                        {p.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8125rem' }}
                        onClick={() => handleToggle(p.id, p.active)}
                      >
                        {p.active ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'bookings' && (
          <div className="card" style={{ overflow: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Hora</th>
                  <th>Cliente</th>
                  <th>Teléfono</th>
                  <th>Profesional</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id}>
                    <td>{b.date}</td>
                    <td>{b.time}</td>
                    <td>{b.client_name}</td>
                    <td>{b.client_phone}</td>
                    <td>{b.professional_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import BookPage from './pages/BookPage.jsx';

const API_BASE = 'https://tuagendaya-api.onrender.com/api';

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

// ── Dashboard ────────────────────────────────────────────────
function Dashboard({ professional, onLogout }) {
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('tuagendaya_token');
    fetch(`${API_BASE}/bookings/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => setBookings(data.bookings || []))
      .catch(() => setBookings([]))
      .finally(() => setLoadingBookings(false));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('tuagendaya_token');
    localStorage.removeItem('tuagendaya_professional');
    onLogout();
  };

  const statusColor = { pending: '#ff9f0a', confirmed: '#30d158', cancelled: '#ff453a' };
  const statusLabel = { pending: 'Pendiente', confirmed: 'Confirmada', cancelled: 'Cancelada' };

  return (
    <div style={{ minHeight: '100vh', background: '#f2f2f7', padding: 20 }}>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: '20px 24px', marginBottom: 16, boxShadow: '0 1px 8px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#0071e3' }}>TuAgendaYa</div>
            <div style={{ fontSize: 13, color: '#6e6e73', marginTop: 2 }}>Hola, {professional?.name || 'profesional'} 👋</div>
          </div>
          <button onClick={handleLogout} style={{ padding: '8px 16px', borderRadius: 10, border: '0.5px solid #e0e0e5', background: 'transparent', fontSize: 13, color: '#6e6e73', cursor: 'pointer', fontFamily: 'inherit' }}>
            Cerrar sesión
          </button>
        </div>

        <div style={{ background: '#fff', borderRadius: 20, padding: '20px 24px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', marginBottom: 16 }}>Reservas recibidas</div>
          {loadingBookings ? (
            <div style={{ textAlign: 'center', color: '#aeaeb2', padding: 32 }}>Cargando reservas...</div>
          ) : bookings.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#aeaeb2', padding: 32 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
              <div>No tenés reservas todavía.</div>
              <div style={{ fontSize: 12, marginTop: 8 }}>Tu link público: <strong>tuagendaya-web.onrender.com/reservar/{professional?.slug}</strong></div>
            </div>
          ) : (
            bookings.map(b => (
              <div key={b.id} style={{ border: '0.5px solid #e0e0e5', borderRadius: 14, padding: '14px 16px', marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#1a1a1a' }}>{b.client_name}</div>
                    <div style={{ fontSize: 12, color: '#6e6e73', marginTop: 2 }}>{b.client_phone}</div>
                    {b.comment && <div style={{ fontSize: 12, color: '#aeaeb2', marginTop: 4, fontStyle: 'italic' }}>"{b.comment}"</div>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: statusColor[b.status] || '#6e6e73', background: (statusColor[b.status] || '#6e6e73') + '18', padding: '3px 10px', borderRadius: 20 }}>
                      {statusLabel[b.status] || b.status}
                    </div>
                    <div style={{ fontSize: 11, color: '#aeaeb2', marginTop: 4 }}>{new Date(b.created_at).toLocaleDateString('es-AR')}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ── Pantalla profesional (login o dashboard) ──────────────────
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
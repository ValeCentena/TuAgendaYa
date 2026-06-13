import { useState } from 'react';

const API_URL = 'https://tuagendaya-api.onrender.com/api';
const PUBLIC_BOOKING_LINK = 'https://tuagendaya-web.onrender.com/reservar/valentino';

export default function App() {
  const currentPath = window.location.pathname;
  const isPublicBookingPage = currentPath.startsWith('/reservar/');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(false);
  const [copyMessage, setCopyMessage] = useState('');

  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientComment, setClientComment] = useState('');
  const [bookingMessage, setBookingMessage] = useState('');

  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return Boolean(localStorage.getItem('tuagendaya_token'));
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMensaje('');

    if (!email || !password) {
      setMensaje('Ingresá email y contraseña.');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Credenciales inválidas');
      }

      const token = data.token || data.accessToken || data.jwt;

      if (!token) {
        throw new Error('Login correcto, pero no llegó token.');
      }

      localStorage.setItem('tuagendaya_token', token);
      setIsLoggedIn(true);
      setMensaje('');
    } catch (error) {
      setMensaje(error.message || 'Error al conectar con la API.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('tuagendaya_token');
    setIsLoggedIn(false);
    setEmail('');
    setPassword('');
    setMensaje('');
    setCopyMessage('');
    window.history.pushState({}, '', '/profesional/login');
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(PUBLIC_BOOKING_LINK);
      setCopyMessage('Link copiado correctamente.');
    } catch (error) {
      setCopyMessage('No se pudo copiar. Copialo manualmente.');
    }
  };

  const handleFakeBooking = (event) => {
    event.preventDefault();

    if (!clientName || !clientPhone) {
      setBookingMessage('Ingresá nombre y teléfono para reservar.');
      return;
    }

    setBookingMessage('Reserva cargada correctamente. Próximo paso: conectar agenda real.');
  };

  if (isPublicBookingPage) {
    return (
      <main style={styles.page}>
        <section style={styles.publicCard}>
          <div style={styles.publicBadge}>Reserva online</div>

          <h1 style={styles.publicTitle}>Reservar con Valentino</h1>

          <p style={styles.publicSubtitle}>
            Completá tus datos y solicitá tu turno. Luego conectaremos horarios reales disponibles.
          </p>

          <div style={styles.profileBox}>
            <div style={styles.avatar}>V</div>
            <div>
              <h2 style={styles.profileName}>Valentino</h2>
              <p style={styles.profileText}>Profesional disponible en TuAgendaYa</p>
            </div>
          </div>

          <form onSubmit={handleFakeBooking} style={styles.form}>
            <label style={styles.label}>
              Nombre
              <input
                type="text"
                value={clientName}
                onChange={(event) => setClientName(event.target.value)}
                placeholder="Tu nombre"
                style={styles.input}
              />
            </label>

            <label style={styles.label}>
              Teléfono
              <input
                type="tel"
                value={clientPhone}
                onChange={(event) => setClientPhone(event.target.value)}
                placeholder="Tu teléfono"
                style={styles.input}
              />
            </label>

            <label style={styles.label}>
              Comentario
              <textarea
                value={clientComment}
                onChange={(event) => setClientComment(event.target.value)}
                placeholder="Ej: quiero reservar para la tarde"
                style={styles.textarea}
              />
            </label>

            <button type="submit" style={styles.primaryButton}>
              Confirmar reserva
            </button>
          </form>

          {bookingMessage ? (
            <div
              style={{
                ...styles.message,
                background: bookingMessage.includes('correctamente') ? '#ecfdf5' : '#fef2f2',
                color: bookingMessage.includes('correctamente') ? '#047857' : '#b91c1c',
                border: bookingMessage.includes('correctamente')
                  ? '1px solid #bbf7d0'
                  : '1px solid #fecaca',
              }}
            >
              {bookingMessage}
            </div>
          ) : null}
        </section>
      </main>
    );
  }

  if (isLoggedIn) {
    return (
      <main style={styles.dashboardPage}>
        <section style={styles.dashboardWrapper}>
          <header style={styles.dashboardHeader}>
            <div>
              <h1 style={styles.logoTitle}>TuAgendaYa</h1>
              <p style={styles.logoSubtitle}>Panel profesional</p>
            </div>

            <button onClick={handleLogout} style={styles.logoutButton}>
              Cerrar sesión
            </button>
          </header>

          <div style={styles.statsGrid}>
            <div style={styles.dashboardCard}>
              <p style={styles.cardLabel}>Estado</p>
              <h2 style={styles.cardTitle}>Sesión activa</h2>
              <p style={styles.cardText}>El login ya está conectado a la API.</p>
            </div>

            <div style={styles.dashboardCard}>
              <p style={styles.cardLabel}>Turnos de hoy</p>
              <h2 style={styles.cardTitle}>0</h2>
              <p style={styles.cardText}>Después conectamos la agenda real.</p>
            </div>

            <div style={styles.dashboardCard}>
              <p style={styles.cardLabel}>Reservas</p>
              <h2 style={styles.cardTitle}>Disponible</h2>
              <p style={styles.cardText}>La base del panel ya está funcionando.</p>
            </div>
          </div>

          <section style={styles.bigCard}>
            <h2 style={styles.sectionTitle}>Bienvenido, Valentino</h2>
            <p style={styles.sectionText}>
              Este es el primer dashboard estable. Desde acá vamos a agregar la agenda,
              disponibilidad, turnos y configuración del profesional.
            </p>
          </section>

          <section style={styles.bigCard}>
            <p style={styles.cardLabel}>Link público de reservas</p>

            <h2 style={styles.sectionTitle}>Compartí este link con tus clientes</h2>

            <p style={styles.sectionText}>
              Cuando el cliente entre a este link, podrá reservar un turno contigo.
            </p>

            <div style={styles.linkRow}>
              <div style={styles.linkBox}>{PUBLIC_BOOKING_LINK}</div>

              <button onClick={handleCopyLink} style={styles.primarySmallButton}>
                Copiar link
              </button>

              <a
                href={PUBLIC_BOOKING_LINK}
                target="_blank"
                rel="noreferrer"
                style={styles.secondaryLinkButton}
              >
                Abrir
              </a>
            </div>

            {copyMessage ? (
              <div
                style={{
                  ...styles.message,
                  marginTop: 14,
                  background: copyMessage.includes('correctamente') ? '#ecfdf5' : '#fef2f2',
                  color: copyMessage.includes('correctamente') ? '#047857' : '#b91c1c',
                  border: copyMessage.includes('correctamente')
                    ? '1px solid #bbf7d0'
                    : '1px solid #fecaca',
                }}
              >
                {copyMessage}
              </div>
            ) : null}
          </section>
        </section>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <section style={styles.loginCard}>
        <h1 style={styles.loginTitle}>TuAgendaYa</h1>

        <p style={styles.loginSubtitle}>Ingresá a tu panel profesional</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="tu@email.com"
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            Contraseña
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Tu contraseña"
              style={styles.input}
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.primaryButton,
              background: loading ? '#475569' : '#111827',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        {mensaje ? <div style={styles.errorMessage}>{mensaje}</div> : null}
      </section>
    </main>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f8fafc',
    fontFamily:
      'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    padding: 24,
    boxSizing: 'border-box',
  },
  dashboardPage: {
    minHeight: '100vh',
    width: '100%',
    background: '#f8fafc',
    fontFamily:
      'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    padding: 24,
    boxSizing: 'border-box',
  },
  dashboardWrapper: {
    maxWidth: 980,
    margin: '0 auto',
  },
  dashboardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    marginBottom: 28,
  },
  logoTitle: {
    margin: 0,
    fontSize: 34,
    letterSpacing: '-0.05em',
    color: '#0f172a',
  },
  logoSubtitle: {
    margin: '6px 0 0',
    color: '#64748b',
    fontSize: 16,
  },
  logoutButton: {
    height: 44,
    padding: '0 18px',
    borderRadius: 14,
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    color: '#0f172a',
    fontWeight: 700,
    cursor: 'pointer',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 18,
    marginBottom: 24,
  },
  dashboardCard: {
    background: '#ffffff',
    borderRadius: 24,
    padding: 22,
    boxShadow: '0 18px 50px rgba(15, 23, 42, 0.08)',
    border: '1px solid rgba(148, 163, 184, 0.22)',
  },
  bigCard: {
    background: '#ffffff',
    borderRadius: 28,
    padding: 28,
    boxShadow: '0 24px 80px rgba(15, 23, 42, 0.10)',
    border: '1px solid rgba(148, 163, 184, 0.25)',
    marginBottom: 24,
  },
  cardLabel: {
    margin: '0 0 8px',
    color: '#64748b',
    fontSize: 13,
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  cardTitle: {
    margin: '0 0 8px',
    color: '#0f172a',
    fontSize: 24,
    letterSpacing: '-0.04em',
  },
  cardText: {
    margin: 0,
    color: '#64748b',
    fontSize: 14,
    lineHeight: 1.5,
  },
  sectionTitle: {
    margin: '0 0 10px',
    fontSize: 24,
    color: '#0f172a',
    letterSpacing: '-0.04em',
  },
  sectionText: {
    margin: '0 0 18px',
    color: '#64748b',
    fontSize: 15,
    lineHeight: 1.6,
  },
  linkRow: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  linkBox: {
    flex: 1,
    minWidth: 260,
    background: '#f8fafc',
    border: '1px solid #cbd5e1',
    borderRadius: 16,
    padding: '14px 16px',
    color: '#0f172a',
    fontSize: 14,
    fontWeight: 700,
    overflowWrap: 'anywhere',
  },
  primarySmallButton: {
    height: 48,
    padding: '0 18px',
    borderRadius: 16,
    border: 'none',
    background: '#111827',
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 800,
    cursor: 'pointer',
  },
  secondaryLinkButton: {
    height: 48,
    padding: '0 18px',
    borderRadius: 16,
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    color: '#0f172a',
    fontSize: 14,
    fontWeight: 800,
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginCard: {
    width: '100%',
    maxWidth: 430,
    background: '#ffffff',
    borderRadius: 28,
    padding: 36,
    boxShadow: '0 24px 80px rgba(15, 23, 42, 0.14)',
    border: '1px solid rgba(148, 163, 184, 0.25)',
    boxSizing: 'border-box',
  },
  loginTitle: {
    margin: '0 0 10px',
    fontSize: 34,
    letterSpacing: '-0.05em',
    color: '#0f172a',
    textAlign: 'center',
  },
  loginSubtitle: {
    margin: '0 0 28px',
    color: '#64748b',
    fontSize: 16,
    textAlign: 'center',
  },
  publicCard: {
    width: '100%',
    maxWidth: 480,
    background: '#ffffff',
    borderRadius: 30,
    padding: 34,
    boxShadow: '0 24px 80px rgba(15, 23, 42, 0.14)',
    border: '1px solid rgba(148, 163, 184, 0.25)',
    boxSizing: 'border-box',
  },
  publicBadge: {
    display: 'inline-flex',
    height: 34,
    padding: '0 14px',
    alignItems: 'center',
    borderRadius: 999,
    background: '#eef2ff',
    color: '#3730a3',
    fontSize: 13,
    fontWeight: 800,
    marginBottom: 18,
  },
  publicTitle: {
    margin: '0 0 10px',
    fontSize: 32,
    letterSpacing: '-0.05em',
    color: '#0f172a',
  },
  publicSubtitle: {
    margin: '0 0 22px',
    color: '#64748b',
    fontSize: 15,
    lineHeight: 1.6,
  },
  profileBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 22,
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    marginBottom: 22,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 18,
    background: '#111827',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 900,
    fontSize: 22,
  },
  profileName: {
    margin: 0,
    color: '#0f172a',
    fontSize: 18,
  },
  profileText: {
    margin: '4px 0 0',
    color: '#64748b',
    fontSize: 14,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    color: '#334155',
    fontSize: 14,
    fontWeight: 700,
  },
  input: {
    height: 48,
    borderRadius: 14,
    border: '1px solid #cbd5e1',
    padding: '0 14px',
    fontSize: 15,
    outline: 'none',
    boxSizing: 'border-box',
  },
  textarea: {
    minHeight: 92,
    borderRadius: 14,
    border: '1px solid #cbd5e1',
    padding: '12px 14px',
    fontSize: 15,
    outline: 'none',
    resize: 'vertical',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  primaryButton: {
    height: 50,
    borderRadius: 16,
    border: 'none',
    background: '#111827',
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 800,
    cursor: 'pointer',
    marginTop: 6,
  },
  message: {
    marginTop: 18,
    padding: 12,
    borderRadius: 14,
    fontSize: 14,
    textAlign: 'center',
    fontWeight: 700,
  },
  errorMessage: {
    marginTop: 18,
    padding: 12,
    borderRadius: 14,
    background: '#fef2f2',
    color: '#b91c1c',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: 600,
    border: '1px solid #fecaca',
  },
};
import { useState } from 'react';

const API_URL = 'https://tuagendaya-api.onrender.com/api';
const PUBLIC_BOOKING_LINK = 'https://tuagendaya-web.onrender.com/reservar/valentino';

export default function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(false);
  const [copyMessage, setCopyMessage] = useState('');
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
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(PUBLIC_BOOKING_LINK);
      setCopyMessage('Link copiado correctamente.');
    } catch (error) {
      setCopyMessage('No se pudo copiar. Copialo manualmente.');
    }
  };

  if (isLoggedIn) {
    return (
      <main
        style={{
          minHeight: '100vh',
          width: '100%',
          background: '#f8fafc',
          fontFamily:
            'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          padding: 24,
          boxSizing: 'border-box',
        }}
      >
        <section
          style={{
            maxWidth: 980,
            margin: '0 auto',
          }}
        >
          <header
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 16,
              marginBottom: 28,
            }}
          >
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: 34,
                  letterSpacing: '-0.05em',
                  color: '#0f172a',
                }}
              >
                TuAgendaYa
              </h1>

              <p
                style={{
                  margin: '6px 0 0',
                  color: '#64748b',
                  fontSize: 16,
                }}
              >
                Panel profesional
              </p>
            </div>

            <button
              onClick={handleLogout}
              style={{
                height: 44,
                padding: '0 18px',
                borderRadius: 14,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#0f172a',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Cerrar sesión
            </button>
          </header>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 18,
              marginBottom: 24,
            }}
          >
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

          <section
            style={{
              background: '#ffffff',
              borderRadius: 28,
              padding: 28,
              boxShadow: '0 24px 80px rgba(15, 23, 42, 0.10)',
              border: '1px solid rgba(148, 163, 184, 0.25)',
              marginBottom: 24,
            }}
          >
            <h2
              style={{
                margin: '0 0 10px',
                fontSize: 24,
                color: '#0f172a',
                letterSpacing: '-0.04em',
              }}
            >
              Bienvenido, Valentino
            </h2>

            <p
              style={{
                margin: 0,
                color: '#64748b',
                fontSize: 16,
                lineHeight: 1.6,
              }}
            >
              Este es el primer dashboard estable. Desde acá vamos a agregar la
              agenda, disponibilidad, turnos y configuración del profesional.
            </p>
          </section>

          <section
            style={{
              background: '#ffffff',
              borderRadius: 28,
              padding: 28,
              boxShadow: '0 24px 80px rgba(15, 23, 42, 0.10)',
              border: '1px solid rgba(148, 163, 184, 0.25)',
            }}
          >
            <p style={styles.cardLabel}>Link público de reservas</p>

            <h2
              style={{
                margin: '0 0 10px',
                fontSize: 24,
                color: '#0f172a',
                letterSpacing: '-0.04em',
              }}
            >
              Compartí este link con tus clientes
            </h2>

            <p
              style={{
                margin: '0 0 18px',
                color: '#64748b',
                fontSize: 15,
                lineHeight: 1.6,
              }}
            >
              Cuando el cliente entre a este link, podrá reservar un turno contigo.
            </p>

            <div
              style={{
                display: 'flex',
                gap: 12,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <div
                style={{
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
                }}
              >
                {PUBLIC_BOOKING_LINK}
              </div>

              <button
                onClick={handleCopyLink}
                style={{
                  height: 48,
                  padding: '0 18px',
                  borderRadius: 16,
                  border: 'none',
                  background: '#111827',
                  color: '#ffffff',
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Copiar link
              </button>

              <a
                href={PUBLIC_BOOKING_LINK}
                target="_blank"
                rel="noreferrer"
                style={{
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
                }}
              >
                Abrir
              </a>
            </div>

            {copyMessage ? (
              <div
                style={{
                  marginTop: 14,
                  padding: 12,
                  borderRadius: 14,
                  background: copyMessage.includes('correctamente')
                    ? '#ecfdf5'
                    : '#fef2f2',
                  color: copyMessage.includes('correctamente')
                    ? '#047857'
                    : '#b91c1c',
                  fontSize: 14,
                  fontWeight: 700,
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
    <main
      style={{
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
      }}
    >
      <section
        style={{
          width: '100%',
          maxWidth: 430,
          background: '#ffffff',
          borderRadius: 28,
          padding: 36,
          boxShadow: '0 24px 80px rgba(15, 23, 42, 0.14)',
          border: '1px solid rgba(148, 163, 184, 0.25)',
          boxSizing: 'border-box',
        }}
      >
        <h1
          style={{
            margin: '0 0 10px',
            fontSize: 34,
            letterSpacing: '-0.05em',
            color: '#0f172a',
            textAlign: 'center',
          }}
        >
          TuAgendaYa
        </h1>

        <p
          style={{
            margin: '0 0 28px',
            color: '#64748b',
            fontSize: 16,
            textAlign: 'center',
          }}
        >
          Ingresá a tu panel profesional
        </p>

        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
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
              height: 50,
              borderRadius: 16,
              border: 'none',
              background: loading ? '#475569' : '#111827',
              color: '#ffffff',
              fontSize: 15,
              fontWeight: 800,
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: 6,
            }}
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        {mensaje ? (
          <div
            style={{
              marginTop: 18,
              padding: 12,
              borderRadius: 14,
              background: '#fef2f2',
              color: '#b91c1c',
              fontSize: 14,
              textAlign: 'center',
              fontWeight: 600,
              border: '1px solid #fecaca',
            }}
          >
            {mensaje}
          </div>
        ) : null}
      </section>
    </main>
  );
}

const styles = {
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
  dashboardCard: {
    background: '#ffffff',
    borderRadius: 24,
    padding: 22,
    boxShadow: '0 18px 50px rgba(15, 23, 42, 0.08)',
    border: '1px solid rgba(148, 163, 184, 0.22)',
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
};
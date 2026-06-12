import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function LoginPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: '',
    password: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!form.email || !form.password) {
      setError('Ingresá tu email y contraseña.');
      return;
    }

    try {
      setLoading(true);

      const response = await api.post('/auth/login', {
        email: form.email,
        password: form.password,
      });

      const data = response.data || {};
      const token = data.token || data.accessToken || data.jwt;

      if (token) {
        localStorage.setItem('tuagendaya_token', token);
      }

      navigate('/profesional/dashboard', { replace: true });
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'No se pudo iniciar sesión. Revisá tus datos.';

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <div style={styles.logo}>TuAgendaYa</div>

        <h1 style={styles.title}>Ingresar</h1>
        <p style={styles.subtitle}>Accedé a tu panel profesional</p>

        {error ? <div style={styles.error}>{error}</div> : null}

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>
            Email
            <input
              style={styles.input}
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="tu@email.com"
              autoComplete="email"
            />
          </label>

          <label style={styles.label}>
            Contraseña
            <input
              style={styles.input}
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Tu contraseña"
              autoComplete="current-password"
            />
          </label>

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <p style={styles.footerText}>
          ¿Todavía no tenés cuenta?{' '}
          <Link to="/profesional/registro" style={styles.link}>
            Registrate
          </Link>
        </p>
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
    background:
      'linear-gradient(135deg, #f8fafc 0%, #eef2ff 45%, #fdf2f8 100%)',
    padding: '24px',
    boxSizing: 'border-box',
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  card: {
    width: '100%',
    maxWidth: '430px',
    background: '#ffffff',
    borderRadius: '28px',
    padding: '34px',
    boxShadow: '0 24px 80px rgba(15, 23, 42, 0.14)',
    border: '1px solid rgba(148, 163, 184, 0.22)',
    boxSizing: 'border-box',
  },
  logo: {
    fontSize: '25px',
    fontWeight: '800',
    color: '#111827',
    marginBottom: '26px',
    letterSpacing: '-0.04em',
  },
  title: {
    fontSize: '32px',
    lineHeight: '1.1',
    margin: '0 0 8px',
    color: '#0f172a',
    letterSpacing: '-0.05em',
  },
  subtitle: {
    margin: '0 0 26px',
    color: '#64748b',
    fontSize: '15px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    color: '#334155',
    fontSize: '14px',
    fontWeight: '600',
  },
  input: {
    width: '100%',
    height: '48px',
    borderRadius: '14px',
    border: '1px solid #cbd5e1',
    padding: '0 14px',
    fontSize: '15px',
    outline: 'none',
    boxSizing: 'border-box',
    background: '#ffffff',
    color: '#0f172a',
  },
  button: {
    height: '50px',
    borderRadius: '16px',
    border: 'none',
    background: '#111827',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: '700',
    cursor: 'pointer',
    marginTop: '6px',
  },
  error: {
    background: '#fef2f2',
    color: '#b91c1c',
    border: '1px solid #fecaca',
    padding: '12px 14px',
    borderRadius: '14px',
    fontSize: '14px',
    marginBottom: '18px',
  },
  footerText: {
    margin: '22px 0 0',
    textAlign: 'center',
    color: '#64748b',
    fontSize: '14px',
  },
  link: {
    color: '#111827',
    fontWeight: '700',
    textDecoration: 'none',
  },
};
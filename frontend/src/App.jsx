import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/profesional/login" replace />} />

      <Route path="/login" element={<LoginPage />} />
      <Route path="/profesional/login" element={<LoginPage />} />

      <Route
        path="*"
        element={
          <main
            style={{
              minHeight: '100vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#f8fafc',
              fontFamily:
                'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              padding: 24,
            }}
          >
            <section
              style={{
                width: '100%',
                maxWidth: 420,
                background: '#ffffff',
                borderRadius: 24,
                padding: 32,
                boxShadow: '0 20px 60px rgba(15, 23, 42, 0.12)',
                textAlign: 'center',
              }}
            >
              <h1
                style={{
                  margin: '0 0 10px',
                  fontSize: 28,
                  color: '#0f172a',
                }}
              >
                TuAgendaYa
              </h1>

              <p
                style={{
                  margin: '0 0 24px',
                  color: '#64748b',
                  fontSize: 15,
                }}
              >
                Página no encontrada.
              </p>

              <a
                href="/profesional/login"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 46,
                  padding: '0 20px',
                  borderRadius: 14,
                  background: '#111827',
                  color: '#ffffff',
                  textDecoration: 'none',
                  fontWeight: 700,
                }}
              >
                Ir al login
              </a>
            </section>
          </main>
        }
      />
    </Routes>
  );
}
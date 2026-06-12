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
                maxWidth: 460,
                background: '#ffffff',
                borderRadius: 28,
                padding: 36,
                boxShadow: '0 24px 80px rgba(15, 23, 42, 0.14)',
                border: '1px solid rgba(148, 163, 184, 0.25)',
                textAlign: 'center',
              }}
            >
              <h1
                style={{
                  margin: '0 0 12px',
                  fontSize: 34,
                  letterSpacing: '-0.05em',
                  color: '#0f172a',
                }}
              >
                TuAgendaYa
              </h1>

              <p
                style={{
                  margin: '0 0 26px',
                  color: '#64748b',
                  fontSize: 16,
                  lineHeight: 1.5,
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
                  padding: '0 18px',
                  borderRadius: 14,
                  background: '#111827',
                  color: '#ffffff',
                  fontWeight: 700,
                  textDecoration: 'none',
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
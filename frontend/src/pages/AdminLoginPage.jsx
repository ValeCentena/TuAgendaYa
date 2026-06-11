import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../api/client';
import { useAdminStore } from '../store/adminStore';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const setAdmin = useAdminStore((s) => s.setAdmin);
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await adminApi.login(form);
      setAdmin(res.data.token, res.data.admin);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
      }}>
        {/* Logo / Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #0071e3, #0a84ff)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 8px 32px rgba(0, 113, 227, 0.4)',
            fontSize: '28px',
          }}>
            🛡️
          </div>
          <h1 style={{ color: '#fff', fontSize: '28px', fontWeight: 700, margin: '0 0 6px' }}>
            Panel Admin
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '15px', margin: 0 }}>
            TuAgendaYa · Acceso restringido
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '20px',
          padding: '36px',
        }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: 600, marginBottom: '8px', letterSpacing: '0.3px' }}>
                EMAIL
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="admin@tuagendaya.com"
                required
                autoComplete="email"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '16px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.target.style.borderColor = 'rgba(0,113,227,0.8)'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
              />
            </div>

            <div style={{ marginBottom: '28px' }}>
              <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: 600, marginBottom: '8px', letterSpacing: '0.3px' }}>
                CONTRASEÑA
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '16px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.target.style.borderColor = 'rgba(0,113,227,0.8)'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
              />
            </div>

            {error && (
              <div style={{
                background: 'rgba(255,59,48,0.15)',
                border: '1px solid rgba(255,59,48,0.3)',
                borderRadius: '10px',
                padding: '12px 16px',
                color: '#ff6b6b',
                fontSize: '14px',
                marginBottom: '20px',
                textAlign: 'center',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '15px',
                background: loading ? 'rgba(0,113,227,0.5)' : 'linear-gradient(135deg, #0071e3, #0a84ff)',
                border: 'none',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '16px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'opacity 0.2s, transform 0.1s',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(0,113,227,0.4)',
              }}
              onMouseDown={(e) => { if (!loading) e.currentTarget.style.transform = 'scale(0.98)'; }}
              onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              {loading ? 'Ingresando...' : 'Ingresar al panel'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: '13px', marginTop: '24px' }}>
          Solo administradores autorizados
        </p>
      </div>
    </div>
  );
}
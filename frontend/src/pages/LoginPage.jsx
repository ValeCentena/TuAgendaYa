import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api, { ApiError } from '../api/client.js';
import Logo from '../components/ui/Logo.jsx';
import Input from '../components/ui/Input.jsx';
import Button from '../components/ui/Button.jsx';
import toast from 'react-hot-toast';

const loginProfesional = (email, password) => {
  return api.post('/auth/login', { email, password });
};

export default function LoginPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('login');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    email: '', password: '', name: '', profession: '', slug: '',
  });
  const [slugAvailable, setSlugAvailable] = useState(null);
  const [checkingSlug, setCheckingSlug] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSlugCheck = async (value) => {
    const slug = value.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    setForm(f => ({ ...f, slug }));
    if (slug.length < 3) { setSlugAvailable(null); return; }
    setCheckingSlug(true);
    try {
      const res = await api.get(`/auth/check-slug/${slug}`);
      setSlugAvailable(res.data.available);
    } catch { setSlugAvailable(null); }
    finally { setCheckingSlug(false); }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await loginProfesional(form.email, form.password);
      const { token, professional } = res.data;
      localStorage.setItem('tuagendaya_token', token);
      if (professional) {
        localStorage.setItem('tuagendaya_professional', JSON.stringify(professional));
      }
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al ingresar');
    } finally { setLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (step === 1) { setStep(2); return; }
    if (!slugAvailable) { toast.error('Ese link ya está en uso'); return; }
    setLoading(true);
    try {
      const res = await api.post('/auth/register', form);
      const { token, professional } = res.data;
      localStorage.setItem('tuagendaya_token', token);
      if (professional) {
        localStorage.setItem('tuagendaya_professional', JSON.stringify(professional));
      }
      toast.success('¡Cuenta creada! Bienvenido a TuAgendaYa.');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al registrarse');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f2f2f7', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 24, padding: '36px 32px', border: '0.5px solid #e0e0e5', width: '100%', maxWidth: 400, animation: 'slideUp 250ms cubic-bezier(0.16,1,0.3,1) both', boxShadow: '0 2px 40px rgba(0,0,0,0.06)' }}>
        <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><Logo size={52} /></div>
          <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', color: '#1a1a1a' }}>TuAgendaYa</div>
          <div style={{ fontSize: 14, color: '#6e6e73', marginTop: 4 }}>
            {tab === 'login' ? 'Accedé a tu panel profesional' : step === 1 ? 'Creá tu cuenta' : 'Tu perfil público'}
          </div>
        </div>

        <div style={{ display: 'flex', background: '#f2f2f7', borderRadius: 12, padding: 3, marginBottom: 24 }}>
          {['login', 'register'].map(t => (
            <button key={t} onClick={() => { setTab(t); setStep(1); }}
              style={{ flex: 1, padding: '8px', borderRadius: 10, fontSize: 13, fontWeight: 500, fontFamily: 'inherit', border: 'none', cursor: 'pointer', transition: 'all 200ms', background: tab === t ? '#fff' : 'transparent', color: tab === t ? '#1a1a1a' : '#6e6e73', boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.1)' : 'none' }}>
              {t === 'login' ? 'Ingresar' : 'Registrarse'}
            </button>
          ))}
        </div>

        {tab === 'login' ? (
          <form onSubmit={handleLogin}>
            <Input label="Email" type="email" name="email" value={form.email} onChange={set('email')} placeholder="tu@email.com" required autoComplete="email" />
            <Input label="Contraseña" type="password" name="password" value={form.password} onChange={set('password')} placeholder="••••••••" required autoComplete="current-password" />
            <Button type="submit" fullWidth loading={loading} style={{ borderRadius: 12, marginTop: 4 }}>
              Ingresar
            </Button>
            <div style={{ textAlign: 'center', marginTop: 14 }}>
              <Link to="/forgot-password" style={{ fontSize: 13, color: '#6e6e73', textDecoration: 'none' }}>¿Olvidaste tu contraseña?</Link>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            {step === 1 ? (
              <>
                <Input label="Nombre completo" name="name" value={form.name} onChange={set('name')} placeholder="Dra. Laura Gómez" required />
                <Input label="Email" type="email" name="email" value={form.email} onChange={set('email')} placeholder="tu@email.com" required autoComplete="email" />
                <Input label="Contraseña" type="password" name="password" value={form.password} onChange={set('password')} placeholder="Mínimo 8 caracteres" required autoComplete="new-password" />
                <Button type="submit" fullWidth style={{ borderRadius: 12 }}>Continuar →</Button>
              </>
            ) : (
              <>
                <div style={{ fontSize: 11, color: '#6e6e73', marginBottom: 16 }}>Paso 2 de 2 — Así te verán tus clientes</div>
                <div style={{ height: 3, background: '#f2f2f7', borderRadius: 2, marginBottom: 20, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: '65%', background: '#0071e3', borderRadius: 2 }} />
                </div>
                <Input label="Rubro o profesión" name="profession" value={form.profession} onChange={set('profession')} placeholder="Odontología, Psicología, Kinesología..." />
                <div>
                  <Input label="Tu link único" name="slug" value={form.slug} onChange={e => handleSlugCheck(e.target.value)}
                    placeholder="dra-laura-gomez"
                    rightElement={checkingSlug ? <i className="ti ti-loader" style={{ fontSize: 14, color: '#aeaeb2', animation: 'spin 0.7s linear infinite' }} /> : slugAvailable === true ? <i className="ti ti-check" style={{ fontSize: 14, color: '#30d158' }} /> : slugAvailable === false ? <i className="ti ti-x" style={{ fontSize: 14, color: '#ff453a' }} /> : null}
                  />
                  {form.slug && (
                    <div style={{ background: '#e8f2fd', border: '0.5px solid #cce0f8', borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6, marginTop: -8, marginBottom: 14, fontSize: 12 }}>
                      <span style={{ color: '#6e6e73' }}>tuagendaya.app/</span>
                      <span style={{ color: '#0071e3', fontWeight: 600 }}>{form.slug}</span>
                      {slugAvailable === true && <span style={{ marginLeft: 'auto', color: '#30d158', fontWeight: 600, fontSize: 11 }}>✓ disponible</span>}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button type="button" onClick={() => setStep(1)} style={{ padding: '12px 16px', borderRadius: 12, border: '0.5px solid #e0e0e5', background: 'transparent', fontSize: 13, color: '#6e6e73', cursor: 'pointer', fontFamily: 'inherit' }}>← Volver</button>
                  <Button type="submit" fullWidth loading={loading} style={{ borderRadius: 12 }}>Crear mi agenda →</Button>
                </div>
              </>
            )}
          </form>
        )}

        <div style={{ textAlign: 'center', fontSize: 11, color: '#aeaeb2', marginTop: 16 }}>🔒 Tus datos están cifrados y protegidos</div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );
}
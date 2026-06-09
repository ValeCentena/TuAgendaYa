import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import FormField from '../components/FormField';
import { loginProfessional, ApiError } from '../api/client';
import { validateLoginForm } from '../utils/validation';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const errors = validateLoginForm({ email, password });
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);

    try {
      const { token, professional } = await loginProfessional(email.trim(), password);
      localStorage.setItem('token', token);
      localStorage.setItem('professional', JSON.stringify(professional));
      navigate('/profesional/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="card auth-card">
        <h1 className="auth-title">TuAgendaYa</h1>
        <p className="auth-subtitle">Acceso para profesionales</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <FormField id="email" label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={fieldErrors.email} required />
          <FormField id="password" label="Contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} error={fieldErrors.password} required />
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <p className="auth-footer">
          ¿No tenés cuenta? <Link to="/profesional/registro">Registrate gratis</Link>
        </p>
        <p className="auth-footer">
          <Link to="/">← Volver al inicio</Link>
        </p>
      </div>
    </div>
  );
}

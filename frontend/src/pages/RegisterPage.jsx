import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import FormField from '../components/FormField';
import { registerProfessional, ApiError } from '../api/client';
import { validateRegisterForm } from '../utils/validation';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    specialty: '',
    phone: '',
    bio: '',
    durationMinutes: 30,
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const errors = validateRegisterForm(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);

    try {
      const { token, professional } = await registerProfessional({
        ...form,
        durationMinutes: Number(form.durationMinutes),
      });
      localStorage.setItem('token', token);
      localStorage.setItem('professional', JSON.stringify(professional));
      navigate('/profesional/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="card auth-card">
        <h1 className="auth-title">Creá tu cuenta</h1>
        <p className="auth-subtitle">Empezá a recibir turnos online hoy</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <FormField id="name" label="Nombre completo" value={form.name} onChange={update('name')} error={fieldErrors.name} required />
          <FormField id="email" label="Email" type="email" value={form.email} onChange={update('email')} error={fieldErrors.email} required />
          <FormField id="password" label="Contraseña" type="password" value={form.password} onChange={update('password')} error={fieldErrors.password} required minLength={6} />
          <FormField id="specialty" label="Especialidad" value={form.specialty} onChange={update('specialty')} placeholder="Ej: Odontología" />
          <FormField id="phone" label="WhatsApp / Teléfono" type="tel" value={form.phone} onChange={update('phone')} error={fieldErrors.phone} placeholder="+54..." />
          <FormField id="duration" label="Duración del turno (minutos)" as="select" value={form.durationMinutes} onChange={update('durationMinutes')}>
            <option value={15}>15 min</option>
            <option value={30}>30 min</option>
            <option value={45}>45 min</option>
            <option value={60}>60 min</option>
          </FormField>
          <FormField id="bio" label="Bio (opcional)" as="textarea" value={form.bio} onChange={update('bio')} />
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Creando cuenta...' : 'Registrarse'}
          </button>
        </form>

        <p className="auth-footer">
          ¿Ya tenés cuenta? <Link to="/profesional/login">Iniciar sesión</Link>
        </p>
      </div>
    </div>
  );
}

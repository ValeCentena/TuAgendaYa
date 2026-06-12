import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mensaje, setMensaje] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!email || !password) {
      setMensaje('Ingresá email y contraseña.');
      return;
    }

    setMensaje('Login cargó correctamente. Próximo paso: conectar API.');
  };

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
          <label
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              color: '#334155',
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="tu@email.com"
              style={{
                height: 48,
                borderRadius: 14,
                border: '1px solid #cbd5e1',
                padding: '0 14px',
                fontSize: 15,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </label>

          <label
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              color: '#334155',
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            Contraseña
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Tu contraseña"
              style={{
                height: 48,
                borderRadius: 14,
                border: '1px solid #cbd5e1',
                padding: '0 14px',
                fontSize: 15,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </label>

          <button
            type="submit"
            style={{
              height: 50,
              borderRadius: 16,
              border: 'none',
              background: '#111827',
              color: '#ffffff',
              fontSize: 15,
              fontWeight: 800,
              cursor: 'pointer',
              marginTop: 6,
            }}
          >
            Ingresar
          </button>
        </form>

        {mensaje ? (
          <div
            style={{
              marginTop: 18,
              padding: 12,
              borderRadius: 14,
              background: '#eef2ff',
              color: '#3730a3',
              fontSize: 14,
              textAlign: 'center',
              fontWeight: 600,
            }}
          >
            {mensaje}
          </div>
        ) : null}
      </section>
    </main>
  );
}
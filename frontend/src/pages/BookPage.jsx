import { useState } from 'react';
import { useParams } from 'react-router-dom';

const API_BASE = 'https://tuagendaya-api.onrender.com/api';

export default function BookPage() {
  const { slug } = useParams();
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientComment, setClientComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 10,
    border: '0.5px solid #d0d0d5', fontSize: 14, fontFamily: 'inherit',
    outline: 'none', boxSizing: 'border-box', marginBottom: 12,
    background: '#fff', color: '#1a1a1a',
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!clientName.trim()) { setError('El nombre es requerido.'); return; }
    if (!clientPhone.trim()) { setError('El teléfono es requerido.'); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/bookings/public/${slug}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: clientName.trim(),
          clientPhone: clientPhone.trim(),
          comment: clientComment.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo confirmar la reserva.');
      } else {
        setSuccess(true);
        setClientName('');
        setClientPhone('');
        setClientComment('');
      }
    } catch (err) {
      setError('No se pudo confirmar la reserva.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f2f2f7', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={{ background: '#fff', borderRadius: 24, padding: '36px 32px', border: '0.5px solid #e0e0e5', width: '100%', maxWidth: 420, animation: 'slideUp 250ms cubic-bezier(0.16,1,0.3,1) both', boxShadow: '0 2px 40px rgba(0,0,0,0.06)' }}>

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', color: '#0071e3', marginBottom: 4 }}>TuAgendaYa</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a' }}>Reservar turno</div>
          <div style={{ fontSize: 13, color: '#6e6e73', marginTop: 4 }}>@{slug}</div>
        </div>

        {success ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#30d158', marginBottom: 8 }}>
              Reserva confirmada correctamente.
            </div>
            <div style={{ fontSize: 13, color: '#6e6e73' }}>
              El profesional se pondrá en contacto con vos pronto.
            </div>
            <button
              onClick={() => setSuccess(false)}
              style={{ marginTop: 20, padding: '10px 20px', borderRadius: 12, border: 'none', background: '#0071e3', color: '#fff', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}
            >
              Hacer otra reserva
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ fontSize: 11, color: '#6e6e73', marginBottom: 4 }}>Nombre completo *</div>
            <input
              style={inputStyle}
              value={clientName}
              onChange={e => setClientName(e.target.value)}
              placeholder="Tu nombre"
              required
            />

            <div style={{ fontSize: 11, color: '#6e6e73', marginBottom: 4 }}>Teléfono *</div>
            <input
              style={inputStyle}
              value={clientPhone}
              onChange={e => setClientPhone(e.target.value)}
              placeholder="099 123 456"
              required
            />

            <div style={{ fontSize: 11, color: '#6e6e73', marginBottom: 4 }}>Comentario (opcional)</div>
            <textarea
              style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
              value={clientComment}
              onChange={e => setClientComment(e.target.value)}
              placeholder="¿Algo que quieras aclarar?"
            />

            {error && (
              <div style={{ background: '#fff2f2', border: '0.5px solid #ffcdd2', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: '#c62828', marginBottom: 12 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: loading ? '#aeaeb2' : '#0071e3', color: '#fff', fontSize: 15, fontWeight: 600, fontFamily: 'inherit', cursor: loading ? 'not-allowed' : 'pointer', marginTop: 4 }}
            >
              {loading ? 'Enviando reserva...' : 'Confirmar reserva'}
            </button>
          </form>
        )}

        <div style={{ textAlign: 'center', fontSize: 11, color: '#aeaeb2', marginTop: 16 }}>
          🔒 Tus datos están protegidos
        </div>
      </div>
    </div>
  );
}
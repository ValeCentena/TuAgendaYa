import { useState } from 'react';
import { useParams } from 'react-router-dom';

const API_BASE = 'https://tuagendaya-api.onrender.com/api';

function addMinutes(timeStr, minutes) {
  const [h, m] = timeStr.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const hh = String(Math.floor(total / 60) % 24).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

export default function BookPage() {
  const { slug } = useParams();
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientComment, setClientComment] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const today = new Date().toISOString().slice(0, 10);

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 10,
    border: '0.5px solid #d0d0d5', fontSize: 14, fontFamily: 'inherit',
    outline: 'none', boxSizing: 'border-box', marginBottom: 12,
    background: '#fff', color: '#1a1a1a',
  };

  const labelStyle = { fontSize: 11, color: '#6e6e73', marginBottom: 4, display: 'block' };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!clientName.trim()) { setError('El nombre es requerido.'); return; }
    if (!clientPhone.trim()) { setError('El teléfono es requerido.'); return; }
    if (!bookingDate) { setError('La fecha del turno es requerida.'); return; }
    if (!startTime) { setError('El horario de inicio es requerido.'); return; }

    const endTime = addMinutes(startTime, 30);

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/bookings/public/${slug}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: clientName.trim(),
          clientPhone: clientPhone.trim(),
          comment: clientComment.trim(),
          bookingDate,
          startTime,
          endTime,
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
        setBookingDate('');
        setStartTime('');
      }
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f2f2f7', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={{ background: '#fff', borderRadius: 24, padding: '36px 32px', border: '0.5px solid #e0e0e5', width: '100%', maxWidth: 440, animation: 'slideUp 250ms cubic-bezier(0.16,1,0.3,1) both', boxShadow: '0 2px 40px rgba(0,0,0,0.06)' }}>

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', color: '#0071e3', marginBottom: 4 }}>TuAgendaYa</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a' }}>Reservar turno</div>
          <div style={{ fontSize: 13, color: '#6e6e73', marginTop: 4 }}>@{slug}</div>
        </div>

        {success ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#30d158', marginBottom: 12 }}>
              Reserva confirmada
            </div>
            <div style={{ background: '#f2f2f7', borderRadius: 14, padding: '14px 16px', marginBottom: 16, textAlign: 'left' }}>
              <div style={{ fontSize: 12, color: '#6e6e73', marginBottom: 6 }}>Resumen de tu turno</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', marginBottom: 4 }}>{clientName || 'Reserva realizada'}</div>
              {bookingDate && (
                <div style={{ fontSize: 13, color: '#6e6e73' }}>
                  📅 {formatDate(bookingDate)}{startTime ? ` · ⏰ ${startTime}` : ''}
                </div>
              )}
            </div>
            <div style={{ fontSize: 13, color: '#6e6e73', marginBottom: 20 }}>
              El profesional se pondrá en contacto con vos para confirmar.
            </div>
            <button
              onClick={() => setSuccess(false)}
              style={{ padding: '10px 24px', borderRadius: 12, border: 'none', background: '#0071e3', color: '#fff', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}
            >
              Hacer otra reserva
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>

            <div style={{ background: '#f2f2f7', borderRadius: 14, padding: '14px 16px', marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a', marginBottom: 10 }}>📅 Fecha y horario</div>
              <label style={labelStyle}>Fecha del turno *</label>
              <input
                style={inputStyle}
                type="date"
                value={bookingDate}
                min={today}
                onChange={e => setBookingDate(e.target.value)}
                required
              />
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Hora de inicio *</label>
                  <input
                    style={{ ...inputStyle, marginBottom: 0 }}
                    type="time"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    required
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Hora de fin</label>
                  <input
                    style={{ ...inputStyle, marginBottom: 0, background: '#ebebeb', color: '#aeaeb2' }}
                    type="time"
                    value={startTime ? addMinutes(startTime, 30) : ''}
                    readOnly
                  />
                </div>
              </div>
            </div>

            <div style={{ background: '#f2f2f7', borderRadius: 14, padding: '14px 16px', marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a', marginBottom: 10 }}>👤 Tus datos</div>
              <label style={labelStyle}>Nombre completo *</label>
              <input
                style={inputStyle}
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                placeholder="Tu nombre"
                required
              />
              <label style={labelStyle}>Teléfono *</label>
              <input
                style={inputStyle}
                value={clientPhone}
                onChange={e => setClientPhone(e.target.value)}
                placeholder="099 123 456"
                required
              />
              <label style={labelStyle}>Comentario (opcional)</label>
              <textarea
                style={{ ...inputStyle, resize: 'vertical', minHeight: 70, marginBottom: 0 }}
                value={clientComment}
                onChange={e => setClientComment(e.target.value)}
                placeholder="¿Algo que quieras aclarar?"
              />
            </div>

            {error && (
              <div style={{ background: '#fff2f2', border: '0.5px solid #ffcdd2', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: '#c62828', marginBottom: 12 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: loading ? '#aeaeb2' : '#0071e3', color: '#fff', fontSize: 15, fontWeight: 600, fontFamily: 'inherit', cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Enviando reserva...' : 'Confirmar reserva'}
            </button>

            <div style={{ textAlign: 'center', fontSize: 11, color: '#aeaeb2', marginTop: 14 }}>
              🔒 Tus datos están protegidos
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
import { Link } from 'react-router-dom';
import { formatDateEs } from '../utils/validation';

export default function BookingConfirmation({ booking }) {
  const formattedDate = formatDateEs(booking.date);

  return (
    <div className="confirmation">
      <div className="check" aria-hidden="true">✓</div>
      <h3>¡Turno confirmado!</h3>
      <p className="confirmation-ref">Reserva #{booking.id}</p>

      <div className="confirmation-card">
        <div className="confirmation-row">
          <span className="confirmation-label">Profesional</span>
          <span>{booking.professional.name}</span>
        </div>
        {booking.professional.specialty && (
          <div className="confirmation-row">
            <span className="confirmation-label">Especialidad</span>
            <span>{booking.professional.specialty}</span>
          </div>
        )}
        <div className="confirmation-row">
          <span className="confirmation-label">Fecha</span>
          <span className="confirmation-capitalize">{formattedDate}</span>
        </div>
        <div className="confirmation-row">
          <span className="confirmation-label">Horario</span>
          <span>{booking.time} hs ({booking.professional.duration_minutes} min)</span>
        </div>
        <div className="confirmation-row">
          <span className="confirmation-label">Cliente</span>
          <span>{booking.clientName}</span>
        </div>
      </div>

      {booking.whatsappSent ? (
        <p className="confirmation-note confirmation-note-success">
          Te enviamos la confirmación por WhatsApp.
        </p>
      ) : (
        <p className="confirmation-note">
          Guardá este comprobante. La confirmación por WhatsApp no está configurada en este entorno.
        </p>
      )}

      <Link to="/" className="btn btn-primary confirmation-cta">
        Volver al inicio
      </Link>
    </div>
  );
}

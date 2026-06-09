import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import Calendar from '../components/Calendar';
import TimeSlots from '../components/TimeSlots';
import StepProgress from '../components/StepProgress';
import BookingConfirmation from '../components/BookingConfirmation';
import FormField from '../components/FormField';
import {
  getProfessionalBySlug,
  getAvailableDates,
  getAvailableSlots,
  createBooking,
  ApiError,
} from '../api/client';
import { validateBookingForm } from '../utils/validation';

function initials(name) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

export default function BookPage() {
  const { slug } = useParams();
  const now = new Date();

  const [professional, setProfessional] = useState(null);
  const [step, setStep] = useState(0);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [selectedTime, setSelectedTime] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [confirmation, setConfirmation] = useState(null);

  useEffect(() => {
    setPageError(null);
    getProfessionalBySlug(slug)
      .then(setProfessional)
      .catch((err) => {
        setPageError(err instanceof ApiError ? err.message : 'Profesional no encontrado');
      });
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    getAvailableDates(slug, monthStr)
      .then(setAvailableDates)
      .catch(() => setAvailableDates([]));
  }, [slug, year, month]);

  useEffect(() => {
    if (!slug || !selectedDate) return;
    getAvailableSlots(slug, selectedDate)
      .then(setSlots)
      .catch(() => setSlots([]));
  }, [slug, selectedDate]);

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setSelectedTime('');
    setSubmitError(null);
    setStep(1);
  };

  const handleTimeSelect = (time) => {
    setSelectedTime(time);
    setSubmitError(null);
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    const errors = validateBookingForm({ clientName, clientPhone, clientEmail });
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);

    try {
      const result = await createBooking({
        slug,
        date: selectedDate,
        time: selectedTime,
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        clientEmail: clientEmail.trim(),
      });
      setConfirmation(result);
      setStep(3);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setSubmitError('Ese horario acaba de ser reservado. Elegí otro horario.');
        setStep(1);
        setSelectedTime('');
        getAvailableSlots(slug, selectedDate).then(setSlots).catch(() => {});
      } else {
        setSubmitError(err instanceof ApiError ? err.message : 'No se pudo confirmar la reserva');
      }
    } finally {
      setLoading(false);
    }
  };

  if (pageError) {
    return (
      <Layout>
        <div className="page-center">
          <div className="alert alert-error">{pageError}</div>
          <Link to="/" className="btn btn-primary">Volver al inicio</Link>
        </div>
      </Layout>
    );
  }

  if (!professional) {
    return (
      <Layout>
        <div className="page-center">
          <div className="loading-spinner" aria-label="Cargando" />
          <p className="text-muted">Cargando agenda...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showNav={false}>
      <div className="booking-layout">
        <div className="card booking-card">
          <aside className="booking-sidebar">
            <div className="pro-avatar">{initials(professional.name)}</div>
            <h2>{professional.name}</h2>
            <p className="meta">{professional.specialty}</p>
            <p className="meta">⏱ {professional.duration_minutes} minutos</p>
            {professional.bio && <p className="meta booking-bio">{professional.bio}</p>}
            {step < 3 && selectedDate && (
              <p className="meta booking-selection">
                {selectedDate}{selectedTime ? ` · ${selectedTime}` : ''}
              </p>
            )}
          </aside>

          <main className="booking-main">
            <StepProgress current={step} />

            {step === 0 && (
              <>
                <h3 className="step-title">Seleccioná una fecha</h3>
                <Calendar
                  year={year}
                  month={month}
                  availableDates={availableDates}
                  selectedDate={selectedDate}
                  onSelectDate={handleDateSelect}
                  onMonthChange={(y, m) => { setYear(y); setMonth(m); }}
                />
              </>
            )}

            {step === 1 && (
              <>
                <button type="button" className="btn btn-ghost step-back" onClick={() => setStep(0)}>
                  ← Cambiar fecha
                </button>
                <h3 className="step-title">Seleccioná un horario</h3>
                {submitError && <div className="alert alert-error">{submitError}</div>}
                <TimeSlots slots={slots} selected={selectedTime} onSelect={handleTimeSelect} />
              </>
            )}

            {step === 2 && (
              <>
                <button type="button" className="btn btn-ghost step-back" onClick={() => setStep(1)}>
                  ← Cambiar horario
                </button>
                <h3 className="step-title">Ingresá tus datos</h3>
                {submitError && <div className="alert alert-error">{submitError}</div>}
                <form onSubmit={handleSubmit} noValidate>
                  <FormField
                    id="name"
                    label="Nombre completo"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    error={fieldErrors.clientName}
                    required
                  />
                  <FormField
                    id="phone"
                    label="WhatsApp / Teléfono"
                    type="tel"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    error={fieldErrors.clientPhone}
                    placeholder="+54 11 1234-5678"
                    required
                  />
                  <FormField
                    id="email"
                    label="Email (opcional)"
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    error={fieldErrors.clientEmail}
                  />
                  <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                    {loading ? 'Confirmando...' : 'Confirmar turno'}
                  </button>
                </form>
              </>
            )}

            {step === 3 && confirmation && (
              <BookingConfirmation booking={confirmation} />
            )}
          </main>
        </div>
      </div>
    </Layout>
  );
}

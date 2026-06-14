import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

const API_BASE = 'https://tuagendaya-api.onrender.com/api';

const FONT_STACK = '"SF Pro Display", "SF Pro Text", -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif';

function addMinutes(timeStr, minutes) {
  const [h, m] = timeStr.split(':').map(Number);
  const total = h * 60 + m + Number(minutes || 30);
  const hh = String(Math.floor(total / 60) % 24).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

function normalizeService(item) {
  return {
    id: item.id,
    name: item.name || '',
    description: item.description || '',
    durationMinutes: Number(item.durationMinutes ?? item.duration_minutes ?? 30),
    price: item.price === null || item.price === undefined || item.price === '' ? '' : String(item.price),
    isActive: Boolean(item.isActive ?? item.is_active),
  };
}

function normalizeStaff(item) {
  return {
    id: item.id,
    name: item.name || '',
    color: item.color || '#0071e3',
    isActive: Boolean(item.isActive ?? item.is_active ?? true),
  };
}

export default function BookPage() {
  const { slug } = useParams();

  const [business, setBusiness] = useState(null);

  const [services, setServices] = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [loadingServices, setLoadingServices] = useState(true);

  const [staff, setStaff] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [loadingStaff, setLoadingStaff] = useState(true);

  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientComment, setClientComment] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [slots, setSlots] = useState([]);

  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const today = new Date().toISOString().slice(0, 10);

  const selectedService = services.find((service) => String(service.id) === String(selectedServiceId));
  const selectedStaff = staff.find((member) => String(member.id) === String(selectedStaffId));

  const selectedDuration = selectedService?.durationMinutes || 30;
  const selectedEndTime = selectedTime ? addMinutes(selectedTime, selectedDuration) : '';

  useEffect(() => {
    setLoadingServices(true);
    setError('');

    fetch(`${API_BASE}/professionals/public/${slug}/services`)
      .then((r) => r.json())
      .then((data) => {
        const activeServices = (data.services || [])
          .map(normalizeService)
          .filter((service) => service.isActive);

        setServices(activeServices);

        if (activeServices.length > 0) {
          setSelectedServiceId(String(activeServices[0].id));
        }
      })
      .catch(() => {
        setServices([]);
        setError('No se pudieron cargar los servicios.');
      })
      .finally(() => setLoadingServices(false));
  }, [slug]);

  useEffect(() => {
    setLoadingStaff(true);
    setError('');

    fetch(`${API_BASE}/bookings/public/${slug}/staff`)
      .then((r) => r.json())
      .then((data) => {
        const activeStaff = (data.staff || [])
          .map(normalizeStaff)
          .filter((member) => member.isActive);

        setBusiness(data.business || null);
        setStaff(activeStaff);

        if (activeStaff.length > 0) {
          setSelectedStaffId(String(activeStaff[0].id));
        }
      })
      .catch(() => {
        setStaff([]);
        setBusiness(null);
        setError('No se pudieron cargar los profesionales.');
      })
      .finally(() => setLoadingStaff(false));
  }, [slug]);

  useEffect(() => {
    if (!bookingDate || !selectedServiceId || !selectedStaffId) {
      setSlots([]);
      setSelectedTime('');
      return;
    }

    setSelectedTime('');
    setSlots([]);
    setLoadingSlots(true);

    fetch(`${API_BASE}/bookings/public/${slug}/slots?date=${bookingDate}&serviceId=${selectedServiceId}&staffId=${selectedStaffId}`)
      .then((r) => r.json())
      .then((data) => setSlots(data.slots || []))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [bookingDate, selectedServiceId, selectedStaffId, slug]);

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 10,
    border: '0.5px solid #d0d0d5',
    fontSize: 14,
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
    marginBottom: 12,
    background: '#fff',
    color: '#1a1a1a',
  };

  const labelStyle = {
    fontSize: 11,
    color: '#6e6e73',
    marginBottom: 4,
    display: 'block',
    fontWeight: 600,
  };

  const refreshSlots = () => {
    if (!bookingDate || !selectedServiceId || !selectedStaffId) return;

    setSelectedTime('');
    setLoadingSlots(true);

    fetch(`${API_BASE}/bookings/public/${slug}/slots?date=${bookingDate}&serviceId=${selectedServiceId}&staffId=${selectedStaffId}`)
      .then((r) => r.json())
      .then((data) => setSlots(data.slots || []))
      .catch(() => {})
      .finally(() => setLoadingSlots(false));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedServiceId) {
      setError('Seleccioná un servicio.');
      return;
    }

    if (!selectedStaffId) {
      setError('Seleccioná un profesional.');
      return;
    }

    if (!clientName.trim()) {
      setError('El nombre es requerido.');
      return;
    }

    if (!clientPhone.trim()) {
      setError('El teléfono es requerido.');
      return;
    }

    if (!bookingDate) {
      setError('La fecha del turno es requerida.');
      return;
    }

    if (!selectedTime) {
      setError('Seleccioná un horario disponible.');
      return;
    }

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
          startTime: selectedTime,
          serviceId: Number(selectedServiceId),
          staffId: Number(selectedStaffId),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'No se pudo confirmar la reserva.');

        if (res.status === 409) {
          refreshSlots();
        }
      } else {
        setSuccess(true);
      }
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSuccess(false);
    setClientName('');
    setClientPhone('');
    setClientComment('');
    setBookingDate('');
    setSelectedTime('');
    setSlots([]);
    setError('');

    if (services.length > 0) {
      setSelectedServiceId(String(services[0].id));
    }

    if (staff.length > 0) {
      setSelectedStaffId(String(staff[0].id));
    }
  };

  const formatDate = (d) => {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  };

  const availableSlots = slots.filter((slot) => slot.available);
  const hasSlots = slots.length > 0;
  const businessName = business?.businessName || business?.name || 'TuAgendaYa';

  const canChooseDate = Boolean(selectedServiceId && selectedStaffId);

  return (
    <div style={{ minHeight: '100vh', background: '#f2f2f7', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: FONT_STACK }}>
      <style>{`
        @keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .slot-btn { transition: background 0.12s, color 0.12s, transform 0.1s; }
        .slot-btn:active { transform: scale(0.96); }
        .service-card { transition: transform 0.12s, border 0.12s, background 0.12s; }
        .service-card:active { transform: scale(0.98); }
      `}</style>

      <div style={{ background: '#fff', borderRadius: 24, padding: '36px 32px', border: '0.5px solid #e0e0e5', width: '100%', maxWidth: 500, animation: 'slideUp 250ms cubic-bezier(0.16,1,0.3,1) both', boxShadow: '0 2px 40px rgba(0,0,0,0.06)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          {business?.logoUrl ? (
            <img
              src={business.logoUrl}
              alt={businessName}
              style={{ maxWidth: 150, maxHeight: 64, objectFit: 'contain', marginBottom: 10 }}
            />
          ) : (
            <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.035em', color: '#0071e3', marginBottom: 4, fontFamily: FONT_STACK }}>
              {businessName}
            </div>
          )}

          <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a' }}>Reservar turno</div>

          {business?.address && (
            <div style={{ fontSize: 12, color: '#6e6e73', marginTop: 4 }}>{business.address}</div>
          )}

          <div style={{ fontSize: 13, color: '#6e6e73', marginTop: 4 }}>@{slug}</div>
        </div>

        {success ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#30d158', marginBottom: 12 }}>
              Reserva recibida
            </div>

            <div style={{ background: '#f2f2f7', borderRadius: 14, padding: '14px 16px', marginBottom: 16, textAlign: 'left' }}>
              <div style={{ fontSize: 12, color: '#6e6e73', marginBottom: 6 }}>Resumen del turno</div>

              <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', marginBottom: 4 }}>
                {clientName}
              </div>

              {selectedService && (
                <div style={{ fontSize: 13, color: '#0071e3', marginBottom: 4 }}>
                  Servicio: <strong>{selectedService.name}</strong> · {selectedService.durationMinutes} min
                </div>
              )}

              {selectedStaff && (
                <div style={{ fontSize: 13, color: '#3a3a3c', marginBottom: 4 }}>
                  Profesional: <strong>{selectedStaff.name}</strong>
                </div>
              )}

              <div style={{ fontSize: 13, color: '#3a3a3c' }}>
                {formatDate(bookingDate)} · {selectedTime} a {selectedEndTime}
              </div>
            </div>

            <div style={{ fontSize: 13, color: '#6e6e73', lineHeight: 1.45, marginBottom: 16 }}>
              Tu reserva fue enviada al negocio. Cuando activen WhatsApp o email, vas a recibir la confirmación por ese medio.
            </div>

            <button
              type="button"
              onClick={handleReset}
              style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: '#0071e3', color: '#fff', fontSize: 15, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}
            >
              Hacer otra reserva
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ background: '#f2f2f7', borderRadius: 14, padding: '14px 16px', marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1a1a1a', marginBottom: 10 }}>
                Elegí un servicio
              </div>

              {loadingServices ? (
                <div style={{ textAlign: 'center', color: '#aeaeb2', fontSize: 13, padding: '12px 0' }}>
                  Cargando servicios...
                </div>
              ) : services.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#aeaeb2', fontSize: 13, padding: '12px 0' }}>
                  Este negocio todavía no tiene servicios activos.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 8 }}>
                  {services.map((service) => {
                    const isSelected = String(selectedServiceId) === String(service.id);

                    return (
                      <button
                        key={service.id}
                        type="button"
                        className="service-card"
                        onClick={() => {
                          setSelectedServiceId(String(service.id));
                          setSelectedTime('');
                          setSlots([]);
                        }}
                        style={{
                          textAlign: 'left',
                          padding: '12px 14px',
                          borderRadius: 12,
                          border: isSelected ? '2px solid #0071e3' : '1px solid #d0d0d5',
                          background: isSelected ? '#eef6ff' : '#fff',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>
                              {service.name}
                            </div>

                            {service.description && (
                              <div style={{ fontSize: 12, color: '#6e6e73', marginTop: 3 }}>
                                {service.description}
                              </div>
                            )}
                          </div>

                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#0071e3' }}>
                              {service.durationMinutes} min
                            </div>

                            {service.price && (
                              <div style={{ fontSize: 12, color: '#6e6e73', marginTop: 3 }}>
                                ${service.price}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {staff.length > 1 && (
              <div style={{ background: '#f2f2f7', borderRadius: 14, padding: '14px 16px', marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1a1a1a', marginBottom: 10 }}>
                  Elegí un profesional
                </div>

                {loadingStaff ? (
                  <div style={{ textAlign: 'center', color: '#aeaeb2', fontSize: 13, padding: '12px 0' }}>
                    Cargando profesionales...
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 8 }}>
                    {staff.map((member) => {
                      const isSelected = String(selectedStaffId) === String(member.id);

                      return (
                        <button
                          key={member.id}
                          type="button"
                          className="service-card"
                          onClick={() => {
                            setSelectedStaffId(String(member.id));
                            setSelectedTime('');
                            setSlots([]);
                          }}
                          style={{
                            textAlign: 'left',
                            padding: '12px 14px',
                            borderRadius: 12,
                            border: isSelected ? '2px solid #0071e3' : '1px solid #d0d0d5',
                            background: isSelected ? '#eef6ff' : '#fff',
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ width: 12, height: 12, borderRadius: 99, background: member.color, display: 'inline-block' }} />
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>
                              {member.name}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {staff.length === 1 && selectedStaff && (
              <div style={{ background: '#f2f2f7', borderRadius: 14, padding: '12px 16px', marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: '#6e6e73' }}>
                  Profesional: <strong style={{ color: '#1a1a1a' }}>{selectedStaff.name}</strong>
                </div>
              </div>
            )}

            {staff.length === 0 && !loadingStaff && (
              <div style={{ background: '#fff2f2', border: '0.5px solid #ffcdd2', borderRadius: 12, padding: '10px 12px', fontSize: 13, color: '#c62828', marginBottom: 14 }}>
                Este negocio todavía no tiene profesionales activos para reservar.
              </div>
            )}

            <div style={{ background: '#f2f2f7', borderRadius: 14, padding: '14px 16px', marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1a1a1a', marginBottom: 10 }}>
                Elegí una fecha
              </div>

              <label style={labelStyle}>Fecha del turno *</label>

              <input
                style={{ ...inputStyle, marginBottom: 0 }}
                type="date"
                value={bookingDate}
                min={today}
                onChange={(e) => setBookingDate(e.target.value)}
                required
                disabled={!canChooseDate}
              />
            </div>

            {bookingDate && canChooseDate && (
              <div style={{ background: '#f2f2f7', borderRadius: 14, padding: '14px 16px', marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1a1a1a', marginBottom: 10 }}>
                  Elegí un horario
                  {selectedTime && (
                    <span style={{ marginLeft: 8, fontWeight: 400, color: '#0071e3' }}>
                      — {selectedTime} a {selectedEndTime}
                    </span>
                  )}
                </div>

                {selectedService && selectedStaff && (
                  <div style={{ fontSize: 12, color: '#6e6e73', marginBottom: 10 }}>
                    Servicio: <strong>{selectedService.name}</strong> · Profesional: <strong>{selectedStaff.name}</strong> · Duración: <strong>{selectedService.durationMinutes} min</strong>
                  </div>
                )}

                {loadingSlots ? (
                  <div style={{ textAlign: 'center', color: '#aeaeb2', fontSize: 13, padding: '12px 0' }}>
                    Cargando horarios...
                  </div>
                ) : !hasSlots ? (
                  <div style={{ textAlign: 'center', color: '#aeaeb2', fontSize: 13, padding: '12px 0' }}>
                    No hay horarios disponibles para esta fecha.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {slots.map((slot) => {
                      const isSelected = selectedTime === slot.time;
                      const isAvailable = slot.available;

                      return (
                        <button
                          key={slot.time}
                          type="button"
                          className="slot-btn"
                          disabled={!isAvailable}
                          onClick={() => isAvailable && setSelectedTime(slot.time)}
                          style={{
                            padding: '8px 14px',
                            borderRadius: 10,
                            border: isSelected
                              ? '2px solid #0071e3'
                              : isAvailable
                                ? '1px solid #d0d0d5'
                                : '1px solid #e0e0e5',
                            background: isSelected
                              ? '#0071e3'
                              : isAvailable
                                ? '#fff'
                                : '#f2f2f7',
                            color: isSelected
                              ? '#fff'
                              : isAvailable
                                ? '#1a1a1a'
                                : '#c0c0c5',
                            fontSize: 13,
                            fontWeight: isSelected ? 600 : 400,
                            fontFamily: 'inherit',
                            cursor: isAvailable ? 'pointer' : 'not-allowed',
                            textDecoration: isAvailable ? 'none' : 'line-through',
                          }}
                        >
                          {slot.time}
                        </button>
                      );
                    })}
                  </div>
                )}

                {hasSlots && availableSlots.length === 0 && (
                  <div style={{ fontSize: 12, color: '#ff453a', marginTop: 8 }}>
                    Todos los horarios están ocupados para esta fecha.
                  </div>
                )}
              </div>
            )}

            <div style={{ background: '#f2f2f7', borderRadius: 14, padding: '14px 16px', marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1a1a1a', marginBottom: 10 }}>
                Tus datos
              </div>

              <label style={labelStyle}>Nombre completo *</label>

              <input
                style={inputStyle}
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Tu nombre"
                required
              />

              <label style={labelStyle}>Teléfono *</label>

              <input
                style={inputStyle}
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="099 123 456"
                required
              />

              <label style={labelStyle}>Comentario opcional</label>

              <textarea
                style={{ ...inputStyle, resize: 'vertical', minHeight: 70, marginBottom: 0 }}
                value={clientComment}
                onChange={(e) => setClientComment(e.target.value)}
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
              disabled={loading || !selectedServiceId || !selectedStaffId || !selectedTime}
              style={{
                width: '100%',
                padding: '13px',
                borderRadius: 12,
                border: 'none',
                background: loading || !selectedServiceId || !selectedStaffId || !selectedTime ? '#aeaeb2' : '#0071e3',
                color: '#fff',
                fontSize: 15,
                fontWeight: 600,
                fontFamily: 'inherit',
                cursor: loading || !selectedServiceId || !selectedStaffId || !selectedTime ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Reservando...' : 'Confirmar reserva'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
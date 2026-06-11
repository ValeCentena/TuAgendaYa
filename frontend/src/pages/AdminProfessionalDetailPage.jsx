import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api/client';
import toast from 'react-hot-toast';

function StatusBadge({ status }) {
  const isActive = !status || status === 'active';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      padding: '4px 12px', borderRadius: '20px',
      fontSize: '13px', fontWeight: 600,
      background: isActive ? '#e8f5e9' : '#ffeaea',
      color: isActive ? '#2e7d32' : '#c62828',
    }}>
      <span style={{ fontSize: '8px' }}>●</span>
      {isActive ? 'Activo' : 'Suspendido'}
    </span>
  );
}

function Section({ title, children }) {
  return (
    <div style={{
      background: '#fff', borderRadius: '16px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      marginBottom: '20px', overflow: 'hidden',
    }}>
      <div style={{ padding: '18px 24px', borderBottom: '1px solid #f2f2f7' }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#1a1a1a' }}>{title}</h3>
      </div>
      <div style={{ padding: '20px 24px' }}>{children}</div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ fontSize: '12px', color: '#86868b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '15px', color: value ? '#1a1a1a' : '#c7c7cc' }}>{value || '—'}</div>
    </div>
  );
}

export default function AdminProfessionalDetailPage() {
  const { id } = useParams();
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-professional', id],
    queryFn: () => adminApi.professionalDetail(id).then(r => r.data),
    staleTime: 10_000,
  });

  const statusMutation = useMutation({
    mutationFn: (status) => adminApi.updateStatus(id, status),
    onSuccess: (_, status) => {
      qc.invalidateQueries({ queryKey: ['admin-professional', id] });
      qc.invalidateQueries({ queryKey: ['admin-professionals'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success(status === 'active' ? 'Profesional activado' : 'Profesional suspendido');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Error al cambiar estado'),
  });

  if (isLoading) return (
    <div style={{ padding: '48px', textAlign: 'center', color: '#86868b' }}>Cargando...</div>
  );
  if (error) return (
    <div style={{ padding: '32px', color: '#ff3b30' }}>
      {error.response?.data?.error || 'Error al cargar el profesional'}
    </div>
  );

  const { professional: p, recent_appointments, clients, services } = data;
  const isActive = !p.status || p.status === 'active';

  function handleToggleStatus() {
    const newStatus = isActive ? 'suspended' : 'active';
    const label = isActive ? 'suspender' : 'activar';
    if (!confirm(`¿Querés ${label} a ${p.name}?`)) return;
    statusMutation.mutate(newStatus);
  }

  return (
    <div style={{ padding: '32px', maxWidth: '900px' }}>
      {/* Back */}
      <Link to="/admin/professionals" style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        color: '#0071e3', textDecoration: 'none', fontSize: '14px',
        fontWeight: 500, marginBottom: '24px',
      }}>
        ← Volver a profesionales
      </Link>

      {/* Header card */}
      <div style={{
        background: '#fff', borderRadius: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        padding: '28px',
        marginBottom: '20px',
        display: 'flex', alignItems: 'center', gap: '20px',
        flexWrap: 'wrap',
      }}>
        <div style={{
          width: '60px', height: '60px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #0071e3, #0a84ff)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: '22px', fontWeight: 700, flexShrink: 0,
        }}>
          {p.avatar_initials || p.name?.[0]?.toUpperCase() || '?'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '4px' }}>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#1a1a1a' }}>{p.name}</h1>
            <StatusBadge status={p.status} />
          </div>
          <div style={{ color: '#86868b', fontSize: '14px' }}>{p.profession || 'Sin profesión'} · {p.email}</div>
          <code style={{ background: '#f2f2f7', padding: '2px 8px', borderRadius: '6px', fontSize: '13px', color: '#1a1a1a', marginTop: '6px', display: 'inline-block' }}>
            /{p.slug}
          </code>
        </div>
        <button
          onClick={handleToggleStatus}
          disabled={statusMutation.isPending}
          style={{
            padding: '10px 20px', borderRadius: '10px',
            border: `1px solid ${isActive ? '#ff3b30' : '#34c759'}`,
            background: 'transparent',
            color: isActive ? '#ff3b30' : '#34c759',
            fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          {isActive ? '🚫 Suspender' : '✅ Activar'}
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
        {[
          { label: 'Turnos', value: p.appointment_count, icon: '📅' },
          { label: 'Clientes', value: p.client_count, icon: '🧑‍💼' },
          { label: 'Servicios activos', value: p.service_count, icon: '⚡' },
        ].map(s => (
          <div key={s.label} style={{
            background: '#fff', borderRadius: '14px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            padding: '20px 24px',
            display: 'flex', alignItems: 'center', gap: '14px',
          }}>
            <span style={{ fontSize: '24px' }}>{s.icon}</span>
            <div>
              <div style={{ fontSize: '26px', fontWeight: 700, color: '#1a1a1a', lineHeight: 1 }}>{s.value ?? '—'}</div>
              <div style={{ fontSize: '13px', color: '#86868b', marginTop: '4px' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Profile data */}
      <Section title="Datos del perfil">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
          <Field label="Teléfono" value={p.phone} />
          <Field label="Plan" value={p.plan} />
          <Field label="Zona horaria" value={p.timezone} />
          <Field label="Registrado" value={p.created_at ? new Date(p.created_at).toLocaleDateString('es-AR', { dateStyle: 'medium' }) : null} />
        </div>
        {p.bio && <Field label="Bio" value={p.bio} />}
      </Section>

      {/* Services */}
      {services?.length > 0 && (
        <Section title={`Servicios (${services.length})`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {services.map(s => (
              <div key={s.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 14px', background: '#f9f9f9', borderRadius: '10px',
              }}>
                <div>
                  <span style={{ fontWeight: 500, color: '#1a1a1a', fontSize: '14px' }}>{s.name}</span>
                  <span style={{ color: '#86868b', fontSize: '13px', marginLeft: '8px' }}>{s.duration} min</span>
                </div>
                <span style={{ fontWeight: 600, color: '#1a1a1a', fontSize: '14px' }}>
                  {s.price > 0 ? `$${s.price.toLocaleString('es-AR')}` : 'Gratis'}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Recent appointments */}
      {recent_appointments?.length > 0 && (
        <Section title="Últimos turnos">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Cliente', 'Servicio', 'Fecha', 'Estado'].map(h => (
                  <th key={h} style={{
                    padding: '8px 0', textAlign: 'left',
                    fontSize: '12px', color: '#86868b', fontWeight: 600,
                    textTransform: 'uppercase', letterSpacing: '0.3px',
                    borderBottom: '1px solid #f2f2f7',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent_appointments.map((a, i) => (
                <tr key={a.id} style={{ borderBottom: '1px solid #f9f9f9' }}>
                  <td style={{ padding: '12px 0', fontSize: '14px', color: '#1a1a1a' }}>{a.client_name}</td>
                  <td style={{ padding: '12px 0', fontSize: '14px', color: '#86868b' }}>{a.service_name}</td>
                  <td style={{ padding: '12px 0', fontSize: '14px', color: '#86868b' }}>
                    {new Date(a.start_time).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td style={{ padding: '12px 0' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 500,
                      background: {
                        confirmed: '#e8f5e9', completed: '#e3f2fd', cancelled: '#ffeaea',
                        no_show: '#fff3e0', pending: '#f5f5f5',
                      }[a.status] || '#f5f5f5',
                      color: {
                        confirmed: '#2e7d32', completed: '#1565c0', cancelled: '#c62828',
                        no_show: '#e65100', pending: '#757575',
                      }[a.status] || '#757575',
                    }}>
                      {a.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {/* Clients */}
      {clients?.length > 0 && (
        <Section title={`Top clientes (${p.client_count} total)`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {clients.map(c => (
              <div key={c.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 14px', background: '#f9f9f9', borderRadius: '10px',
              }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: '14px', color: '#1a1a1a' }}>{c.name}</div>
                  {c.email && <div style={{ fontSize: '13px', color: '#86868b' }}>{c.email}</div>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '13px', color: '#1a1a1a', fontWeight: 500 }}>{c.total_visits} visitas</div>
                  {c.no_show_count > 0 && <div style={{ fontSize: '12px', color: '#ff9500' }}>{c.no_show_count} no-show</div>}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
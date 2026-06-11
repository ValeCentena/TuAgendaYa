import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { adminApi } from '../api/client';

function StatCard({ icon, label, value, sub, color = '#0071e3' }) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    }}>
      <div style={{
        width: '44px', height: '44px',
        background: `${color}18`,
        borderRadius: '12px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '22px',
        marginBottom: '16px',
      }}>
        {icon}
      </div>
      <div style={{ fontSize: '32px', fontWeight: 700, color: '#1a1a1a', lineHeight: 1 }}>
        {value ?? '—'}
      </div>
      <div style={{ fontSize: '14px', color: '#86868b', marginTop: '6px' }}>{label}</div>
      {sub && <div style={{ fontSize: '13px', color, marginTop: '4px', fontWeight: 500 }}>{sub}</div>}
    </div>
  );
}

function StatusBadge({ status }) {
  const isActive = !status || status === 'active';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      padding: '3px 10px',
      borderRadius: '20px',
      fontSize: '12px', fontWeight: 600,
      background: isActive ? '#e8f5e9' : '#ffeaea',
      color: isActive ? '#2e7d32' : '#c62828',
    }}>
      <span style={{ fontSize: '8px' }}>●</span>
      {isActive ? 'Activo' : 'Suspendido'}
    </span>
  );
}

export default function AdminDashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminApi.stats().then(r => r.data),
    staleTime: 30_000,
  });

  if (isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#86868b', fontSize: '15px' }}>
      Cargando estadísticas...
    </div>
  );

  if (error) return (
    <div style={{ padding: '32px', color: '#ff3b30' }}>
      Error al cargar: {error.response?.data?.error || error.message}
    </div>
  );

  const { totals, recent_professionals } = data;

  return (
    <div style={{ padding: '32px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#1a1a1a', margin: '0 0 6px' }}>
          Dashboard
        </h1>
        <p style={{ color: '#86868b', fontSize: '15px', margin: 0 }}>
          Visión general de la plataforma
        </p>
      </div>

      {/* Stats grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '16px',
        marginBottom: '32px',
      }}>
        <StatCard icon="👥" label="Profesionales" value={totals.professionals} sub={`+${totals.new_this_month} este mes`} />
        <StatCard icon="✅" label="Activos" value={totals.active} color="#34c759" />
        <StatCard icon="🚫" label="Suspendidos" value={totals.suspended} color="#ff3b30" />
        <StatCard icon="📅" label="Turnos totales" value={totals.appointments} color="#ff9500" />
        <StatCard icon="🧑‍💼" label="Clientes totales" value={totals.clients} color="#af52de" />
      </div>

      {/* Recent professionals */}
      <div style={{
        background: '#fff',
        borderRadius: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #f2f2f7',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <h2 style={{ fontSize: '17px', fontWeight: 600, margin: 0, color: '#1a1a1a' }}>
            Profesionales recientes
          </h2>
          <Link to="/admin/professionals" style={{ color: '#0071e3', fontSize: '14px', textDecoration: 'none', fontWeight: 500 }}>
            Ver todos →
          </Link>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9f9f9' }}>
              {['Nombre', 'Email', 'Profesión', 'Turnos', 'Estado'].map(h => (
                <th key={h} style={{
                  padding: '11px 24px', textAlign: 'left',
                  fontSize: '12px', fontWeight: 600, color: '#86868b',
                  letterSpacing: '0.3px', textTransform: 'uppercase',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(recent_professionals || []).map((p, i) => (
              <tr key={p.id} style={{ borderTop: i === 0 ? 'none' : '1px solid #f2f2f7' }}>
                <td style={{ padding: '14px 24px' }}>
                  <Link to={`/admin/professionals/${p.id}`} style={{ color: '#0071e3', textDecoration: 'none', fontWeight: 500, fontSize: '15px' }}>
                    {p.name}
                  </Link>
                </td>
                <td style={{ padding: '14px 24px', color: '#86868b', fontSize: '14px' }}>{p.email}</td>
                <td style={{ padding: '14px 24px', color: '#86868b', fontSize: '14px' }}>{p.profession || '—'}</td>
                <td style={{ padding: '14px 24px', color: '#1a1a1a', fontSize: '14px', fontWeight: 500 }}>{p.appointment_count}</td>
                <td style={{ padding: '14px 24px' }}><StatusBadge status={p.status} /></td>
              </tr>
            ))}
            {!recent_professionals?.length && (
              <tr>
                <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#86868b', fontSize: '15px' }}>
                  No hay profesionales aún
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
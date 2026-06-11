import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { adminApi } from '../api/client';
import toast from 'react-hot-toast';

function StatusBadge({ status }) {
  const isActive = !status || status === 'active';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      padding: '3px 10px', borderRadius: '20px',
      fontSize: '12px', fontWeight: 600,
      background: isActive ? '#e8f5e9' : '#ffeaea',
      color: isActive ? '#2e7d32' : '#c62828',
    }}>
      <span style={{ fontSize: '8px' }}>●</span>
      {isActive ? 'Activo' : 'Suspendido'}
    </span>
  );
}

export default function AdminProfessionalsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-professionals', search, statusFilter, page],
    queryFn: () => adminApi.professionals({ search, status: statusFilter, page, limit: 20 }).then(r => r.data),
    staleTime: 10_000,
    keepPreviousData: true,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => adminApi.updateStatus(id, status),
    onSuccess: (_, { status }) => {
      qc.invalidateQueries({ queryKey: ['admin-professionals'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success(status === 'active' ? 'Profesional activado' : 'Profesional suspendido');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Error al cambiar estado'),
  });

  const professionals = data?.professionals || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 20);

  function handleStatusToggle(p) {
    const newStatus = (p.status === 'suspended') ? 'active' : 'suspended';
    const label = newStatus === 'suspended' ? 'suspender' : 'activar';
    if (!confirm(`¿Querés ${label} a ${p.name}?`)) return;
    statusMutation.mutate({ id: p.id, status: newStatus });
  }

  return (
    <div style={{ padding: '32px' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#1a1a1a', margin: '0 0 6px' }}>
          Profesionales
        </h1>
        <p style={{ color: '#86868b', fontSize: '15px', margin: 0 }}>
          {total} profesionales registrados
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Buscar por nombre, email, slug..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          style={{
            flex: 1, minWidth: '240px',
            padding: '10px 16px',
            border: '1px solid #d1d1d6',
            borderRadius: '10px',
            fontSize: '15px',
            outline: 'none',
            color: '#1a1a1a',
          }}
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          style={{
            padding: '10px 16px',
            border: '1px solid #d1d1d6',
            borderRadius: '10px',
            fontSize: '15px',
            color: '#1a1a1a',
            background: '#fff',
            cursor: 'pointer',
          }}
        >
          <option value="">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="suspended">Suspendidos</option>
        </select>
      </div>

      {/* Table */}
      <div style={{
        background: '#fff',
        borderRadius: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        overflow: 'hidden',
      }}>
        {isLoading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#86868b' }}>
            Cargando...
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9f9f9' }}>
                {['Profesional', 'Profesión', 'Slug', 'Turnos', 'Clientes', 'Estado', ''].map(h => (
                  <th key={h} style={{
                    padding: '11px 20px', textAlign: 'left',
                    fontSize: '12px', fontWeight: 600, color: '#86868b',
                    letterSpacing: '0.3px', textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {professionals.map((p, i) => (
                <tr key={p.id} style={{ borderTop: i === 0 ? 'none' : '1px solid #f2f2f7' }}>
                  <td style={{ padding: '14px 20px' }}>
                    <Link to={`/admin/professionals/${p.id}`} style={{ textDecoration: 'none' }}>
                      <div style={{ fontWeight: 600, color: '#0071e3', fontSize: '15px' }}>{p.name}</div>
                      <div style={{ color: '#86868b', fontSize: '13px' }}>{p.email}</div>
                    </Link>
                  </td>
                  <td style={{ padding: '14px 20px', color: '#86868b', fontSize: '14px' }}>{p.profession || '—'}</td>
                  <td style={{ padding: '14px 20px' }}>
                    <code style={{ background: '#f2f2f7', padding: '3px 8px', borderRadius: '6px', fontSize: '13px', color: '#1a1a1a' }}>
                      /{p.slug}
                    </code>
                  </td>
                  <td style={{ padding: '14px 20px', color: '#1a1a1a', fontSize: '14px', fontWeight: 500 }}>{p.appointment_count}</td>
                  <td style={{ padding: '14px 20px', color: '#1a1a1a', fontSize: '14px' }}>{p.client_count}</td>
                  <td style={{ padding: '14px 20px' }}><StatusBadge status={p.status} /></td>
                  <td style={{ padding: '14px 20px' }}>
                    <button
                      onClick={() => handleStatusToggle(p)}
                      disabled={statusMutation.isPending}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        border: `1px solid ${p.status === 'suspended' ? '#34c759' : '#ff3b30'}`,
                        background: 'transparent',
                        color: p.status === 'suspended' ? '#34c759' : '#ff3b30',
                        fontSize: '13px', fontWeight: 500,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {p.status === 'suspended' ? 'Activar' : 'Suspender'}
                    </button>
                  </td>
                </tr>
              ))}
              {!professionals.length && (
                <tr>
                  <td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: '#86868b', fontSize: '15px' }}>
                    {search || statusFilter ? 'Sin resultados para esa búsqueda' : 'No hay profesionales registrados'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{
            padding: '16px 20px',
            borderTop: '1px solid #f2f2f7',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ color: '#86868b', fontSize: '14px' }}>
              Página {page} de {totalPages} · {total} total
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  padding: '6px 14px', borderRadius: '8px',
                  border: '1px solid #d1d1d6', background: '#fff',
                  color: page === 1 ? '#c7c7cc' : '#1a1a1a',
                  fontSize: '14px', cursor: page === 1 ? 'not-allowed' : 'pointer',
                }}
              >← Anterior</button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{
                  padding: '6px 14px', borderRadius: '8px',
                  border: '1px solid #d1d1d6', background: '#fff',
                  color: page === totalPages ? '#c7c7cc' : '#1a1a1a',
                  fontSize: '14px', cursor: page === totalPages ? 'not-allowed' : 'pointer',
                }}
              >Siguiente →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
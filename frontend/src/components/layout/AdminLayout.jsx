import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAdminStore } from '../../store/adminStore';

const NAV = [
  { to: '/admin/dashboard', icon: '📊', label: 'Dashboard' },
  { to: '/admin/professionals', icon: '👥', label: 'Profesionales' },
];

export default function AdminLayout() {
  const { isAuthenticated, logout } = useAdminStore();
  const navigate = useNavigate();

  if (!isAuthenticated) {
    navigate('/admin/login', { replace: true });
    return null;
  }

  function handleLogout() {
    logout();
    navigate('/admin/login');
  }

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#f2f2f7',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
    }}>
      {/* Sidebar */}
      <aside style={{
        width: '240px',
        flexShrink: 0,
        background: '#1a1a2e',
        display: 'flex',
        flexDirection: 'column',
        padding: '0',
      }}>
        {/* Brand */}
        <div style={{
          padding: '28px 24px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px', height: '36px',
              background: 'linear-gradient(135deg, #0071e3, #0a84ff)',
              borderRadius: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '16px',
            }}>🛡️</div>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '15px', lineHeight: 1.2 }}>Admin</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>TuAgendaYa</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '16px 12px' }}>
          {NAV.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '11px 14px',
                borderRadius: '10px',
                textDecoration: 'none',
                color: isActive ? '#fff' : 'rgba(255,255,255,0.5)',
                background: isActive ? 'rgba(0,113,227,0.25)' : 'transparent',
                fontWeight: isActive ? 600 : 400,
                fontSize: '15px',
                marginBottom: '4px',
                transition: 'all 0.15s',
              })}
            >
              <span style={{ fontSize: '18px' }}>{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div style={{ padding: '16px 12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '11px 14px',
              background: 'transparent',
              border: 'none',
              borderRadius: '10px',
              color: 'rgba(255,255,255,0.4)',
              fontSize: '15px',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#ff6b6b'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
          >
            <span style={{ fontSize: '18px' }}>🚪</span>
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
        <Outlet />
      </main>
    </div>
  );
}
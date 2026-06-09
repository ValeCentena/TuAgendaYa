import { Link } from 'react-router-dom';

export default function Layout({ children, showNav = true }) {
  return (
    <>
      {showNav && (
        <header className="app-header">
          <Link to="/" className="app-logo">Tu<span>Agenda</span>Ya</Link>
          <nav className="app-nav">
            <Link to="/profesional/login" className="btn btn-ghost">Iniciar sesión</Link>
            <Link to="/profesional/registro" className="btn btn-primary">Registrarse</Link>
          </nav>
        </header>
      )}
      {children}
    </>
  );
}

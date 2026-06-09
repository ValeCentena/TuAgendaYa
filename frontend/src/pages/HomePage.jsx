import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { getProfessionals } from '../api/client';

function initials(name) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

export default function HomePage() {
  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProfessionals()
      .then(setProfessionals)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <section className="hero">
        <h1>Agendá turnos sin complicaciones</h1>
        <p>Elegí un profesional, seleccioná fecha y horario. Recibí confirmación y recordatorio por WhatsApp.</p>
      </section>

      {loading ? (
        <p className="empty-state">Cargando profesionales...</p>
      ) : professionals.length === 0 ? (
        <p className="empty-state">Aún no hay profesionales registrados.</p>
      ) : (
        <div className="pro-grid">
          {professionals.map((pro) => (
            <Link key={pro.id} to={`/reservar/${pro.slug}`} className="card pro-card">
              <div className="pro-avatar">{initials(pro.name)}</div>
              <h3>{pro.name}</h3>
              <p className="specialty">{pro.specialty || 'Profesional'}</p>
              <span className="duration">{pro.duration_minutes} min</span>
            </Link>
          ))}
        </div>
      )}
    </Layout>
  );
}

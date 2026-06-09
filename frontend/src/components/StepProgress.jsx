const STEPS = ['Fecha', 'Horario', 'Datos', 'Listo'];

export default function StepProgress({ current }) {
  return (
    <div className="step-progress" aria-label="Progreso de reserva">
      {STEPS.map((label, index) => {
        const state = index < current ? 'done' : index === current ? 'active' : '';
        return (
          <div key={label} className={`step-progress-item ${state}`}>
            <span className="step-progress-dot">{index < current ? '✓' : index + 1}</span>
            <span className="step-progress-label">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function FormField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  error,
  placeholder,
  required,
  minLength,
  as = 'input',
  children,
}) {
  const className = `form-input${error ? ' form-input-error' : ''}`;
  const Input = as;

  return (
    <div className="form-group">
      <label htmlFor={id}>{label}</label>
      {as === 'select' ? (
        <select
          id={id}
          className={className}
          value={value}
          onChange={onChange}
          required={required}
        >
          {children}
        </select>
      ) : as === 'textarea' ? (
        <textarea
          id={id}
          className={className}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
        />
      ) : (
        <input
          id={id}
          className={className}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          minLength={minLength}
        />
      )}
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}

import PasswordInput from "./PasswordInput.jsx";

export default function FormField({
  label,
  name,
  type = "text",
  value,
  onChange,
  onBlur,
  error,
  hint,
  children,
  ...inputProps
}) {
  const invalid = Boolean(error);

  return (
    <label className={invalid ? "label-invalid" : undefined}>
      {label}
      {type === "password" ? (
        <PasswordInput
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          invalid={invalid}
          {...inputProps}
        />
      ) : (
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          aria-invalid={invalid || undefined}
          className={invalid ? "input-invalid" : undefined}
          {...inputProps}
        />
      )}
      {error && <span className="field-error">{error}</span>}
      {!error && hint && <span className="hint">{hint}</span>}
      {children}
    </label>
  );
}

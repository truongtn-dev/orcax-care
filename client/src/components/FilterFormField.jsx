import { forwardRef } from "react";

/**
 * Text/number input styled like admin filter fields (filter-field-label + filter-field-control).
 * Use in dashboard forms alongside CustomSelect and DatePicker.
 */
const FilterFormField = forwardRef(function FilterFormField(
  {
    id,
    label,
    required = false,
    className = "",
    inputClassName = "",
    ...inputProps
  },
  ref,
) {
  return (
    <div className={`filter-field ${className}`.trim()}>
      <label className="filter-field-label" htmlFor={id}>
        {label}
        {required && (
          <span className="field-required-mark" aria-hidden="true">
            *
          </span>
        )}
      </label>
      <input
        ref={ref}
        id={id}
        className={`filter-field-control ${inputClassName}`.trim()}
        required={required}
        {...inputProps}
      />
    </div>
  );
});

export default FilterFormField;

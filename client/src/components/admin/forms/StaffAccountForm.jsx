import AdminFormActions from "../AdminFormActions.jsx";

export default function StaffAccountForm({
  mode = "create",
  form,
  onChange,
  onSubmit,
  onCancel,
  error,
  success,
  submitting = false,
  fieldError,
}) {
  const isEdit = mode === "edit";

  return (
    <form onSubmit={onSubmit} className="form form-compact admin-record-form">
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <fieldset className="form-section">
        <legend>Staff account</legend>
        <div className="form-grid">
          <label className="form-grid-span-2">
            Full name
            <input
              name="fullName"
              value={form.fullName}
              onChange={onChange}
              placeholder="Jane Doe"
              minLength={2}
              required
              aria-invalid={Boolean(fieldError?.("fullName"))}
            />
            {fieldError?.("fullName") && <span className="field-error">{fieldError("fullName")}</span>}
          </label>
          <label>
            Email address
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={onChange}
              placeholder="staff@example.com"
              required
              aria-invalid={Boolean(fieldError?.("email"))}
            />
            {fieldError?.("email") && <span className="field-error">{fieldError("email")}</span>}
          </label>
          <label>
            Phone number
            <input
              name="phone"
              value={form.phone}
              onChange={onChange}
              placeholder="0901234567"
              aria-invalid={Boolean(fieldError?.("phone"))}
            />
            {fieldError?.("phone") && <span className="field-error">{fieldError("phone")}</span>}
          </label>
          {isEdit && (
            <label className="checkbox-row form-grid-span-2">
              <input type="checkbox" name="isActive" checked={form.isActive} onChange={onChange} />
              Account is active
            </label>
          )}
        </div>
      </fieldset>

      {!isEdit && (
        <fieldset className="form-section">
          <legend>Sign-in credentials</legend>
          <div className="form-grid">
            <label>
              Password
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={onChange}
                autoComplete="new-password"
                aria-invalid={Boolean(fieldError?.("password"))}
              />
              {fieldError?.("password") && <span className="field-error">{fieldError("password")}</span>}
            </label>
            <label>
              Re-enter password
              <input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={onChange}
                autoComplete="new-password"
                aria-invalid={Boolean(fieldError?.("confirmPassword"))}
              />
              {fieldError?.("confirmPassword") && (
                <span className="field-error">{fieldError("confirmPassword")}</span>
              )}
            </label>
          </div>
        </fieldset>
      )}

      <AdminFormActions
        onCancel={onCancel}
        submitting={submitting}
        submittingLabel={isEdit ? "Saving…" : "Creating…"}
        submitLabel={isEdit ? "Save changes" : "Create staff"}
      />
    </form>
  );
}

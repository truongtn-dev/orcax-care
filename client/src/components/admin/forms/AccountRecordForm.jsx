import AdminFormActions from "../AdminFormActions.jsx";

function formatRoleLabel(role) {
  const labels = { admin: "Administrator", doctor: "Doctor", staff: "Staff", patient: "Patient" };
  return labels[role] || role;
}

export default function AccountRecordForm({
  mode = "edit",
  form,
  accountMeta,
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

      {isEdit && accountMeta && (
        <fieldset className="form-section">
          <legend>System information</legend>
          <div className="admin-detail-list">
            <div>
              <span>Role</span>
              <strong>{formatRoleLabel(accountMeta.role)}</strong>
            </div>
            <div>
              <span>Email verified</span>
              <strong>{accountMeta.isEmailVerified ? "Yes" : "No"}</strong>
            </div>
            <div>
              <span>Linked profile</span>
              <strong>{accountMeta.doctorId || accountMeta.patientId || "None"}</strong>
            </div>
          </div>
        </fieldset>
      )}

      <fieldset className="form-section">
        <legend>{isEdit ? "Contact information" : "Account details"}</legend>
        <div className="form-grid">
          <label>
            Full name
            <input
              name="fullName"
              value={form.fullName}
              onChange={onChange}
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

      <AdminFormActions
        onCancel={onCancel}
        submitting={submitting}
        submittingLabel={isEdit ? "Saving…" : "Creating…"}
        submitLabel={isEdit ? "Save changes" : "Create account"}
      />
    </form>
  );
}

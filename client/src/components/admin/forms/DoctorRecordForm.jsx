import CustomSelect from "../../CustomSelect.jsx";
import CloudinaryAvatarUpload from "../../CloudinaryAvatarUpload.jsx";
import AdminFormActions from "../AdminFormActions.jsx";
import { DEFAULT_CONSULTATION_FEE_VND } from "../../../utils/booking.js";

export default function DoctorRecordForm({
  mode = "create",
  form,
  specialties = [],
  departments = [],
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
        <legend>Account</legend>
        <div className="form-grid">
          <label>
            Full name
            <input
              name="fullName"
              value={form.fullName}
              onChange={onChange}
              placeholder="Dr. Jane Smith"
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
              placeholder="doctor@example.com"
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
            <label className="checkbox-row">
              <input type="checkbox" name="accountIsActive" checked={form.accountIsActive} onChange={onChange} />
              Account is active
            </label>
          )}
        </div>
      </fieldset>

      <fieldset className="form-section">
        <legend>Professional profile</legend>
        {isEdit && (
          <CloudinaryAvatarUpload
            label="Doctor photo"
            name="photoUrl"
            value={form.photoUrl}
            onChange={onChange}
            fallbackName={form.fullName}
            folder="orcaxcare/avatars/doctors"
          />
        )}
        <div className="form-grid">
          <div>
            <CustomSelect
              label="Specialty"
              value={form.specialtyId}
              placeholder="Select specialty"
              onChange={(specialtyId) => onChange({ target: { name: "specialtyId", value: specialtyId } })}
              options={[
                { value: "", label: "Select specialty" },
                ...specialties.map((item) => ({ value: item._id, label: item.name })),
              ]}
              invalid={Boolean(fieldError?.("specialtyId"))}
            />
            {fieldError?.("specialtyId") && <span className="field-error">{fieldError("specialtyId")}</span>}
          </div>
          <div>
            <CustomSelect
              label="Department"
              value={form.departmentId}
              placeholder="Select department"
              onChange={(departmentId) => onChange({ target: { name: "departmentId", value: departmentId } })}
              options={[
                { value: "", label: "Select department" },
                ...departments.map((item) => ({ value: item._id, label: item.name })),
              ]}
              invalid={Boolean(fieldError?.("departmentId"))}
            />
            {fieldError?.("departmentId") && <span className="field-error">{fieldError("departmentId")}</span>}
          </div>
          <label>
            License number
            <input
              name="licenseNo"
              value={form.licenseNo}
              onChange={onChange}
              placeholder="DOC-001"
              minLength={3}
              required
              aria-invalid={Boolean(fieldError?.("licenseNo"))}
            />
            {fieldError?.("licenseNo") && <span className="field-error">{fieldError("licenseNo")}</span>}
          </label>
          <label>
            Consultation fee (VND)
            <input
              name="consultationFee"
              type="number"
              min="0"
              step="1000"
              value={form.consultationFee}
              onChange={onChange}
              placeholder={String(DEFAULT_CONSULTATION_FEE_VND)}
              required
              aria-invalid={Boolean(fieldError?.("consultationFee"))}
            />
            {fieldError?.("consultationFee") && (
              <span className="field-error">{fieldError("consultationFee")}</span>
            )}
          </label>
          {isEdit && (
            <label className="checkbox-row">
              <input type="checkbox" name="isActive" checked={form.isActive} onChange={onChange} />
              Doctor profile is active
            </label>
          )}
          <label className="form-grid-span-2">
            Bio
            <textarea
              name="bio"
              value={form.bio}
              onChange={onChange}
              rows={isEdit ? 5 : 3}
              maxLength={1000}
              placeholder="Short professional bio (optional)"
            />
          </label>
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
                placeholder="At least 8 characters"
                aria-invalid={Boolean(fieldError?.("password"))}
              />
              {fieldError?.("password") && <span className="field-error">{fieldError("password")}</span>}
            </label>
            <label>
              Confirm password
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
        submitLabel={isEdit ? "Save changes" : "Create doctor"}
      />
    </form>
  );
}

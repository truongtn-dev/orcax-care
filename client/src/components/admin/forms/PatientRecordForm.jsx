import CustomSelect from "../../CustomSelect.jsx";
import DatePicker from "../../DatePicker.jsx";
import CloudinaryAvatarUpload from "../../CloudinaryAvatarUpload.jsx";
import AdminFormActions from "../AdminFormActions.jsx";

const GENDER_OPTIONS = [
  { value: "", label: "Prefer not to say" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

export default function PatientRecordForm({
  mode = "create",
  form,
  onChange,
  onSubmit,
  onCancel,
  error,
  success,
  submitting = false,
}) {
  const isEdit = mode === "edit";

  return (
    <form onSubmit={onSubmit} className="form form-compact admin-record-form">
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <fieldset className="form-section">
        <legend>Account</legend>
        <div className="form-grid">
          <label className={isEdit ? "" : "form-grid-span-2"}>
            Full name
            <input name="fullName" value={form.fullName} onChange={onChange} minLength={2} required />
          </label>
          {!isEdit && (
            <label>
              Email address
              <input type="email" name="email" value={form.email} onChange={onChange} required />
            </label>
          )}
          {isEdit && (
            <label className="form-grid-span-2">
              Email
              <input name="email" value={form.email} readOnly disabled className="input-readonly" />
            </label>
          )}
          <label>
            Phone number
            <input
              type="tel"
              name="phone"
              value={form.phone}
              onChange={onChange}
              pattern="[0-9+\-\s()]{8,20}"
            />
          </label>
          {!isEdit && (
            <label className="form-grid-span-2">
              Temporary password
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={onChange}
                autoComplete="new-password"
                required
              />
            </label>
          )}
          {isEdit && (
            <label className="checkbox-row form-grid-span-2">
              <input type="checkbox" name="accountIsActive" checked={form.accountIsActive} onChange={onChange} />
              Account is active
            </label>
          )}
        </div>
      </fieldset>

      <fieldset className="form-section">
        <legend>Patient details</legend>
        {isEdit && (
          <CloudinaryAvatarUpload
            label="Patient photo"
            name="avatarUrl"
            value={form.avatarUrl}
            onChange={onChange}
            fallbackName={form.fullName}
            folder="orcaxcare/avatars/patients"
          />
        )}
        <div className="form-grid">
          <DatePicker
            label="Date of birth"
            name="dateOfBirth"
            value={form.dateOfBirth}
            onChange={onChange}
            max={new Date().toISOString().slice(0, 10)}
            placeholder="Select date of birth"
          />
          <CustomSelect
            label="Gender"
            value={form.gender}
            onChange={(gender) => onChange({ target: { name: "gender", value: gender } })}
            options={GENDER_OPTIONS}
          />
          <label className="form-grid-span-2">
            Address
            <input
              name="address"
              value={form.address}
              onChange={onChange}
              placeholder="City, district, street..."
            />
          </label>
          <label>
            Emergency contact name
            <input name="emergencyContactName" value={form.emergencyContactName} onChange={onChange} />
          </label>
          <label>
            Emergency contact phone
            <input
              type="tel"
              name="emergencyContactPhone"
              value={form.emergencyContactPhone}
              onChange={onChange}
              pattern="[0-9+\-\s()]{8,20}"
            />
          </label>
          {isEdit && (
            <label className="checkbox-row form-grid-span-2">
              <input type="checkbox" name="isActive" checked={form.isActive} onChange={onChange} />
              Patient profile is active
            </label>
          )}
        </div>
      </fieldset>

      <AdminFormActions
        onCancel={onCancel}
        submitting={submitting}
        submittingLabel={isEdit ? "Saving…" : "Creating…"}
        submitLabel={isEdit ? "Save changes" : "Create patient"}
      />
    </form>
  );
}

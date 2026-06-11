import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import CustomSelect from "../components/CustomSelect.jsx";
import { AdminApiClient } from "../services/adminApi.js";
import { getApiErrorMessage } from "../services/api.js";
import { firstFormError, validateAdminEditPatientForm } from "../utils/validation.js";

const GENDER_OPTIONS = [
  { value: "", label: "Prefer not to say" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

function formatDateOnly(value) {
  if (!value) return "";
  return new Date(value).toISOString().split("T")[0];
}

export default function AdminPatientEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [form, setForm] = useState({
    dateOfBirth: "",
    gender: "",
    address: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    setLoading(true);
    setError("");
    AdminApiClient.getPatient(id)
      .then(({ data }) => {
        setPatient(data);
        setForm({
          dateOfBirth: data.profile?.dateOfBirth ? formatDateOnly(data.profile.dateOfBirth) : "",
          gender: data.profile?.gender || "",
          address: data.profile?.address || "",
          emergencyContactName: data.profile?.emergencyContactName || "",
          emergencyContactPhone: data.profile?.emergencyContactPhone || "",
        });
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    setError("");
    setSuccess("");
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    const errors = validateAdminEditPatientForm(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError(firstFormError(errors));
      return;
    }
    setFieldErrors({});
    setSaving(true);

    const payload = {
      dateOfBirth: form.dateOfBirth,
      gender: form.gender,
      address: form.address,
      emergencyContactName: form.emergencyContactName,
      emergencyContactPhone: form.emergencyContactPhone,
    };

    try {
      const { data } = await AdminApiClient.updatePatient(id, payload);
      setSuccess(data.message || "Patient information updated successfully.");
      setTimeout(() => {
        navigate(`/admin/patient/${id}`);
      }, 800);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageLayout>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <Link to={`/admin/patient/${id}`} className="back-link">
              ← Back to patient details
            </Link>
            <h1>Edit patient</h1>
            <p>Update patient demographics and emergency contact information.</p>
          </div>
        </div>
      </div>

      {loading && (
        <div className="loading-state">
          <div className="loading-spinner" />
          Loading patient…
        </div>
      )}

      {error && !loading && <div className="alert alert-error">{error}</div>}

      {!loading && patient && (
        <div className="card form-card-centered profile-form-card">
          <form onSubmit={onSubmit} className="form" noValidate>
            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <fieldset className="form-section">
              <legend>Demographics</legend>
              <label>
                Date of birth
                <input
                  type="date"
                  name="dateOfBirth"
                  value={form.dateOfBirth}
                  onChange={onChange}
                  aria-invalid={Boolean(fieldErrors.dateOfBirth)}
                />
                {fieldErrors.dateOfBirth && <span className="field-error">{fieldErrors.dateOfBirth}</span>}
              </label>
              <div>
                <CustomSelect
                  label="Gender"
                  value={form.gender}
                  onChange={(gender) => onChange({ target: { name: "gender", value: gender } })}
                  options={GENDER_OPTIONS}
                  invalid={Boolean(fieldErrors.gender)}
                />
                {fieldErrors.gender && <span className="field-error">{fieldErrors.gender}</span>}
              </div>
              <label>
                Address
                <input
                  name="address"
                  value={form.address}
                  onChange={onChange}
                  placeholder="City, district, street…"
                  aria-invalid={Boolean(fieldErrors.address)}
                />
                {fieldErrors.address && <span className="field-error">{fieldErrors.address}</span>}
              </label>
            </fieldset>

            <fieldset className="form-section">
              <legend>Emergency contact</legend>
              <label>
                Emergency contact name
                <input
                  name="emergencyContactName"
                  value={form.emergencyContactName}
                  onChange={onChange}
                  placeholder="Contact name"
                  aria-invalid={Boolean(fieldErrors.emergencyContactName)}
                />
                {fieldErrors.emergencyContactName && (
                  <span className="field-error">{fieldErrors.emergencyContactName}</span>
                )}
              </label>
              <label>
                Emergency contact phone
                <input
                  name="emergencyContactPhone"
                  value={form.emergencyContactPhone}
                  onChange={onChange}
                  placeholder="Phone number"
                  aria-invalid={Boolean(fieldErrors.emergencyContactPhone)}
                />
                {fieldErrors.emergencyContactPhone && (
                  <span className="field-error">{fieldErrors.emergencyContactPhone}</span>
                )}
              </label>
            </fieldset>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </button>
              <Link to={`/admin/patient/${id}`} className="btn btn-outline">
                Cancel
              </Link>
            </div>
          </form>
        </div>
      )}
    </PageLayout>
  );
}

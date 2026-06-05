import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PageLayout from "../../components/PageLayout.jsx";
import CustomSelect from "../../components/CustomSelect.jsx";
import { AdminApiClient } from "../../services/adminApi.js";
import { getApiErrorMessage } from "../../services/api.js";

const GENDER_OPTIONS = [
  { value: "", label: "Prefer not to say" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

const emptyForm = {
  fullName: "",
  phone: "",
  email: "",
  dateOfBirth: "",
  gender: "",
  address: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  avatarUrl: "",
  isActive: true,
  accountIsActive: true,
};

export default function PatientEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadPatient() {
      setLoading(true);
      setError("");
      try {
        const { data } = await AdminApiClient.getPatient(id);
        if (ignore) return;
        setForm({
          fullName: data.fullName || "",
          phone: data.phone || "",
          email: data.email || "",
          dateOfBirth: data.profile?.dateOfBirth || "",
          gender: data.profile?.gender || "",
          address: data.profile?.address || "",
          emergencyContactName: data.profile?.emergencyContactName || "",
          emergencyContactPhone: data.profile?.emergencyContactPhone || "",
          avatarUrl: data.profile?.avatarUrl || "",
          isActive: Boolean(data.isActive),
          accountIsActive: Boolean(data.accountIsActive),
        });
      } catch (err) {
        if (!ignore) setError(getApiErrorMessage(err));
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadPatient();
    return () => {
      ignore = true;
    };
  }, [id]);

  const onChange = (e) => {
    const { name, type, checked, value } = e.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
    setError("");
    setSuccess("");
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const { data } = await AdminApiClient.updatePatient(id, form);
      setForm({
        fullName: data.fullName || "",
        phone: data.phone || "",
        email: data.email || "",
        dateOfBirth: data.profile?.dateOfBirth || "",
        gender: data.profile?.gender || "",
        address: data.profile?.address || "",
        emergencyContactName: data.profile?.emergencyContactName || "",
        emergencyContactPhone: data.profile?.emergencyContactPhone || "",
        avatarUrl: data.profile?.avatarUrl || "",
        isActive: Boolean(data.isActive),
        accountIsActive: Boolean(data.accountIsActive),
      });
      setSuccess("Patient profile updated successfully.");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageLayout>
      <nav className="admin-breadcrumb" aria-label="Navigation">
        <Link to="/admin">Admin</Link>
        <span>/</span>
        <Link to="/admin/patients">Patients</Link>
        <span>/</span>
        <span>Edit</span>
      </nav>

      <div className="page-header">
        <h1>Update Patient Profile</h1>
        <p>Edit patient profile fields as an admin. Email is shown for reference.</p>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner" />
          Loading patient...
        </div>
      ) : (
        <div className="card form-card-centered profile-form-card">
          <form onSubmit={onSubmit} className="form">
            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <fieldset className="form-section">
              <legend>Account</legend>
              <div className="form-grid">
                <label>
                  Full name
                  <input name="fullName" value={form.fullName} onChange={onChange} minLength={2} required />
                </label>
                <label>
                  Phone number
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={onChange}
                    pattern="[0-9+\-\s()]{8,20}"
                    title="Use 8-20 characters: digits, spaces, +, -, or parentheses."
                  />
                </label>
                <label className="form-grid-span-2">
                  Email
                  <input name="email" value={form.email} readOnly disabled className="input-readonly" />
                </label>
                <label className="checkbox-row">
                  <input type="checkbox" name="accountIsActive" checked={form.accountIsActive} onChange={onChange} />
                  Account is active
                </label>
              </div>
            </fieldset>

            <fieldset className="form-section">
              <legend>Patient details</legend>
              <div className="form-grid">
                <label>
                  Date of birth
                  <input type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={onChange} />
                </label>
                <CustomSelect
                  label="Gender"
                  value={form.gender}
                  onChange={(gender) => onChange({ target: { name: "gender", value: gender } })}
                  options={GENDER_OPTIONS}
                />
                <label className="form-grid-span-2">
                  Address
                  <input name="address" value={form.address} onChange={onChange} placeholder="City, district, street..." />
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
                <label className="form-grid-span-2">
                  Avatar URL
                  <input type="url" name="avatarUrl" value={form.avatarUrl} onChange={onChange} />
                </label>
                <label className="checkbox-row">
                  <input type="checkbox" name="isActive" checked={form.isActive} onChange={onChange} />
                  Patient profile is active
                </label>
              </div>
            </fieldset>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button type="button" className="btn btn-outline" onClick={() => navigate("/admin/patients")}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </PageLayout>
  );
}

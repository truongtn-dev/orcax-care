import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageLayout from "../../components/PageLayout.jsx";
import AdminLayout from "../../components/AdminLayout.jsx";
import CustomSelect from "../../components/CustomSelect.jsx";
import { AdminApiClient } from "../../services/adminApi.js";
import { getApiErrorMessage } from "../../services/api.js";

const GENDER_OPTIONS = [
  { value: "", label: "Prefer not to say" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

const EMPTY_FORM = {
  email: "",
  password: "",
  fullName: "",
  phone: "",
  dateOfBirth: "",
  gender: "",
  address: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
};

export default function CreatePatientPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((current) => ({ ...current, [name]: value }));
    setError("");
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const { data } = await AdminApiClient.createPatient(form);
      navigate(`/admin/patients/${data._id}`, {
        replace: true,
        state: { message: data.message || "Patient created successfully." },
      });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageLayout dashboard>
      <AdminLayout
        title="Create patient"
        description="Register a new patient account with demographic details."
        actions={
          <Link to="/admin/patients" className="btn btn-secondary">
            Back to list
          </Link>
        }
      >
        {error && <div className="alert alert-error">{error}</div>}

        <form className="card form-card" onSubmit={onSubmit}>
          <h3>Account</h3>
          <div className="form-grid">
            <label className="form-field">
              <span>Email *</span>
              <input name="email" type="email" value={form.email} onChange={onChange} required />
            </label>
            <label className="form-field">
              <span>Temporary password *</span>
              <input name="password" type="password" value={form.password} onChange={onChange} required />
            </label>
            <label className="form-field">
              <span>Full name *</span>
              <input name="fullName" value={form.fullName} onChange={onChange} required />
            </label>
            <label className="form-field">
              <span>Phone</span>
              <input name="phone" value={form.phone} onChange={onChange} />
            </label>
          </div>

          <h3>Demographics</h3>
          <div className="form-grid">
            <label className="form-field">
              <span>Date of birth</span>
              <input name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={onChange} />
            </label>
            <CustomSelect
              label="Gender"
              value={form.gender}
              onChange={(gender) => setForm((current) => ({ ...current, gender }))}
              options={GENDER_OPTIONS}
            />
            <label className="form-field form-field-full">
              <span>Address</span>
              <input name="address" value={form.address} onChange={onChange} />
            </label>
            <label className="form-field">
              <span>Emergency contact</span>
              <input name="emergencyContactName" value={form.emergencyContactName} onChange={onChange} />
            </label>
            <label className="form-field">
              <span>Emergency phone</span>
              <input name="emergencyContactPhone" value={form.emergencyContactPhone} onChange={onChange} />
            </label>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Creating…" : "Create patient"}
            </button>
            <Link to="/admin/patients" className="btn btn-secondary">
              Cancel
            </Link>
          </div>
        </form>
      </AdminLayout>
    </PageLayout>
  );
}

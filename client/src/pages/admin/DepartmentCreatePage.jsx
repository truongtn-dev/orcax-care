import { useState } from "react";
import { Link } from "react-router-dom";
import PageLayout from "../../components/PageLayout.jsx";
import AdminLayout from "../../components/AdminLayout.jsx";
import { AdminApiClient } from "../../services/adminApi.js";
import { getApiErrorMessage } from "../../services/api.js";

const emptyForm = {
  name: "",
  location: "",
  phone: "",
  isActive: true,
};

export default function DepartmentCreatePage() {
  const [form, setForm] = useState(emptyForm);
  const [created, setCreated] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const onChange = (e) => {
    const { name, type, checked, value } = e.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
    setError("");
    setCreated(null);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setCreated(null);
    setSaving(true);
    try {
      const { data } = await AdminApiClient.createDepartment(form);
      setCreated(data);
      setForm(emptyForm);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageLayout dashboard>
      <AdminLayout
        title="Create department"
        description="Enter name, location, phone number, and status to create department data."
      >
      <div className="card form-card-centered">
        <form onSubmit={onSubmit} className="form">
          {error && <div className="alert alert-error">{error}</div>}
          {created && (
            <div className="alert alert-success">
              Department created successfully.{" "}
              <Link to={`/admin/departments/${created._id}`}>View details</Link>
            </div>
          )}

          <fieldset className="form-section">
            <legend>Department information</legend>
            <label>
              Department name
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={onChange}
                minLength={2}
                required
              />
            </label>
            <label>
              Location
              <input
                type="text"
                name="location"
                value={form.location}
                onChange={onChange}
                minLength={3}
                required
              />
            </label>
            <label>
              Phone number
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={onChange}
                pattern="[0-9+\-\s()]{8,20}"
                title="Use 8–20 characters including digits, spaces, +, -, or parentheses."
                required
              />
            </label>
            <label className="checkbox-row">
              <input type="checkbox" name="isActive" checked={form.isActive} onChange={onChange} />
              Department is active
            </label>
          </fieldset>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving..." : "Create department"}
            </button>
            <Link to="/admin" className="btn btn-outline">
              Cancel
            </Link>
          </div>
        </form>
      </div>
      </AdminLayout>
    </PageLayout>
  );
}

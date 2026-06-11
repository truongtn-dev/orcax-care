import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PageLayout from "../../components/PageLayout.jsx";
import AdminLayout from "../../components/AdminLayout.jsx";
import { AdminApiClient } from "../../services/adminApi.js";
import { getApiErrorMessage } from "../../services/api.js";

const emptyForm = {
  email: "",
  fullName: "",
  phone: "",
  isActive: true,
};

export default function AccountEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [account, setAccount] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadAccount() {
      setLoading(true);
      setError("");
      try {
        const { data } = await AdminApiClient.getAccount(id);
        if (ignore) return;
        setAccount(data);
        setForm({
          email: data.email || "",
          fullName: data.fullName || "",
          phone: data.phone || "",
          isActive: Boolean(data.isActive),
        });
      } catch (err) {
        if (!ignore) setError(getApiErrorMessage(err));
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadAccount();
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
      const { data } = await AdminApiClient.updateAccount(id, form);
      setAccount(data);
      setForm({
        email: data.email || "",
        fullName: data.fullName || "",
        phone: data.phone || "",
        isActive: Boolean(data.isActive),
      });
      setSuccess("Account updated successfully.");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageLayout dashboard>
      <AdminLayout
        title="Edit account"
        actions={
          <Link to={`/admin/account/${id}`} className="btn btn-outline btn-sm">
            ← Back to details
          </Link>
        }
      >
      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner" />
          Loading account...
        </div>
      ) : (
        <div className="card form-card-centered profile-form-card">
          <form onSubmit={onSubmit} className="form">
            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            {account && (
              <fieldset className="form-section">
                <legend>System information</legend>
                <div className="admin-detail-list">
                  <div>
                    <span>Role</span>
                    <strong>{account.role}</strong>
                  </div>
                  <div>
                    <span>Email verified</span>
                    <strong>{account.isEmailVerified ? "Yes" : "No"}</strong>
                  </div>
                  <div>
                    <span>Linked profile</span>
                    <strong>{account.doctorId || account.patientId || "None"}</strong>
                  </div>
                </div>
              </fieldset>
            )}

            <fieldset className="form-section">
              <legend>Contact information</legend>
              <div className="form-grid">
                <label>
                  Email
                  <input type="email" name="email" value={form.email} onChange={onChange} required />
                </label>
                <label>
                  Full name
                  <input
                    type="text"
                    name="fullName"
                    value={form.fullName}
                    onChange={onChange}
                    minLength={2}
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
                  />
                </label>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={form.isActive}
                    onChange={onChange}
                  />
                  Account is active
                </label>
              </div>
            </fieldset>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Saving..." : "Save changes"}
              </button>
              <button type="button" className="btn btn-outline" onClick={() => navigate(`/admin/account/${id}`)}>
                Cancel
              </button>
              <Link to="/admin/account" className="btn btn-ghost">
                Back to account list
              </Link>
            </div>
          </form>
        </div>
      )}
      </AdminLayout>
    </PageLayout>
  );
}

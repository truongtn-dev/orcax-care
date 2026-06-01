import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import { AuthApiClient } from "../services/authApi.js";
import { getApiErrorMessage } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const onChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (form.newPassword !== form.confirmPassword) {
      setError("New passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const { data } = await AuthApiClient.changePassword(form.currentPassword, form.newPassword);
      setSuccess(data.message);
      logout();
      setTimeout(() => navigate("/login", { replace: true }), 2000);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout>
      <div className="page-header">
        <h1>Change Password</h1>
        <p>Update your account security. You will be signed out after a successful change.</p>
      </div>

      <div className="card" style={{ maxWidth: 480, margin: "0 auto" }}>
        <form onSubmit={onSubmit} className="form">
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          <label>
            Current password
            <input
              type="password"
              name="currentPassword"
              value={form.currentPassword}
              onChange={onChange}
              required
              placeholder="Enter current password"
            />
          </label>
          <label>
            New password
            <input
              type="password"
              name="newPassword"
              value={form.newPassword}
              onChange={onChange}
              required
              placeholder="Min. 8 characters"
            />
          </label>
          <label>
            Confirm new password
            <input
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={onChange}
              required
              placeholder="Re-enter new password"
            />
          </label>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? "Saving…" : "Update Password"}
          </button>
        </form>
      </div>
    </PageLayout>
  );
}

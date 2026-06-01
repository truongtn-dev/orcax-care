import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import { AuthApiClient } from "../services/authApi.js";
import { getApiErrorMessage } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { firstFormError, validateChangePasswordForm } from "../utils/validation.js";

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const onChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setFieldErrors((prev) => ({ ...prev, [e.target.name]: undefined }));
    setError("");
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const errors = validateChangePasswordForm(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError(firstFormError(errors));
      return;
    }

    setFieldErrors({});
    setLoading(true);
    try {
      const { data } = await AuthApiClient.changePassword(form.currentPassword, form.newPassword);
      setSuccess(data.message);
      await logout();
      setTimeout(() => navigate("/login", { replace: true }), 1500);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const fieldError = (name) => fieldErrors[name];

  return (
    <PageLayout>
      <div className="page-header">
        <h1>Change Password</h1>
        <p>Update your account security. You will be signed out after a successful change.</p>
      </div>

      <div className="card form-card-centered">
        <form onSubmit={onSubmit} className="form" noValidate>
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          <label>
            Current password
            <input
              type="password"
              name="currentPassword"
              value={form.currentPassword}
              onChange={onChange}
              placeholder="Enter current password"
              autoComplete="current-password"
            />
            {fieldError("currentPassword") && (
              <span className="field-error">{fieldError("currentPassword")}</span>
            )}
          </label>
          <label>
            New password
            <input
              type="password"
              name="newPassword"
              value={form.newPassword}
              onChange={onChange}
              placeholder="Min. 8 characters, letters & numbers"
              autoComplete="new-password"
            />
            {fieldError("newPassword") && <span className="field-error">{fieldError("newPassword")}</span>}
          </label>
          <label>
            Confirm new password
            <input
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={onChange}
              placeholder="Re-enter new password"
              autoComplete="new-password"
            />
            {fieldError("confirmPassword") && (
              <span className="field-error">{fieldError("confirmPassword")}</span>
            )}
          </label>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading || Boolean(success)}>
            {loading ? "Saving…" : "Update Password"}
          </button>
        </form>
      </div>
    </PageLayout>
  );
}

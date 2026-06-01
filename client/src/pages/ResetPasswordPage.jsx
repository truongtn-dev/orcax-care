import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import AuthPageLayout from "../components/AuthPageLayout.jsx";
import { AuthApiClient } from "../services/authApi.js";
import { getApiErrorMessage } from "../services/api.js";
import { firstFormError, validateResetPasswordForm } from "../utils/validation.js";

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") || "";
  const [form, setForm] = useState({ newPassword: "", confirmPassword: "" });
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

    if (!token) {
      setError("Invalid reset link");
      return;
    }

    const errors = validateResetPasswordForm(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError(firstFormError(errors));
      return;
    }

    setFieldErrors({});
    setLoading(true);
    try {
      const { data } = await AuthApiClient.resetPassword(token, form.newPassword);
      setSuccess(data.message);
      setTimeout(() => navigate("/login", { replace: true }), 2000);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const fieldError = (name) => fieldErrors[name];

  return (
    <AuthPageLayout title="Reset password" subtitle="Choose a strong new password for your account">
      <form onSubmit={onSubmit} className="form" noValidate>
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}
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
        <button type="submit" className="btn btn-primary btn-block" disabled={loading || !token || Boolean(success)}>
          {loading ? "Updating…" : "Update Password"}
        </button>
      </form>
      <p className="form-footer">
        <Link to="/login">Back to Sign In</Link>
      </p>
    </AuthPageLayout>
  );
}

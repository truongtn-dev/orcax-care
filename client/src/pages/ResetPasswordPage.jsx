import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import AuthPageLayout from "../components/AuthPageLayout.jsx";
import FormField from "../components/FormField.jsx";
import { AuthApiClient } from "../services/authApi.js";
import { getApiErrorMessage } from "../services/api.js";
import { firstFormError, getFieldError, validateResetPasswordForm } from "../utils/validation.js";

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

  const onBlur = (e) => {
    const { name, value } = e.target;
    setFieldErrors((prev) => ({
      ...prev,
      [name]: getFieldError("resetPassword", name, { ...form, [name]: value }),
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("This password reset link is invalid");
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

  return (
    <AuthPageLayout title="Reset password" subtitle="Enter a new password for your account">
      <form onSubmit={onSubmit} className="form" noValidate>
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}
        <FormField
          label="New password"
          type="password"
          name="newPassword"
          value={form.newPassword}
          onChange={onChange}
          onBlur={onBlur}
          error={fieldErrors.newPassword}
          placeholder="At least 8 characters with letters and numbers"
          autoComplete="new-password"
        />
        <FormField
          label="Confirm new password"
          type="password"
          name="confirmPassword"
          value={form.confirmPassword}
          onChange={onChange}
          onBlur={onBlur}
          error={fieldErrors.confirmPassword}
          placeholder="Re-enter your new password"
          autoComplete="new-password"
        />
        <button type="submit" className="btn btn-primary btn-block" disabled={loading || !token || Boolean(success)}>
          {loading ? "Updating…" : "Update password"}
        </button>
      </form>
      <p className="form-footer">
        <Link to="/login">Back to sign in</Link>
      </p>
    </AuthPageLayout>
  );
}

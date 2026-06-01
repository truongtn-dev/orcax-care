import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import { AuthApiClient } from "../services/authApi.js";
import { getApiErrorMessage } from "../services/api.js";

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") || "";
  const [form, setForm] = useState({ newPassword: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const onChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.newPassword !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!token) {
      setError("Invalid reset link");
      return;
    }
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
    <PageLayout narrow>
      <div className="card auth-card">
        <h1>Reset Password</h1>
        <p className="muted">Choose a new password for your account</p>
        <form onSubmit={onSubmit} className="form">
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          <label>
            New password
            <input
              type="password"
              name="newPassword"
              value={form.newPassword}
              onChange={onChange}
              required
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
            />
          </label>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading || !token}>
            {loading ? "Updating…" : "Update password"}
          </button>
        </form>
        <p className="form-footer">
          <Link to="/login">Back to Login</Link>
        </p>
      </div>
    </PageLayout>
  );
}

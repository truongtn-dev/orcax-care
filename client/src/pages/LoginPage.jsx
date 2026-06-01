import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthPageLayout from "../components/AuthPageLayout.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { AuthApiClient } from "../services/authApi.js";
import { getApiErrorMessage } from "../services/api.js";

export default function LoginPage() {
  const navigate = useNavigate();
  const { loginSuccess } = useAuth();
  const [form, setForm] = useState({ email: "", password: "", rememberMe: false });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState("");
  const [showResend, setShowResend] = useState(false);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const redirectByRole = (role) => {
    if (role === "admin") navigate("/admin", { replace: true });
    else if (role === "doctor") navigate("/doctor", { replace: true });
    else navigate("/patient", { replace: true });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setShowResend(false);
    setLoading(true);
    try {
      const { data } = await AuthApiClient.login(form.email, form.password);
      loginSuccess(data, form.rememberMe);
      redirectByRole(data.role);
    } catch (err) {
      const msg = getApiErrorMessage(err);
      setError(msg);
      if (msg.toLowerCase().includes("verify")) setShowResend(true);
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    setResendMsg("");
    try {
      const { data } = await AuthApiClient.resendVerification(form.email);
      setResendMsg(data.message);
    } catch (err) {
      setResendMsg(getApiErrorMessage(err));
    }
  };

  return (
    <AuthPageLayout title="Welcome back" subtitle="Sign in to your OrcaXCare account">
      <form onSubmit={onSubmit} className="form">
        {error && <div className="alert alert-error">{error}</div>}
        <label>
          Email address
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={onChange}
            required
            autoComplete="email"
            placeholder="you@example.com"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={onChange}
            required
            autoComplete="current-password"
            placeholder="Enter your password"
          />
        </label>
        <label className="checkbox-row">
          <input type="checkbox" name="rememberMe" checked={form.rememberMe} onChange={onChange} />
          Remember me for 30 days
        </label>
        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </form>
      {showResend && (
        <div className="resend-box">
          <button type="button" className="btn btn-outline btn-sm btn-block" onClick={onResend}>
            Resend verification email
          </button>
          {resendMsg && <p className="hint">{resendMsg}</p>}
        </div>
      )}
      <p className="form-footer">
        <Link to="/forgot-password">Forgot password?</Link>
        {" · "}
        <Link to="/register">Create account</Link>
      </p>
    </AuthPageLayout>
  );
}

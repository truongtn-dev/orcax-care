import { useState } from "react";
import { Link } from "react-router-dom";
import AuthPageLayout from "../components/AuthPageLayout.jsx";
import { AuthApiClient } from "../services/authApi.js";
import { getApiErrorMessage } from "../services/api.js";
import { validateEmail } from "../utils/validation.js";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    setLoading(true);
    try {
      const { data } = await AuthApiClient.forgotPassword(email.trim());
      setMessage(data.message);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageLayout
      title="Forgot password?"
      subtitle="Enter your registered email. We'll send a reset link if the account exists."
    >
      <form onSubmit={onSubmit} className="form" noValidate>
        {error && <div className="alert alert-error">{error}</div>}
        {message && <div className="alert alert-success">{message}</div>}
        <label>
          Email address
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </label>
        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading ? "Sending…" : "Send Reset Link"}
        </button>
      </form>
      <p className="form-footer">
        <Link to="/login">Back to Sign In</Link>
      </p>
    </AuthPageLayout>
  );
}

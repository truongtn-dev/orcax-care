import { useState } from "react";
import { Link } from "react-router-dom";
import AuthPageLayout from "../components/AuthPageLayout.jsx";
import FormField from "../components/FormField.jsx";
import { AuthApiClient } from "../services/authApi.js";
import { getApiErrorMessage } from "../services/api.js";
import { getFieldError, validateEmail } from "../utils/validation.js";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    const emailErr = validateEmail(email);
    if (emailErr) {
      setFieldError(emailErr);
      setError(emailErr);
      return;
    }

    setFieldError("");
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
      subtitle="Enter the email on your account. If it exists, we will send you a link to reset your password."
    >
      <form onSubmit={onSubmit} className="form" noValidate>
        {error && <div className="alert alert-error">{error}</div>}
        {message && <div className="alert alert-success">{message}</div>}
        <FormField
          label="Email address"
          type="email"
          name="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setFieldError("");
            setError("");
          }}
          onBlur={(e) => setFieldError(getFieldError("forgotPassword", "email", { email: e.target.value }))}
          error={fieldError}
          placeholder="you@example.com"
          autoComplete="email"
        />
        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading ? "Sending…" : "Send reset link"}
        </button>
      </form>
      <p className="form-footer">
        <Link to="/login">Back to sign in</Link>
      </p>
    </AuthPageLayout>
  );
}

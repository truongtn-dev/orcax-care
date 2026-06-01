import { useState } from "react";
import { Link } from "react-router-dom";
import AuthPageLayout from "../components/AuthPageLayout.jsx";
import { AuthApiClient } from "../services/authApi.js";
import { getApiErrorMessage } from "../services/api.js";
import { firstFormError, validateRegisterForm } from "../utils/validation.js";

export default function RegisterPage() {
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    phone: "",
    terms: false,
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    setError("");
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const errors = validateRegisterForm(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError(firstFormError(errors));
      return;
    }

    setFieldErrors({});
    setLoading(true);
    try {
      const { data } = await AuthApiClient.register({
        email: form.email.trim(),
        password: form.password,
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
      });
      setSuccess(data.message);
    } catch (err) {
      const msg = getApiErrorMessage(err);
      setError(msg);
      if (err?.response?.status === 409) {
        setFieldErrors({ email: "Email already registered" });
      }
    } finally {
      setLoading(false);
    }
  };

  const fieldError = (name) => fieldErrors[name];

  return (
    <AuthPageLayout title="Create account" subtitle="Register as a patient on OrcaXCare">
      <form onSubmit={onSubmit} className="form" noValidate>
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <label>
          Full name
          <input
            name="fullName"
            value={form.fullName}
            onChange={onChange}
            placeholder="Nguyen Van A"
            aria-invalid={Boolean(fieldError("fullName"))}
          />
          {fieldError("fullName") && <span className="field-error">{fieldError("fullName")}</span>}
        </label>

        <label>
          Email address
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={onChange}
            placeholder="you@example.com"
            aria-invalid={Boolean(fieldError("email"))}
          />
          {fieldError("email") && <span className="field-error">{fieldError("email")}</span>}
        </label>

        <label>
          Phone number
          <input
            name="phone"
            value={form.phone}
            onChange={onChange}
            placeholder="0901234567"
            aria-invalid={Boolean(fieldError("phone"))}
          />
          {fieldError("phone") && <span className="field-error">{fieldError("phone")}</span>}
        </label>

        <label>
          Password
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={onChange}
            placeholder="Min. 8 characters, letters & numbers"
            aria-invalid={Boolean(fieldError("password"))}
          />
          {fieldError("password") && <span className="field-error">{fieldError("password")}</span>}
        </label>

        <label>
          Confirm password
          <input
            type="password"
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={onChange}
            placeholder="Re-enter password"
            aria-invalid={Boolean(fieldError("confirmPassword"))}
          />
          {fieldError("confirmPassword") && (
            <span className="field-error">{fieldError("confirmPassword")}</span>
          )}
        </label>

        <label className="checkbox-row">
          <input type="checkbox" name="terms" checked={form.terms} onChange={onChange} />
          I accept the terms and conditions
        </label>
        {fieldError("terms") && <span className="field-error">{fieldError("terms")}</span>}

        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading ? "Creating account…" : "Create Account"}
        </button>
      </form>
      <p className="form-footer">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </AuthPageLayout>
  );
}

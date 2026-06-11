import { useState } from "react";
import { Link } from "react-router-dom";
import AuthPageLayout from "../components/AuthPageLayout.jsx";
import FormField from "../components/FormField.jsx";
import { AuthApiClient } from "../services/authApi.js";
import { getApiErrorMessage } from "../services/api.js";
import { firstFormError, getFieldError, validateRegisterForm } from "../utils/validation.js";

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

  const onBlur = (e) => {
    const { name, value } = e.target;
    setFieldErrors((prev) => ({
      ...prev,
      [name]: getFieldError("register", name, { ...form, [name]: value }),
    }));
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
        setFieldErrors({ email: "This email is already registered" });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageLayout title="Create an account" subtitle="Register as a patient on OrcaXCare">
      <form onSubmit={onSubmit} className="form" noValidate>
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <FormField
          label="Full name"
          name="fullName"
          value={form.fullName}
          onChange={onChange}
          onBlur={onBlur}
          error={fieldErrors.fullName}
          placeholder="John Smith"
          autoComplete="name"
        />

        <FormField
          label="Email address"
          type="email"
          name="email"
          value={form.email}
          onChange={onChange}
          onBlur={onBlur}
          error={fieldErrors.email}
          placeholder="you@example.com"
          autoComplete="email"
        />

        <FormField
          label="Phone number"
          name="phone"
          type="tel"
          value={form.phone}
          onChange={onChange}
          onBlur={onBlur}
          error={fieldErrors.phone}
          placeholder="0901234567"
          autoComplete="tel"
        />

        <FormField
          label="Password"
          type="password"
          name="password"
          value={form.password}
          onChange={onChange}
          onBlur={onBlur}
          error={fieldErrors.password}
          placeholder="At least 8 characters with letters and numbers"
          autoComplete="new-password"
        />

        <FormField
          label="Confirm password"
          type="password"
          name="confirmPassword"
          value={form.confirmPassword}
          onChange={onChange}
          onBlur={onBlur}
          error={fieldErrors.confirmPassword}
          placeholder="Re-enter your password"
          autoComplete="new-password"
        />

        <label className="checkbox-row">
          <input type="checkbox" name="terms" checked={form.terms} onChange={onChange} />
          I agree to the terms and conditions
        </label>
        {fieldErrors.terms && <span className="field-error">{fieldErrors.terms}</span>}

        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>
      <p className="form-footer">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </AuthPageLayout>
  );
}

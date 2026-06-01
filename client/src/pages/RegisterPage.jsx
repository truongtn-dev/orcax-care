import { useState } from "react";
import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import { AuthApiClient } from "../services/authApi.js";
import { getApiErrorMessage } from "../services/api.js";

export default function RegisterPage() {
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    phone: "",
    terms: false,
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!form.terms) {
      setError("You must accept the terms and conditions");
      return;
    }
    setLoading(true);
    try {
      const { data } = await AuthApiClient.register({
        email: form.email,
        password: form.password,
        fullName: form.fullName,
        phone: form.phone,
      });
      setSuccess(data.message);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout narrow>
      <div className="card auth-card">
        <h1>Register (Patient)</h1>
        <p className="muted">Create your patient account</p>
        <form onSubmit={onSubmit} className="form">
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          <label>
            Full name
            <input name="fullName" value={form.fullName} onChange={onChange} required />
          </label>
          <label>
            Email
            <input type="email" name="email" value={form.email} onChange={onChange} required />
          </label>
          <label>
            Phone
            <input name="phone" value={form.phone} onChange={onChange} />
          </label>
          <label>
            Password
            <input type="password" name="password" value={form.password} onChange={onChange} required />
          </label>
          <label>
            Confirm password
            <input
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={onChange}
              required
            />
          </label>
          <label className="checkbox-row">
            <input type="checkbox" name="terms" checked={form.terms} onChange={onChange} />
            I accept the terms and conditions
          </label>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? "Registering…" : "Register"}
          </button>
        </form>
        <p className="form-footer">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </PageLayout>
  );
}

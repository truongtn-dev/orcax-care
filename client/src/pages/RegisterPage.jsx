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
        setFieldErrors({ email: "Email đã được đăng ký" });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageLayout title="Đăng ký tài khoản" subtitle="Tạo tài khoản bệnh nhân trên OrcaXCare">
      <form onSubmit={onSubmit} className="form" noValidate>
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <FormField
          label="Họ và tên"
          name="fullName"
          value={form.fullName}
          onChange={onChange}
          onBlur={onBlur}
          error={fieldErrors.fullName}
          placeholder="Nguyễn Văn A"
          autoComplete="name"
        />

        <FormField
          label="Địa chỉ email"
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
          label="Số điện thoại"
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
          label="Mật khẩu"
          type="password"
          name="password"
          value={form.password}
          onChange={onChange}
          onBlur={onBlur}
          error={fieldErrors.password}
          placeholder="Tối thiểu 8 ký tự, có chữ và số"
          autoComplete="new-password"
        />

        <FormField
          label="Xác nhận mật khẩu"
          type="password"
          name="confirmPassword"
          value={form.confirmPassword}
          onChange={onChange}
          onBlur={onBlur}
          error={fieldErrors.confirmPassword}
          placeholder="Nhập lại mật khẩu"
          autoComplete="new-password"
        />

        <label className="checkbox-row">
          <input type="checkbox" name="terms" checked={form.terms} onChange={onChange} />
          Tôi đồng ý với điều khoản và điều kiện
        </label>
        {fieldErrors.terms && <span className="field-error">{fieldErrors.terms}</span>}

        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading ? "Đang đăng ký…" : "Đăng ký"}
        </button>
      </form>
      <p className="form-footer">
        Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
      </p>
    </AuthPageLayout>
  );
}

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
      setError("Liên kết đặt lại mật khẩu không hợp lệ");
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
    <AuthPageLayout title="Đặt lại mật khẩu" subtitle="Nhập mật khẩu mới cho tài khoản của bạn">
      <form onSubmit={onSubmit} className="form" noValidate>
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}
        <FormField
          label="Mật khẩu mới"
          type="password"
          name="newPassword"
          value={form.newPassword}
          onChange={onChange}
          onBlur={onBlur}
          error={fieldErrors.newPassword}
          placeholder="Tối thiểu 8 ký tự, có chữ và số"
          autoComplete="new-password"
        />
        <FormField
          label="Xác nhận mật khẩu mới"
          type="password"
          name="confirmPassword"
          value={form.confirmPassword}
          onChange={onChange}
          onBlur={onBlur}
          error={fieldErrors.confirmPassword}
          placeholder="Nhập lại mật khẩu mới"
          autoComplete="new-password"
        />
        <button type="submit" className="btn btn-primary btn-block" disabled={loading || !token || Boolean(success)}>
          {loading ? "Đang cập nhật…" : "Cập nhật mật khẩu"}
        </button>
      </form>
      <p className="form-footer">
        <Link to="/login">Quay lại đăng nhập</Link>
      </p>
    </AuthPageLayout>
  );
}

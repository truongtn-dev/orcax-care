import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import FormField from "../components/FormField.jsx";
import { AuthApiClient } from "../services/authApi.js";
import { getApiErrorMessage } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { firstFormError, getFieldError, validateChangePasswordForm } from "../utils/validation.js";

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
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
      [name]: getFieldError("changePassword", name, { ...form, [name]: value }),
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const errors = validateChangePasswordForm(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError(firstFormError(errors));
      return;
    }

    setFieldErrors({});
    setLoading(true);
    try {
      const { data } = await AuthApiClient.changePassword(form.currentPassword, form.newPassword);
      setSuccess(data.message);
      await logout();
      setTimeout(() => navigate("/login", { replace: true }), 1500);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout>
      <div className="page-header">
        <h1>Đổi mật khẩu</h1>
        <p>Thay đổi mật khẩu để bảo vệ tài khoản. Sau khi đổi thành công, bạn sẽ cần đăng nhập lại.</p>
      </div>

      <div className="card form-card-centered">
        <form onSubmit={onSubmit} className="form" noValidate>
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          <FormField
            label="Mật khẩu hiện tại"
            type="password"
            name="currentPassword"
            value={form.currentPassword}
            onChange={onChange}
            onBlur={onBlur}
            error={fieldErrors.currentPassword}
            placeholder="Nhập mật khẩu hiện tại"
            autoComplete="current-password"
          />
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
          <button type="submit" className="btn btn-primary btn-block" disabled={loading || Boolean(success)}>
            {loading ? "Đang lưu…" : "Cập nhật mật khẩu"}
          </button>
        </form>
      </div>
    </PageLayout>
  );
}

import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PageLayout from "../../components/PageLayout.jsx";
import { AdminApiClient } from "../../services/adminApi.js";
import { getApiErrorMessage } from "../../services/api.js";

const emptyForm = {
  email: "",
  fullName: "",
  phone: "",
  isActive: true,
};

export default function AccountEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [account, setAccount] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadAccount() {
      setLoading(true);
      setError("");
      try {
        const { data } = await AdminApiClient.getAccount(id);
        if (ignore) return;
        setAccount(data);
        setForm({
          email: data.email || "",
          fullName: data.fullName || "",
          phone: data.phone || "",
          isActive: Boolean(data.isActive),
        });
      } catch (err) {
        if (!ignore) setError(getApiErrorMessage(err));
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadAccount();
    return () => {
      ignore = true;
    };
  }, [id]);

  const onChange = (e) => {
    const { name, type, checked, value } = e.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
    setError("");
    setSuccess("");
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const { data } = await AdminApiClient.updateAccount(id, form);
      setAccount(data);
      setForm({
        email: data.email || "",
        fullName: data.fullName || "",
        phone: data.phone || "",
        isActive: Boolean(data.isActive),
      });
      setSuccess("Cập nhật tài khoản thành công.");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageLayout>
      <div className="page-header">
        <h1>Cập nhật tài khoản</h1>
        <p>Tải người dùng hiện có, chỉnh sửa thông tin liên hệ và lưu trạng thái tài khoản.</p>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner" />
          Đang tải tài khoản...
        </div>
      ) : (
        <div className="card form-card-centered profile-form-card">
          <form onSubmit={onSubmit} className="form">
            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            {account && (
              <fieldset className="form-section">
                <legend>Thông tin hệ thống</legend>
                <div className="admin-detail-list">
                  <div>
                    <span>Vai trò</span>
                    <strong>{account.role}</strong>
                  </div>
                  <div>
                    <span>Email đã xác thực</span>
                    <strong>{account.isEmailVerified ? "Có" : "Không"}</strong>
                  </div>
                  <div>
                    <span>Hồ sơ liên kết</span>
                    <strong>{account.doctorId || account.patientId || "Chưa có"}</strong>
                  </div>
                </div>
              </fieldset>
            )}

            <fieldset className="form-section">
              <legend>Thông tin liên hệ</legend>
              <div className="form-grid">
                <label>
                  Email
                  <input type="email" name="email" value={form.email} onChange={onChange} required />
                </label>
                <label>
                  Họ và tên
                  <input
                    type="text"
                    name="fullName"
                    value={form.fullName}
                    onChange={onChange}
                    minLength={2}
                    required
                  />
                </label>
                <label>
                  Số điện thoại
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={onChange}
                    pattern="[0-9+\-\s()]{8,20}"
                    title="Dùng 8-20 ký tự gồm số, khoảng trắng, +, -, hoặc ngoặc đơn."
                  />
                </label>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={form.isActive}
                    onChange={onChange}
                  />
                  Tài khoản đang hoạt động
                </label>
              </div>
            </fieldset>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
              <button type="button" className="btn btn-outline" onClick={() => navigate("/admin")}>
                Hủy
              </button>
              <Link to="/admin" className="btn btn-ghost">
                Về bảng quản trị
              </Link>
            </div>
          </form>
        </div>
      )}
    </PageLayout>
  );
}

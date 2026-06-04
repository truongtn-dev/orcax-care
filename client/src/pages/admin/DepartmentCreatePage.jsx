import { useState } from "react";
import { Link } from "react-router-dom";
import PageLayout from "../../components/PageLayout.jsx";
import { AdminApiClient } from "../../services/adminApi.js";
import { getApiErrorMessage } from "../../services/api.js";

const emptyForm = {
  name: "",
  location: "",
  phone: "",
  isActive: true,
};

export default function DepartmentCreatePage() {
  const [form, setForm] = useState(emptyForm);
  const [created, setCreated] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const onChange = (e) => {
    const { name, type, checked, value } = e.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
    setError("");
    setCreated(null);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setCreated(null);
    setSaving(true);
    try {
      const { data } = await AdminApiClient.createDepartment(form);
      setCreated(data);
      setForm(emptyForm);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageLayout>
      <div className="page-header">
        <h1>Tạo khoa/phòng ban</h1>
        <p>Nhập tên, vị trí, số điện thoại và trạng thái để tạo dữ liệu khoa/phòng ban.</p>
      </div>

      <div className="card form-card-centered">
        <form onSubmit={onSubmit} className="form">
          {error && <div className="alert alert-error">{error}</div>}
          {created && (
            <div className="alert alert-success">
              Tạo khoa/phòng ban thành công.{" "}
              <Link to={`/admin/departments/${created._id}`}>Xem chi tiết</Link>
            </div>
          )}

          <fieldset className="form-section">
            <legend>Thông tin khoa/phòng ban</legend>
            <label>
              Tên khoa/phòng ban
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={onChange}
                minLength={2}
                required
              />
            </label>
            <label>
              Vị trí
              <input
                type="text"
                name="location"
                value={form.location}
                onChange={onChange}
                minLength={3}
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
                required
              />
            </label>
            <label className="checkbox-row">
              <input type="checkbox" name="isActive" checked={form.isActive} onChange={onChange} />
              Khoa/phòng ban đang hoạt động
            </label>
          </fieldset>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Đang lưu..." : "Tạo khoa/phòng ban"}
            </button>
            <Link to="/admin" className="btn btn-outline">
              Hủy
            </Link>
          </div>
        </form>
      </div>
    </PageLayout>
  );
}

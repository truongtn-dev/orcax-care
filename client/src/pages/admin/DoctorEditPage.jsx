import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PageLayout from "../../components/PageLayout.jsx";
import { AdminApiClient } from "../../services/adminApi.js";
import { getApiErrorMessage } from "../../services/api.js";

const emptyForm = {
  email: "",
  fullName: "",
  phone: "",
  specialtyId: "",
  departmentId: "",
  licenseNo: "",
  bio: "",
  photoUrl: "",
  isActive: true,
  accountIsActive: true,
};

export default function DoctorEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [specialties, setSpecialties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadDoctor() {
      setLoading(true);
      setError("");
      try {
        const [doctorRes, specialtyRes, departmentRes] = await Promise.all([
          AdminApiClient.getDoctor(id),
          AdminApiClient.getSpecialties({ activeOnly: false }),
          AdminApiClient.getDepartments({ activeOnly: false }),
        ]);
        if (ignore) return;
        const doctor = doctorRes.data;
        setForm({
          email: doctor.email || "",
          fullName: doctor.fullName || "",
          phone: doctor.phone || "",
          specialtyId: doctor.specialtyId || "",
          departmentId: doctor.departmentId || "",
          licenseNo: doctor.licenseNo || "",
          bio: doctor.bio || "",
          photoUrl: doctor.photoUrl || "",
          isActive: Boolean(doctor.isActive),
          accountIsActive: Boolean(doctor.accountIsActive),
        });
        setSpecialties(specialtyRes.data.items || []);
        setDepartments(departmentRes.data.items || []);
      } catch (err) {
        if (!ignore) setError(getApiErrorMessage(err));
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadDoctor();
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
      const { data } = await AdminApiClient.updateDoctor(id, form);
      setForm({
        email: data.email || "",
        fullName: data.fullName || "",
        phone: data.phone || "",
        specialtyId: data.specialtyId || "",
        departmentId: data.departmentId || "",
        licenseNo: data.licenseNo || "",
        bio: data.bio || "",
        photoUrl: data.photoUrl || "",
        isActive: Boolean(data.isActive),
        accountIsActive: Boolean(data.accountIsActive),
      });
      setSuccess("Cập nhật bác sĩ thành công. Tìm kiếm phía bệnh nhân sẽ dùng dữ liệu mới.");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageLayout>
      <nav className="admin-breadcrumb" aria-label="Điều hướng">
        <Link to="/admin">Quản trị</Link>
        <span>/</span>
        <Link to="/admin/doctors">Bác sĩ</Link>
        <span>/</span>
        <span>Cập nhật</span>
      </nav>

      <div className="page-header">
        <h1>Cập nhật bác sĩ</h1>
        <p>Sửa thông tin nghề nghiệp, tài khoản liên kết và trạng thái hiển thị cho bệnh nhân.</p>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner" />
          Đang tải bác sĩ...
        </div>
      ) : (
        <div className="card form-card-centered profile-form-card">
          <form onSubmit={onSubmit} className="form">
            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <fieldset className="form-section">
              <legend>Tài khoản liên kết</legend>
              <div className="form-grid">
                <label>
                  Email
                  <input type="email" name="email" value={form.email} onChange={onChange} required />
                </label>
                <label>
                  Họ và tên
                  <input type="text" name="fullName" value={form.fullName} onChange={onChange} minLength={2} required />
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
                  <input type="checkbox" name="accountIsActive" checked={form.accountIsActive} onChange={onChange} />
                  Tài khoản đang hoạt động
                </label>
              </div>
            </fieldset>

            <fieldset className="form-section">
              <legend>Thông tin nghề nghiệp</legend>
              <div className="form-grid">
                <label>
                  Chuyên khoa
                  <select name="specialtyId" value={form.specialtyId} onChange={onChange} required>
                    <option value="">Chọn chuyên khoa</option>
                    {specialties.map((specialty) => (
                      <option key={specialty._id} value={specialty._id}>
                        {specialty.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Khoa/phòng ban
                  <select name="departmentId" value={form.departmentId} onChange={onChange} required>
                    <option value="">Chọn khoa/phòng ban</option>
                    {departments.map((department) => (
                      <option key={department._id} value={department._id}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Số giấy phép
                  <input type="text" name="licenseNo" value={form.licenseNo} onChange={onChange} minLength={3} required />
                </label>
                <label>
                  Ảnh đại diện URL
                  <input type="url" name="photoUrl" value={form.photoUrl} onChange={onChange} />
                </label>
                <label className="checkbox-row">
                  <input type="checkbox" name="isActive" checked={form.isActive} onChange={onChange} />
                  Bác sĩ đang hoạt động
                </label>
              </div>
              <label>
                Tiểu sử
                <textarea name="bio" value={form.bio} onChange={onChange} rows="5" maxLength="1000" />
              </label>
            </fieldset>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
              <button type="button" className="btn btn-outline" onClick={() => navigate("/admin/doctors")}>
                Hủy
              </button>
              <Link to="/search-doctors" className="btn btn-ghost">
                Xem phía bệnh nhân
              </Link>
            </div>
          </form>
        </div>
      )}
    </PageLayout>
  );
}

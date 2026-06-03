import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageLayout from "../../components/PageLayout.jsx";
import { AdminApiClient } from "../../services/adminApi.js";
import { getApiErrorMessage } from "../../services/api.js";

export default function DoctorsListPage() {
  const [filters, setFilters] = useState({
    q: "",
    specialtyId: "",
    departmentId: "",
    activeOnly: false,
  });
  const [specialties, setSpecialties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [result, setResult] = useState({
    items: [],
    total: 0,
    page: 1,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadMasters = useCallback(async () => {
    const [specialtyRes, departmentRes] = await Promise.all([
      AdminApiClient.getSpecialties({ activeOnly: false }),
      AdminApiClient.getDepartments({ activeOnly: false }),
    ]);
    setSpecialties(specialtyRes.data.items || []);
    setDepartments(departmentRes.data.items || []);
  }, []);

  const loadDoctors = useCallback(async (params) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await AdminApiClient.getDoctors(params);
      setResult(data);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setResult({ items: [], total: 0, page: 1, totalPages: 1 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initializeData = async () => {
      await loadMasters();
      await loadDoctors(filters);
    };
    initializeData();
  }, [filters, loadDoctors, loadMasters]);

  const onChange = (e) => {
    const { name, type, checked, value } = e.target;
    setFilters((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
      page: 1,
    }));
  };

  const clearFilters = () => {
    setFilters({
      q: "",
      specialtyId: "",
      departmentId: "",
      activeOnly: false,
      page: 1,
    });
  };

  return (
    <PageLayout>
      <div className="page-header">
        <h1>Danh sách bác sĩ</h1>
        <p>
          Quản lý hồ sơ bác sĩ, chuyên khoa, khoa/phòng ban và trạng thái hiển
          thị cho bệnh nhân.
        </p>
      </div>

      <div className="card admin-toolbar">
        <Link to="/admin" className="btn btn-outline">
          Về quản trị
        </Link>
        <Link to="/search-doctors" className="btn btn-ghost">
          Xem phía bệnh nhân
        </Link>
      </div>

      <div className="card filters-card">
        <div className="filters-row">
          <input
            type="search"
            name="q"
            value={filters.q}
            onChange={onChange}
            placeholder="Tìm tên, email, giấy phép..."
          />
          <select
            name="specialtyId"
            value={filters.specialtyId}
            onChange={onChange}
          >
            <option value="">Tất cả chuyên khoa</option>
            {specialties.map((specialty) => (
              <option key={specialty._id} value={specialty._id}>
                {specialty.name}
              </option>
            ))}
          </select>
          <select
            name="departmentId"
            value={filters.departmentId}
            onChange={onChange}
          >
            <option value="">Tất cả khoa/phòng ban</option>
            {departments.map((department) => (
              <option key={department._id} value={department._id}>
                {department.name}
              </option>
            ))}
          </select>
        </div>
        <div className="filters-row">
          <label className="checkbox-row">
            <input
              type="checkbox"
              name="activeOnly"
              checked={filters.activeOnly}
              onChange={onChange}
            />
            Chỉ hiện bác sĩ đang hoạt động
          </label>
          <button
            type="button"
            className="btn btn-outline"
            onClick={clearFilters}
          >
            Xóa lọc
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {loading && (
        <div className="loading-state">
          <div className="loading-spinner" />
          Đang tải bác sĩ...
        </div>
      )}

      {!loading && (
        <div className="card admin-table-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Bác sĩ</th>
                <th>Chuyên khoa</th>
                <th>Khoa/phòng ban</th>
                <th>Giấy phép</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((doctor) => (
                <tr key={doctor._id}>
                  <td>
                    <strong>{doctor.fullName}</strong>
                    <p className="muted">{doctor.email}</p>
                  </td>
                  <td>{doctor.specialtyName || "-"}</td>
                  <td>{doctor.departmentName || "-"}</td>
                  <td>{doctor.licenseNo}</td>
                  <td>
                    <span
                      className={`status-pill ${doctor.isActive && doctor.accountIsActive ? "status-active" : ""}`}
                    >
                      {doctor.isActive && doctor.accountIsActive
                        ? "Đang hoạt động"
                        : "Ngừng hoạt động"}
                    </span>
                  </td>
                  <td>
                    <Link
                      className="btn btn-sm btn-outline"
                      to={`/admin/doctors/${doctor._id}/edit`}
                    >
                      Sửa
                    </Link>
                  </td>
                </tr>
              ))}
              {result.items.length === 0 && (
                <tr>
                  <td colSpan="6" className="empty-cell">
                    Không tìm thấy bác sĩ.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </PageLayout>
  );
}

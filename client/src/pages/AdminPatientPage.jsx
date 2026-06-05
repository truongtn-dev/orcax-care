import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import AdminLayout from "../components/AdminLayout.jsx";
import CustomSelect from "../components/CustomSelect.jsx";
import FilterSearchField from "../components/FilterSearchField.jsx";
import AppPagination from "../components/AppPagination.jsx";
import { AdminApiClient } from "../services/adminApi.js";
import { getApiErrorMessage } from "../services/api.js";

const STATUS_OPTIONS = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "true", label: "Đang hoạt động" },
  { value: "false", label: "Ngừng hoạt động" },
];

const GENDER_LABELS = {
  male: "Nam",
  female: "Nữ",
  other: "Khác",
};

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function formatDateOnly(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

function StatusBadge({ active, label }) {
  return (
    <span className={`status-badge ${active ? "status-badge-active" : "status-badge-inactive"}`}>
      {label}
    </span>
  );
}

export default function AdminPatientPage() {
  const [filters, setFilters] = useState({ q: "", isActive: "", page: 1, limit: 20 });
  const [result, setResult] = useState({ items: [], total: 0, totalPages: 1, page: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadPatients = useCallback(async (params) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await AdminApiClient.listPatients(params);
      setResult(data);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setResult({ items: [], total: 0, totalPages: 1, page: 1 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPatients(filters);
  }, [filters, loadPatients]);

  const applyFilters = (patch) => {
    setFilters((current) => ({ ...current, ...patch, page: patch.page ?? 1 }));
  };

  const clearFilters = () => {
    setFilters({ q: "", isActive: "", page: 1, limit: 20 });
  };

  return (
    <PageLayout dashboard>
      <AdminLayout
        title="Quản lý bệnh nhân"
        description="Tra cứu hồ sơ bệnh nhân, thông tin nhân khẩu học và tài khoản liên kết."
      >
      <div className="card filters-card">
        <div className="filters-toolbar">
          <div className="filters-toolbar-fields">
            <FilterSearchField
              id="admin-patient-search"
              placeholder="Tìm theo tên, email hoặc số điện thoại…"
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              onSearch={() => applyFilters({ q: filters.q })}
            />
            <CustomSelect
              className="filter-field"
              label="Trạng thái"
              value={filters.isActive}
              onChange={(isActive) => applyFilters({ isActive })}
              options={STATUS_OPTIONS}
            />
          </div>
          <div className="filters-toolbar-actions">
            <button type="button" className="btn btn-primary" onClick={() => applyFilters({ q: filters.q })}>
              Tìm kiếm
            </button>
            <button type="button" className="btn btn-outline" onClick={clearFilters}>
              Xóa lọc
            </button>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading && (
        <div className="loading-state">
          <div className="loading-spinner" />
          Đang tải bệnh nhân…
        </div>
      )}

      {!loading && result.items.length === 0 && (
        <div className="empty-state card">
          <h3>Không tìm thấy bệnh nhân</h3>
          <p>Hãy thử điều chỉnh tiêu chí tìm kiếm hoặc xóa bộ lọc.</p>
          <button type="button" className="btn btn-outline" onClick={clearFilters}>
            Xóa lọc
          </button>
        </div>
      )}

      {!loading && result.items.length > 0 && (
        <div className="card data-table-card">
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Bệnh nhân</th>
                  <th>Giới tính</th>
                  <th>Ngày sinh</th>
                  <th>Số điện thoại</th>
                  <th>Ngày đăng ký</th>
                  <th>Tài khoản liên kết</th>
                  <th>Trạng thái</th>
                  <th className="table-actions-col">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((patient) => (
                  <tr key={patient._id}>
                    <td>
                      <Link to={`/admin/patient/${patient._id}`} className="table-link">
                        {patient.fullName}
                      </Link>
                      <div className="table-subtext">{patient.email}</div>
                    </td>
                    <td>{GENDER_LABELS[patient.demographics?.gender] || patient.demographics?.gender || "—"}</td>
                    <td>{formatDateOnly(patient.demographics?.dateOfBirth)}</td>
                    <td>{patient.phone || "—"}</td>
                    <td>{formatDate(patient.createdAt)}</td>
                    <td>
                      <Link to={`/admin/account/${patient._id}`} className="table-link">
                        Mở tài khoản
                      </Link>
                    </td>
                    <td>
                      <div className="status-badge-group">
                        <StatusBadge active={patient.isActive} label={patient.isActive ? "Đang hoạt động" : "Ngừng hoạt động"} />
                        {patient.isLocked && <span className="status-badge status-badge-locked">Đã khóa</span>}
                      </div>
                    </td>
                    <td className="table-actions-col">
                      <div className="table-row-actions">
                        <Link to={`/admin/patient/${patient._id}`} className="btn btn-outline btn-sm">
                          Chi tiết
                        </Link>
                        <Link to={`/admin/patient/${patient._id}/edit`} className="btn btn-primary btn-sm">
                          Sửa
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && result.total > 0 && (
        <AppPagination
          page={result.page}
          totalPages={result.totalPages}
          total={result.total}
          limit={filters.limit}
          itemLabel="bệnh nhân"
          onPageChange={(page) => applyFilters({ page })}
        />
      )}
      </AdminLayout>
    </PageLayout>
  );
}

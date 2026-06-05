import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import AdminLayout from "../components/AdminLayout.jsx";
import CustomSelect from "../components/CustomSelect.jsx";
import FilterSearchField from "../components/FilterSearchField.jsx";
import AppPagination from "../components/AppPagination.jsx";
import { AdminApiClient } from "../services/adminApi.js";
import { PublicApiClient } from "../services/publicApi.js";
import { getApiErrorMessage } from "../services/api.js";
import { firstFormError, validateAdminCreateAccountForm } from "../utils/validation.js";

const FILTER_ROLE_OPTIONS = [
  { value: "", label: "Tất cả vai trò" },
  { value: "patient", label: "Bệnh nhân" },
  { value: "doctor", label: "Bác sĩ" },
  { value: "staff", label: "Nhân viên" },
  { value: "admin", label: "Quản trị viên" },
];

const CREATE_ROLE_OPTIONS = [
  { value: "patient", label: "Bệnh nhân" },
  { value: "doctor", label: "Bác sĩ" },
  { value: "admin", label: "Quản trị viên" },
];

function formatRoleLabel(role) {
  const labels = { admin: "Quản trị viên", doctor: "Bác sĩ", staff: "Nhân viên", patient: "Bệnh nhân" };
  return labels[role] || role;
}

const EMPTY_FORM = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  role: "patient",
  specialtyId: "",
  departmentId: "",
  licenseNo: "",
  bio: "",
};

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function StatusBadge({ active, label }) {
  return (
    <span className={`status-badge ${active ? "status-badge-active" : "status-badge-inactive"}`}>
      {label}
    </span>
  );
}

export default function AdminAccountPage() {
  const [filters, setFilters] = useState({ q: "", role: "", page: 1, limit: 20 });
  const [result, setResult] = useState({ items: [], total: 0, totalPages: 1, page: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [creating, setCreating] = useState(false);
  const [specialties, setSpecialties] = useState([]);
  const [departments, setDepartments] = useState([]);

  const loadAccounts = useCallback(async (params) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await AdminApiClient.listAccounts(params);
      setResult(data);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setResult({ items: [], total: 0, totalPages: 1, page: 1 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts(filters);
  }, [filters, loadAccounts]);

  useEffect(() => {
    if (!showCreateModal) return;

    Promise.all([PublicApiClient.getSpecialties(), PublicApiClient.getDepartments()])
      .then(([specRes, deptRes]) => {
        setSpecialties(specRes.data.items || []);
        setDepartments(deptRes.data.items || []);
      })
      .catch(() => {
        setSpecialties([]);
        setDepartments([]);
      });
  }, [showCreateModal]);

  const applyFilters = (patch) => {
    setFilters((current) => ({ ...current, ...patch, page: patch.page ?? 1 }));
  };

  const clearFilters = () => {
    setFilters({ q: "", role: "", page: 1, limit: 20 });
  };

  const openCreateModal = () => {
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setCreateError("");
    setCreateSuccess("");
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setFieldErrors({});
    setCreateError("");
    setCreateSuccess("");
  };

  const onFormChange = (e) => {
    const { name, value } = e.target;
    setForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
    setCreateError("");
    setCreateSuccess("");
  };

  const onCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateError("");
    setCreateSuccess("");

    const errors = validateAdminCreateAccountForm(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setCreateError(firstFormError(errors));
      return;
    }

    setFieldErrors({});
    setCreating(true);

    const payload = {
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      password: form.password,
      role: form.role,
    };

    if (form.role === "doctor") {
      Object.assign(payload, {
        specialtyId: form.specialtyId,
        departmentId: form.departmentId,
        licenseNo: form.licenseNo.trim(),
        bio: form.bio.trim(),
      });
    }

    try {
      const { data } = await AdminApiClient.createAccount(payload);
      setCreateSuccess(data.message);
      setForm(EMPTY_FORM);
      applyFilters({ page: 1 });
      setTimeout(() => closeCreateModal(), 900);
    } catch (err) {
      const message = getApiErrorMessage(err);
      setCreateError(message);
      if (err?.response?.status === 409) {
        const bodyMessage = message.toLowerCase();
        if (bodyMessage.includes("license")) {
          setFieldErrors({ licenseNo: message });
        } else {
          setFieldErrors({ email: message });
        }
      }
    } finally {
      setCreating(false);
    }
  };

  const fieldError = (name) => fieldErrors[name];

  return (
    <PageLayout dashboard>
      <AdminLayout
        title="Danh sách tài khoản"
        description="Xem và quản lý tài khoản người dùng, vai trò và trạng thái hoạt động."
        actions={
          <button type="button" className="btn btn-primary" onClick={openCreateModal}>
            Thêm tài khoản
          </button>
        }
      >
      <div className="card filters-card">
        <div className="filters-toolbar">
          <div className="filters-toolbar-fields">
            <FilterSearchField
              id="admin-account-list-search"
              placeholder="Tìm theo tên, email hoặc số điện thoại…"
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              onSearch={() => applyFilters({ q: filters.q })}
            />
            <CustomSelect
              className="filter-field"
              label="Vai trò"
              value={filters.role}
              onChange={(role) => applyFilters({ role })}
              options={FILTER_ROLE_OPTIONS}
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
          Đang tải tài khoản…
        </div>
      )}

      {!loading && result.items.length === 0 && (
        <div className="empty-state card">
          <h3>Không tìm thấy tài khoản</h3>
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
                  <th>Họ và tên</th>
                  <th>Email</th>
                  <th>Vai trò</th>
                  <th>Số điện thoại</th>
                  <th>Trạng thái</th>
                  <th>Email đã xác minh</th>
                  <th>Đăng nhập gần nhất</th>
                  <th>Ngày tạo</th>
                  <th className="table-actions-col">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((account) => (
                  <tr key={account._id}>
                    <td>
                      <Link to={`/admin/account/${account._id}`} className="table-link">
                        {account.fullName}
                      </Link>
                    </td>
                    <td>{account.email}</td>
                    <td>
                      <span className="role-badge">{formatRoleLabel(account.role)}</span>
                    </td>
                    <td>{account.phone || "—"}</td>
                    <td>
                      <div className="status-badge-group">
                        <StatusBadge active={account.isActive} label={account.isActive ? "Đang hoạt động" : "Ngừng hoạt động"} />
                        {account.isLocked && (
                          <span className="status-badge status-badge-locked">Đã khóa</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <StatusBadge
                        active={account.isEmailVerified}
                        label={account.isEmailVerified ? "Đã xác minh" : "Chưa xác minh"}
                      />
                    </td>
                    <td>{formatDate(account.lastLoginAt)}</td>
                    <td>{formatDate(account.createdAt)}</td>
                    <td className="table-actions-col">
                      <div className="table-row-actions">
                      <Link
                        to={`/admin/account/${account._id}`}
                        className="btn btn-outline btn-icon"
                        aria-label={`Xem ${account.fullName}`}
                        title="Xem chi tiết"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
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
          itemLabel="tài khoản"
          onPageChange={(page) => applyFilters({ page })}
        />
      )}

      {showCreateModal && (
        <div className="modal-backdrop" onClick={closeCreateModal}>
          <div
            className="modal card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-account-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2 id="create-account-title">Thêm tài khoản mới</h2>
                <p>Tạo tài khoản bệnh nhân, bác sĩ hoặc quản trị viên.</p>
              </div>
              <button type="button" className="modal-close" onClick={closeCreateModal} aria-label="Đóng">
                ×
              </button>
            </div>

            <form onSubmit={onCreateSubmit} className="form form-compact">
              {createError && <div className="alert alert-error">{createError}</div>}
              {createSuccess && <div className="alert alert-success">{createSuccess}</div>}

              <label>
                Họ và tên
                <input
                  name="fullName"
                  value={form.fullName}
                  onChange={onFormChange}
                  placeholder="Nguyễn Văn A"
                  aria-invalid={Boolean(fieldError("fullName"))}
                />
                {fieldError("fullName") && <span className="field-error">{fieldError("fullName")}</span>}
              </label>

              <label>
                Địa chỉ email
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={onFormChange}
                  placeholder="user@example.com"
                  aria-invalid={Boolean(fieldError("email"))}
                />
                {fieldError("email") && <span className="field-error">{fieldError("email")}</span>}
              </label>

              <label>
                Số điện thoại
                <input
                  name="phone"
                  value={form.phone}
                  onChange={onFormChange}
                  placeholder="0901234567"
                  aria-invalid={Boolean(fieldError("phone"))}
                />
                {fieldError("phone") && <span className="field-error">{fieldError("phone")}</span>}
              </label>

              <div>
                <CustomSelect
                  label="Vai trò"
                  value={form.role}
                  onChange={(role) => onFormChange({ target: { name: "role", value: role } })}
                  options={CREATE_ROLE_OPTIONS}
                  invalid={Boolean(fieldError("role"))}
                />
                {fieldError("role") && <span className="field-error">{fieldError("role")}</span>}
              </div>

              {form.role === "doctor" && (
                <>
                  <div>
                    <CustomSelect
                      label="Chuyên khoa"
                      value={form.specialtyId}
                      placeholder="Chọn chuyên khoa"
                      onChange={(specialtyId) => onFormChange({ target: { name: "specialtyId", value: specialtyId } })}
                      options={[
                        { value: "", label: "Chọn chuyên khoa" },
                        ...specialties.map((item) => ({ value: item._id, label: item.name })),
                      ]}
                      invalid={Boolean(fieldError("specialtyId"))}
                    />
                    {fieldError("specialtyId") && (
                      <span className="field-error">{fieldError("specialtyId")}</span>
                    )}
                  </div>

                  <div>
                    <CustomSelect
                      label="Khoa/phòng ban"
                      value={form.departmentId}
                      placeholder="Chọn khoa/phòng ban"
                      onChange={(departmentId) => onFormChange({ target: { name: "departmentId", value: departmentId } })}
                      options={[
                        { value: "", label: "Chọn khoa/phòng ban" },
                        ...departments.map((item) => ({ value: item._id, label: item.name })),
                      ]}
                      invalid={Boolean(fieldError("departmentId"))}
                    />
                    {fieldError("departmentId") && (
                      <span className="field-error">{fieldError("departmentId")}</span>
                    )}
                  </div>

                  <label>
                    Số giấy phép
                    <input
                      name="licenseNo"
                      value={form.licenseNo}
                      onChange={onFormChange}
                      placeholder="DOC-001"
                      aria-invalid={Boolean(fieldError("licenseNo"))}
                    />
                    {fieldError("licenseNo") && (
                      <span className="field-error">{fieldError("licenseNo")}</span>
                    )}
                  </label>

                  <label>
                    Tiểu sử
                    <textarea
                      name="bio"
                      value={form.bio}
                      onChange={onFormChange}
                      rows={3}
                      placeholder="Tiểu sử nghề nghiệp ngắn (tùy chọn)"
                    />
                  </label>
                </>
              )}

              <label>
                Mật khẩu
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={onFormChange}
                  placeholder="Tối thiểu 8 ký tự, chữ và số"
                  aria-invalid={Boolean(fieldError("password"))}
                />
                {fieldError("password") && <span className="field-error">{fieldError("password")}</span>}
              </label>

              <label>
                Xác nhận mật khẩu
                <input
                  type="password"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={onFormChange}
                  placeholder="Nhập lại mật khẩu"
                  aria-invalid={Boolean(fieldError("confirmPassword"))}
                />
                {fieldError("confirmPassword") && (
                  <span className="field-error">{fieldError("confirmPassword")}</span>
                )}
              </label>

              <div className="form-actions">
                <button type="button" className="btn btn-outline" onClick={closeCreateModal}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? "Đang tạo…" : "Tạo tài khoản"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </AdminLayout>
    </PageLayout>
  );
}

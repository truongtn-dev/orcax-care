import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import AdminLayout from "../components/AdminLayout.jsx";
import CustomSelect from "../components/CustomSelect.jsx";
import FilterSearchField from "../components/FilterSearchField.jsx";
import AppPagination from "../components/AppPagination.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import { AdminApiClient } from "../services/adminApi.js";
import { getApiErrorMessage } from "../services/api.js";
import { firstFormError, validateAdminCreateSpecialtyForm } from "../utils/validation.js";

const STATUS_OPTIONS = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "true", label: "Đang hoạt động" },
  { value: "false", label: "Ngừng hoạt động" },
];

const EMPTY_FORM = {
  code: "",
  name: "",
  description: "",
  isActive: true,
};

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function StatusBadge({ active }) {
  return (
    <span className={`status-badge ${active ? "status-badge-active" : "status-badge-inactive"}`}>
      {active ? "Đang hoạt động" : "Ngừng hoạt động"}
    </span>
  );
}

export default function AdminSpecialtyPage() {
  const [filters, setFilters] = useState({ q: "", isActive: "", page: 1, limit: 20 });
  const [result, setResult] = useState({ items: [], total: 0, totalPages: 1, page: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");

  const loadSpecialties = useCallback(async (params) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await AdminApiClient.listSpecialties(params);
      setResult(data);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setResult({ items: [], total: 0, totalPages: 1, page: 1 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSpecialties(filters);
  }, [filters, loadSpecialties]);

  const applyFilters = (patch) => {
    setFilters((current) => ({ ...current, ...patch, page: patch.page ?? 1 }));
  };

  const clearFilters = () => {
    setFilters({ q: "", isActive: "", page: 1, limit: 20 });
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
    const { name, value, type, checked } = e.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
    setCreateError("");
    setCreateSuccess("");
  };

  const onCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateError("");
    setCreateSuccess("");

    const errors = validateAdminCreateSpecialtyForm(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setCreateError(firstFormError(errors));
      return;
    }

    setFieldErrors({});
    setCreating(true);

    try {
      const { data } = await AdminApiClient.createSpecialty({
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        description: form.description.trim(),
        isActive: form.isActive,
      });
      setCreateSuccess(data.message);
      setForm(EMPTY_FORM);
      applyFilters({ page: 1 });
      setTimeout(() => closeCreateModal(), 900);
    } catch (err) {
      const message = getApiErrorMessage(err);
      setCreateError(message);
      if (err?.response?.status === 409) {
        const bodyMessage = message.toLowerCase();
        if (bodyMessage.includes("code")) {
          setFieldErrors({ code: message });
        } else {
          setFieldErrors({ name: message });
        }
      }
    } finally {
      setCreating(false);
    }
  };

  const fieldError = (name) => fieldErrors[name];

  const openDeleteConfirm = (specialty) => {
    if (specialty.doctorCount > 0) {
      setActionError(
        `Không thể xóa "${specialty.name}". Chuyên khoa này đang được gán cho ${specialty.doctorCount} bác sĩ.`
      );
      setActionMessage("");
      return;
    }
    setActionError("");
    setActionMessage("");
    setDeleteTarget(specialty);
  };

  const closeDeleteConfirm = () => {
    if (deletingId) return;
    setDeleteTarget(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    setDeletingId(deleteTarget._id);
    setActionError("");
    setActionMessage("");

    try {
      const { data } = await AdminApiClient.deleteSpecialty(deleteTarget._id);
      setActionMessage(data.message);
      setDeleteTarget(null);
      loadSpecialties(filters);
    } catch (err) {
      setActionError(getApiErrorMessage(err));
      setDeleteTarget(null);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <PageLayout dashboard>
      <AdminLayout
        title="Quản lý chuyên khoa"
        description="Danh mục chuyên khoa lâm sàng và trạng thái sử dụng trên hệ thống."
        actions={
          <button type="button" className="btn btn-primary" onClick={openCreateModal}>
            Tạo chuyên khoa
          </button>
        }
      >
      <div className="card filters-card">
        <div className="filters-toolbar">
          <div className="filters-toolbar-fields">
            <FilterSearchField
              id="admin-specialty-search"
              placeholder="Tìm theo mã, tên hoặc mô tả…"
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
      {actionError && <div className="alert alert-error">{actionError}</div>}
      {actionMessage && <div className="alert alert-success">{actionMessage}</div>}

      {loading && (
        <div className="loading-state">
          <div className="loading-spinner" />
          Đang tải chuyên khoa…
        </div>
      )}

      {!loading && result.items.length === 0 && (
        <div className="empty-state card">
          <h3>Không tìm thấy chuyên khoa</h3>
          <p>Hãy thử điều chỉnh tiêu chí tìm kiếm hoặc tạo chuyên khoa mới.</p>
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
                  <th>Mã</th>
                  <th>Tên</th>
                  <th>Mô tả</th>
                  <th>Bác sĩ</th>
                  <th>Trạng thái</th>
                  <th>Ngày tạo</th>
                  <th className="table-actions-col">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((specialty) => (
                  <tr key={specialty._id} className={!specialty.isActive ? "row-inactive" : ""}>
                    <td>
                      <span className="code-badge">{specialty.code}</span>
                    </td>
                    <td className="specialty-name-cell">{specialty.name}</td>
                    <td className="description-cell">{specialty.description || "—"}</td>
                    <td>{specialty.doctorCount}</td>
                    <td>
                      <StatusBadge active={specialty.isActive} />
                    </td>
                    <td>{formatDate(specialty.createdAt)}</td>
                    <td className="table-actions-col">
                      <div className="table-row-actions">
                      <button
                        type="button"
                        className="btn btn-outline btn-icon btn-icon-danger"
                        aria-label={`Xóa ${specialty.name}`}
                        title={
                          specialty.doctorCount > 0
                            ? `Không thể xóa — đang liên kết ${specialty.doctorCount} bác sĩ`
                            : specialty.isActive
                              ? "Ngừng hoạt động chuyên khoa"
                              : "Đã ngừng hoạt động"
                        }
                        disabled={
                          deletingId === specialty._id ||
                          specialty.doctorCount > 0 ||
                          !specialty.isActive
                        }
                        onClick={() => openDeleteConfirm(specialty)}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                          <path d="M3 6h18" />
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                          <line x1="10" y1="11" x2="10" y2="17" />
                          <line x1="14" y1="11" x2="14" y2="17" />
                        </svg>
                      </button>
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
          itemLabel="chuyên khoa"
          onPageChange={(page) => applyFilters({ page })}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Ngừng hoạt động chuyên khoa?"
        description={
          deleteTarget
            ? `Bạn sắp ngừng hoạt động "${deleteTarget.name}" (${deleteTarget.code}).`
            : ""
        }
        confirmText="Có, ngừng hoạt động"
        cancelText="Hủy"
        variant="danger"
        loading={Boolean(deletingId)}
        onConfirm={confirmDelete}
        onCancel={closeDeleteConfirm}
      />

      {showCreateModal && (
        <div className="modal-backdrop" onClick={closeCreateModal}>
          <div
            className="modal card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-specialty-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2 id="create-specialty-title">Tạo chuyên khoa</h2>
                <p>Thêm chuyên khoa y tế mới vào hệ thống.</p>
              </div>
              <button type="button" className="modal-close" onClick={closeCreateModal} aria-label="Đóng">
                ×
              </button>
            </div>

            <form onSubmit={onCreateSubmit} className="form form-compact">
              {createError && <div className="alert alert-error">{createError}</div>}
              {createSuccess && <div className="alert alert-success">{createSuccess}</div>}

              <label>
                Mã
                <input
                  name="code"
                  value={form.code}
                  onChange={onFormChange}
                  placeholder="vd. CARD"
                  aria-invalid={Boolean(fieldError("code"))}
                  style={{ textTransform: "uppercase" }}
                />
                {fieldError("code") && <span className="field-error">{fieldError("code")}</span>}
                <span className="field-hint">2–12 ký tự, chữ, số, gạch ngang, gạch dưới</span>
              </label>

              <label>
                Tên
                <input
                  name="name"
                  value={form.name}
                  onChange={onFormChange}
                  placeholder="vd. Tim mạch"
                  aria-invalid={Boolean(fieldError("name"))}
                />
                {fieldError("name") && <span className="field-error">{fieldError("name")}</span>}
              </label>

              <label>
                Mô tả
                <textarea
                  name="description"
                  value={form.description}
                  onChange={onFormChange}
                  rows={3}
                  placeholder="Mô tả ngắn về chuyên khoa (tùy chọn)"
                  aria-invalid={Boolean(fieldError("description"))}
                />
                {fieldError("description") && (
                  <span className="field-error">{fieldError("description")}</span>
                )}
              </label>

              <label className="checkbox-row">
                <input type="checkbox" name="isActive" checked={form.isActive} onChange={onFormChange} />
                Đang hoạt động (hiển thị trên hệ thống)
              </label>

              <div className="form-actions">
                <button type="button" className="btn btn-outline" onClick={closeCreateModal}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? "Đang tạo…" : "Tạo chuyên khoa"}
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

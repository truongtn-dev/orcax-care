import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import AdminLayout from "../components/AdminLayout.jsx";
import CustomSelect from "../components/CustomSelect.jsx";
import FilterSearchField from "../components/FilterSearchField.jsx";
import AppPagination from "../components/AppPagination.jsx";
import { AdminApiClient } from "../services/adminApi.js";
import { getApiErrorMessage } from "../services/api.js";
import { firstFormError, validateAdminCreateClinicRoomForm } from "../utils/validation.js";

const STATUS_OPTIONS = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "true", label: "Đang hoạt động" },
  { value: "false", label: "Ngừng hoạt động" },
];

const EMPTY_FORM = {
  departmentId: "",
  roomCode: "",
  name: "",
  floor: "",
  capacity: "1",
  equipmentNotes: "",
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

export default function AdminClinicRoomPage() {
  const [departments, setDepartments] = useState([]);
  const [filters, setFilters] = useState({ q: "", departmentId: "", isActive: "", page: 1, limit: 20 });
  const [result, setResult] = useState({ items: [], total: 0, totalPages: 1, page: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [creating, setCreating] = useState(false);

  const loadDepartments = useCallback(() => {
    return AdminApiClient.listClinicRoomDepartments()
      .then(({ data }) => setDepartments(data.items || []))
      .catch(() => setDepartments([]));
  }, []);

  const loadClinicRooms = useCallback(async (params) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await AdminApiClient.listClinicRooms(params);
      setResult(data);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setResult({ items: [], total: 0, totalPages: 1, page: 1 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  useEffect(() => {
    loadClinicRooms(filters);
  }, [filters, loadClinicRooms]);

  const applyFilters = (patch) => {
    setFilters((current) => ({ ...current, ...patch, page: patch.page ?? 1 }));
  };

  const clearFilters = () => {
    setFilters({ q: "", departmentId: "", isActive: "", page: 1, limit: 20 });
  };

  const openCreateModal = () => {
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setCreateError("");
    setCreateSuccess("");
    loadDepartments();
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

    const errors = validateAdminCreateClinicRoomForm(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setCreateError(firstFormError(errors));
      return;
    }

    setFieldErrors({});
    setCreating(true);

    try {
      const { data } = await AdminApiClient.createClinicRoom({
        departmentId: form.departmentId,
        roomCode: form.roomCode.trim(),
        name: form.name.trim(),
        floor: form.floor.trim(),
        capacity: parseInt(form.capacity, 10),
        equipmentNotes: form.equipmentNotes.trim(),
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
        setFieldErrors({ roomCode: message });
      }
    } finally {
      setCreating(false);
    }
  };

  const fieldError = (name) => fieldErrors[name];

  return (
    <PageLayout dashboard>
      <AdminLayout
        title="Quản lý phòng khám"
        description="Quản lý phòng khám theo khoa/phòng ban, sức chứa và trạng thái vận hành."
        actions={
          <button type="button" className="btn btn-primary" onClick={openCreateModal}>
            Tạo phòng khám
          </button>
        }
      >
      <div className="card filters-card">
        <div className="filters-toolbar">
          <div className="filters-toolbar-fields">
            <FilterSearchField
              id="admin-clinic-room-search"
              placeholder="Tìm theo mã, tên, tầng hoặc thiết bị…"
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              onSearch={() => applyFilters({ q: filters.q })}
            />
            <CustomSelect
              className="filter-field"
              label="Khoa/phòng ban"
              value={filters.departmentId}
              placeholder="Tất cả khoa/phòng ban"
              onChange={(departmentId) => applyFilters({ departmentId })}
              options={[
                { value: "", label: "Tất cả khoa/phòng ban" },
                ...departments.map((dept) => ({ value: dept._id, label: dept.name })),
              ]}
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
          Đang tải phòng khám…
        </div>
      )}

      {!loading && result.items.length === 0 && (
        <div className="empty-state card">
          <h3>Không tìm thấy phòng khám</h3>
          <p>Hãy thử điều chỉnh tiêu chí tìm kiếm hoặc tạo phòng khám mới.</p>
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
                  <th>Mã phòng</th>
                  <th>Tên</th>
                  <th>Khoa/phòng ban</th>
                  <th>Tầng</th>
                  <th>Sức chứa</th>
                  <th>Thiết bị</th>
                  <th>Trạng thái</th>
                  <th>Ngày tạo</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((room) => (
                  <tr key={room._id} className={!room.isActive ? "row-inactive" : ""}>
                    <td>
                      <span className="code-badge">{room.roomCode}</span>
                    </td>
                    <td className="specialty-name-cell">{room.name}</td>
                    <td>
                      <div>{room.department?.name || "—"}</div>
                      {room.department?.location && (
                        <div className="table-subtext">{room.department.location}</div>
                      )}
                    </td>
                    <td>{room.floor || "—"}</td>
                    <td>{room.capacity}</td>
                    <td className="description-cell">{room.equipmentNotes || "—"}</td>
                    <td>
                      <StatusBadge active={room.isActive} />
                    </td>
                    <td>{formatDate(room.createdAt)}</td>
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
          itemLabel="phòng khám"
          onPageChange={(page) => applyFilters({ page })}
        />
      )}

      {showCreateModal && (
        <div className="modal-backdrop" onClick={closeCreateModal}>
          <div
            className="modal card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-clinic-room-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2 id="create-clinic-room-title">Tạo phòng khám</h2>
                <p>Thêm phòng khám hoặc điều trị mới.</p>
              </div>
              <button type="button" className="modal-close" onClick={closeCreateModal} aria-label="Đóng">
                ×
              </button>
            </div>

            <form onSubmit={onCreateSubmit} className="form form-compact">
              {createError && <div className="alert alert-error">{createError}</div>}
              {createSuccess && <div className="alert alert-success">{createSuccess}</div>}

              <div>
                <CustomSelect
                  label="Khoa/phòng ban"
                  value={form.departmentId}
                  placeholder="Chọn khoa/phòng ban"
                  onChange={(departmentId) => onFormChange({ target: { name: "departmentId", value: departmentId } })}
                  options={[
                    { value: "", label: "Chọn khoa/phòng ban" },
                    ...departments.map((dept) => ({ value: dept._id, label: dept.name })),
                  ]}
                  invalid={Boolean(fieldError("departmentId"))}
                />
                {fieldError("departmentId") && (
                  <span className="field-error">{fieldError("departmentId")}</span>
                )}
              </div>

              <label>
                Mã phòng
                <input
                  name="roomCode"
                  value={form.roomCode}
                  onChange={onFormChange}
                  placeholder="vd. IM-203"
                  aria-invalid={Boolean(fieldError("roomCode"))}
                  style={{ textTransform: "uppercase" }}
                />
                {fieldError("roomCode") && <span className="field-error">{fieldError("roomCode")}</span>}
                <span className="field-hint">2–12 ký tự, chữ, số, gạch ngang, gạch dưới</span>
              </label>

              <label>
                Tên phòng
                <input
                  name="name"
                  value={form.name}
                  onChange={onFormChange}
                  placeholder="vd. Phòng khám 203"
                  aria-invalid={Boolean(fieldError("name"))}
                />
                {fieldError("name") && <span className="field-error">{fieldError("name")}</span>}
              </label>

              <label>
                Tầng
                <input
                  name="floor"
                  value={form.floor}
                  onChange={onFormChange}
                  placeholder="vd. 2"
                  aria-invalid={Boolean(fieldError("floor"))}
                />
                {fieldError("floor") && <span className="field-error">{fieldError("floor")}</span>}
              </label>

              <label>
                Sức chứa
                <input
                  type="number"
                  name="capacity"
                  value={form.capacity}
                  onChange={onFormChange}
                  min={1}
                  max={50}
                  aria-invalid={Boolean(fieldError("capacity"))}
                />
                {fieldError("capacity") && <span className="field-error">{fieldError("capacity")}</span>}
              </label>

              <label>
                Ghi chú thiết bị
                <textarea
                  name="equipmentNotes"
                  value={form.equipmentNotes}
                  onChange={onFormChange}
                  rows={3}
                  placeholder="Thiết bị có sẵn (tùy chọn)"
                  aria-invalid={Boolean(fieldError("equipmentNotes"))}
                />
                {fieldError("equipmentNotes") && (
                  <span className="field-error">{fieldError("equipmentNotes")}</span>
                )}
              </label>

              <label className="checkbox-row">
                <input type="checkbox" name="isActive" checked={form.isActive} onChange={onFormChange} />
                Đang hoạt động (sẵn sàng đặt lịch)
              </label>

              <div className="form-actions">
                <button type="button" className="btn btn-outline" onClick={closeCreateModal}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? "Đang tạo…" : "Tạo phòng khám"}
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

import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import "./AdminDashboardPage.css";
import PageLayout from "../components/PageLayout.jsx";
import AdminLayout from "../components/AdminLayout.jsx";
import CustomSelect from "../components/CustomSelect.jsx";
import FilterSearchField from "../components/FilterSearchField.jsx";
import AppPagination from "../components/AppPagination.jsx";
import ScrollReveal from "../components/ScrollReveal.jsx";
import { AdminApiClient } from "../services/adminApi.js";
import { PublicApiClient } from "../services/publicApi.js";
import { getApiErrorMessage } from "../services/api.js";

function IconPhone({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function IconUserPlus({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  );
}

function IconShield({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function IconMail({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

function IconDownload({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function formatRoleLabel(role) {
  const labels = { admin: "Administrator", doctor: "Doctor", staff: "Staff", patient: "Patient" };
  return labels[role] || role;
}

function formatRoomStatus(status) {
  const labels = { active: "Active", maintenance: "Maintenance", inactive: "Inactive" };
  return labels[status] || status;
}

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

const ACCOUNT_ROLE_OPTIONS = [
  { value: "", label: "All roles" },
  { value: "patient", label: "Patient" },
  { value: "doctor", label: "Doctor" },
  { value: "staff", label: "Staff" },
  { value: "admin", label: "Administrator" },
];

const DOCTOR_STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "true", label: "Active only" },
  { value: "false", label: "Inactive only" },
];

const STAFF_ROLE_OPTIONS = [
  { value: "staff", label: "Staff (Support / Reception)" },
  { value: "patient", label: "Patient (Full demographics)" },
  { value: "doctor", label: "Doctor (Specialty)" },
  { value: "admin", label: "Administrator" },
];

const SYSTEM_ROLE_OPTIONS = [
  { value: "patient", label: "Patient" },
  { value: "staff", label: "Staff" },
  { value: "doctor", label: "Doctor" },
  { value: "admin", label: "Administrator" },
];

const GENDER_OPTIONS = [
  { value: "", label: "Prefer not to say" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

const ROOM_STATUS_OPTIONS = [
  { value: "active", label: "Active (Ready)" },
  { value: "maintenance", label: "Maintenance" },
  { value: "inactive", label: "Inactive" },
];

export default function AdminDashboardPage() {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "accounts";

  
  const [specialties, setSpecialties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [deptSort, setDeptSort] = useState({ key: "name", direction: "asc" });

  
  const [accountFilters, setAccountFilters] = useState({ q: "", role: "", page: 1, limit: 10 });
  const [accountResult, setAccountResult] = useState({ items: [], total: 0, totalPages: 1, page: 1 });
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [staffForm, setStaffForm] = useState({
    email: "",
    password: "",
    fullName: "",
    phone: "",
    role: "staff",
    specialtyId: "",
    departmentId: "",
    licenseNo: "",
    bio: "",
    dateOfBirth: "",
    gender: "",
    address: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
  });
  const [showChangeRoleModal, setShowChangeRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [roleForm, setRoleForm] = useState({ role: "patient", specialtyId: "", departmentId: "", licenseNo: "", bio: "" });

  
  const [specialtyForm, setSpecialtyForm] = useState({ id: null, code: "", name: "", description: "", isActive: true });
  const [specialtyFilters, setSpecialtyFilters] = useState({ q: "", page: 1, limit: 10 });
  const [specialtyListResult, setSpecialtyListResult] = useState({ items: [], total: 0, totalPages: 1, page: 1 });
  const [showSpecialtyModal, setShowSpecialtyModal] = useState(false);

  
  const [rooms, setRooms] = useState([]);
  const [roomFilters, setRoomFilters] = useState({ q: "", page: 1, limit: 10 });
  const [roomPagination, setRoomPagination] = useState({ total: 0, totalPages: 1, page: 1 });
  const [roomForm, setRoomForm] = useState({ id: null, roomNumber: "", name: "", specialtyId: "", status: "active" });
  const [showRoomModal, setShowRoomModal] = useState(false);

  
  const [doctors, setDoctors] = useState([]);
  const [doctorFilters, setDoctorFilters] = useState({ isActive: "all", specialtyId: "", departmentId: "", name: "", page: 1, limit: 8 });
  const [doctorPagination, setDoctorPagination] = useState({ total: 0, totalPages: 1 });
  const [allDoctorsForCount, setAllDoctorsForCount] = useState([]);

  
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, type: "success", message: "" });
  const [confirmModal, setConfirmModal] = useState({ show: false, title: "", message: "", onConfirm: null });
  const setError = (msg) => {
    if (!msg) return;
    setToast({ show: true, type: "error", message: msg });
    setTimeout(() => {
      setToast(prev => prev.message === msg ? { show: false, type: "error", message: "" } : prev);
    }, 4500);
  };
  const setSuccess = (msg) => {
    if (!msg) return;
    setToast({ show: true, type: "success", message: msg });
    setTimeout(() => {
      setToast(prev => prev.message === msg ? { show: false, type: "success", message: "" } : prev);
    }, 4500);
  };

  
  
  
  const loadMasterData = useCallback(async () => {
    try {
      const [specRes, deptRes] = await Promise.all([
        PublicApiClient.getSpecialties(),
        PublicApiClient.getDepartments(),
      ]);
      setSpecialties(specRes.data.items || []);
      setDepartments(deptRes.data.items || []);
    } catch (err) {
      console.error("Failed to load master catalogs:", err);
    }
  }, []);

  const handleDeptSort = (key) => {
    setDeptSort((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  useEffect(() => {
    loadMasterData();
  }, [loadMasterData]);

  
  
  
  const loadAccounts = useCallback(async (filters) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await AdminApiClient.listAccounts(filters);
      setAccountResult(data);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setAccountResult({ items: [], total: 0, totalPages: 1, page: 1 });
    } finally {
      setLoading(false);
    }
  }, []);

  const applyAccountFilters = (patch) => {
    setAccountFilters((current) => ({ ...current, ...patch, page: patch.page ?? 1 }));
  };

  const loadSpecialtyList = useCallback(async (filters) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await AdminApiClient.listSpecialties(filters);
      setSpecialtyListResult(data);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setSpecialtyListResult({ items: [], total: 0, totalPages: 1, page: 1 });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRooms = useCallback(async (filters) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await AdminApiClient.listClinicRooms(filters);
      setRooms(data.items || []);
      setRoomPagination({ total: data.total, totalPages: data.totalPages, page: data.page });
    } catch (err) {
      setError(getApiErrorMessage(err));
      setRooms([]);
      setRoomPagination({ total: 0, totalPages: 1, page: 1 });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDoctors = useCallback(async (filters) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await AdminApiClient.listDoctors(filters);
      setDoctors(data.items || []);
      setDoctorPagination({ total: data.total, totalPages: data.totalPages });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAllDoctorsForCount = async () => {
    try {
      const { data } = await AdminApiClient.listDoctors({ limit: 1000 });
      setAllDoctorsForCount(data.items || []);
    } catch (err) {
      console.error("Failed to load doctors for count:", err);
    }
  };

  useEffect(() => {
    setError("");
    setSuccess("");
    if (activeTab === "accounts") {
      loadAccounts(accountFilters);
    } else if (activeTab === "specialties") {
      loadSpecialtyList(specialtyFilters);
    } else if (activeTab === "rooms") {
      loadRooms(roomFilters);
    } else if (activeTab === "doctors") {
      loadDoctors(doctorFilters);
    } else if (activeTab === "departments") {
      loadAllDoctorsForCount();
    }
  }, [
    activeTab,
    accountFilters,
    specialtyFilters,
    roomFilters,
    doctorFilters,
    loadAccounts,
    loadSpecialtyList,
    loadRooms,
    loadDoctors,
  ]);

  
  
  

  const handleAddStaffSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setError("");
    setSuccess("");
    try {
      await AdminApiClient.createStaff(staffForm);
      setSuccess(`Created ${formatRoleLabel(staffForm.role)} account successfully!`);
      setShowAddStaffModal(false);
      setStaffForm({
        email: "",
        password: "",
        fullName: "",
        phone: "",
        role: "staff",
        specialtyId: "",
        departmentId: "",
        licenseNo: "",
        bio: "",
        dateOfBirth: "",
        gender: "",
        address: "",
        emergencyContactName: "",
        emergencyContactPhone: "",
      });
      loadAccounts(accountFilters);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeactivateUser = (userId) => {
    setConfirmModal({
      show: true,
      title: "Inactive accounts",
      message: "Are you sure you want to deactivate this account? The user will be signed out immediately and all active sessions will be terminated.",
      onConfirm: async () => {
        setActionLoading(true);
        setError("");
        setSuccess("");
        try {
          await AdminApiClient.deactivateUser(userId);
          setSuccess("Account deactivated and all sessions terminated.");
          loadAccounts(accountFilters);
        } catch (err) {
          setError(getApiErrorMessage(err));
        } finally {
          setActionLoading(false);
          setConfirmModal({ show: false, title: "", message: "", onConfirm: null });
        }
      }
    });
  };

  const handleReactivateUser = async (userId) => {
    setActionLoading(true);
    setError("");
    setSuccess("");
    try {
      await AdminApiClient.reactivateUser(userId);
      setSuccess("Account reactivated successfully.");
      loadAccounts(accountFilters);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const openChangeRoleModal = (user) => {
    setSelectedUser(user);
    setRoleForm({
      role: user.role,
      specialtyId: specialties[0]?._id || "",
      departmentId: departments[0]?._id || "",
      licenseNo: "",
      bio: "",
    });
    setShowChangeRoleModal(true);
    setError("");
    setSuccess("");
  };

  const handleChangeRoleSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setError("");
    setSuccess("");
    try {
      const extra = roleForm.role === "doctor" ? {
        specialtyId: roleForm.specialtyId,
        departmentId: roleForm.departmentId,
        licenseNo: roleForm.licenseNo,
        bio: roleForm.bio,
      } : {};
      await AdminApiClient.changeRole(selectedUser._id, roleForm.role, extra);
      setSuccess("User role updated successfully. All current sessions have been invalidated.");
      setShowChangeRoleModal(false);
      setSelectedUser(null);
      loadAccounts(accountFilters);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  
  const openSpecialtyModal = (spec = null) => {
    if (spec) {
      setSpecialtyForm({ id: spec._id, code: spec.code, name: spec.name, description: spec.description || "", isActive: spec.isActive });
    } else {
      setSpecialtyForm({ id: null, code: "", name: "", description: "", isActive: true });
    }
    setShowSpecialtyModal(true);
    setError("");
    setSuccess("");
  };

  const handleSpecialtySubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setError("");
    setSuccess("");
    try {
      if (specialtyForm.id) {
        await AdminApiClient.updateSpecialty(specialtyForm.id, specialtyForm);
        setSuccess("Specialty updated successfully.");
      } else {
        await AdminApiClient.createSpecialty(specialtyForm);
        setSuccess("Specialty created successfully.");
      }
      setShowSpecialtyModal(false);
      loadSpecialtyList(specialtyFilters);
      loadMasterData();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  
  const openRoomModal = (room = null) => {
    if (room) {
      setRoomForm({
        id: room._id,
        roomNumber: room.roomNumber,
        name: room.name,
        specialtyId: room.specialtyId?._id || room.specialtyId || "",
        status: room.status,
      });
    } else {
      setRoomForm({
        id: null,
        roomNumber: "",
        name: "",
        specialtyId: specialties[0]?._id || "",
        status: "active",
      });
    }
    setShowRoomModal(true);
    setError("");
    setSuccess("");
  };

  const handleRoomSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setError("");
    setSuccess("");
    try {
      if (roomForm.id) {
        await AdminApiClient.updateClinicRoom(roomForm.id, roomForm);
        setSuccess("Clinic room updated successfully.");
      } else {
        await AdminApiClient.createClinicRoom(roomForm);
        setSuccess("Clinic room created successfully.");
      }
      setShowRoomModal(false);
      loadRooms(roomFilters);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const exportDoctorsToCSV = () => {
    const headers = ["Full name", "Email", "Phone number", "Specialty", "Department", "License number", "Status"];
    const rows = doctors.map(doc => [
      doc.fullName,
      doc.email,
      doc.phone || "",
      doc.specialty?.name || "",
      doc.department?.name || "",
      doc.licenseNo,
      doc.isActive ? "Active" : "Inactive"
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `doctors_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const topbarActions = useMemo(() => {
    if (loading) return null;

    if (activeTab === "accounts") {
      return (
        <button
          type="button"
          className="btn btn-primary admin-register-btn"
          onClick={() => setShowAddStaffModal(true)}
        >
          <IconUserPlus className="admin-btn-icon" />
          Register account
        </button>
      );
    }

    if (activeTab === "specialties") {
      return (
        <button type="button" className="btn btn-primary" onClick={() => openSpecialtyModal()}>
          + Add specialty
        </button>
      );
    }

    if (activeTab === "rooms") {
      return (
        <button type="button" className="btn btn-primary" onClick={() => openRoomModal()}>
          + Add clinic room
        </button>
      );
    }

    return null;
  }, [activeTab, loading]);

  return (
    <PageLayout dashboard>
      <AdminLayout actions={topbarActions}>
      {toast.show && (
        <div className={`toast-notification toast-${toast.type} animate-slide-in`}>
          <div className="toast-icon">
            {toast.type === "success" ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            )}
          </div>
          <div className="toast-content">
            <span className="toast-title">{toast.type === "success" ? "Success" : "Error"}</span>
            <p className="toast-message">{toast.message}</p>
          </div>
          <button type="button" className="toast-close" onClick={() => setToast({ show: false, type: "success", message: "" })}>
            &times;
          </button>
        </div>
      )}

      
      {loading && (
        <div className="loading-state" style={{ padding: "4rem" }}>
          <div className="loading-spinner" />
          Loading data…
        </div>
      )}

      
      {!loading && activeTab === "accounts" && (
        <ScrollReveal variant="up" delay={80}>
          <div className="card admin-card admin-accounts-card">
            <div className="admin-section-bar">
              <span className="admin-section-count">{accountResult.total} accounts</span>
            </div>

            <div className="admin-filters-grid admin-accounts-filters">
              <div className="admin-filters-fields">
                <FilterSearchField
                  id="admin-account-search"
                  placeholder="Name, email, or phone number…"
                  value={accountFilters.q}
                  onChange={(e) => setAccountFilters((f) => ({ ...f, q: e.target.value }))}
                  onSearch={() => applyAccountFilters({ q: accountFilters.q })}
                />
                <CustomSelect
                  className="filter-field"
                  label="Role"
                  value={accountFilters.role}
                  onChange={(role) => applyAccountFilters({ role })}
                  options={ACCOUNT_ROLE_OPTIONS}
                />
              </div>
              <div className="admin-filters-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => applyAccountFilters({ q: accountFilters.q })}
                >
                  Search
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setAccountFilters({ q: "", role: "", page: 1, limit: 10 })}
                >
                  Clear filters
                </button>
              </div>
            </div>

            <div className="table-responsive admin-accounts-table-wrap">
              <table className="admin-table admin-accounts-table">
                <thead>
                  <tr>
                    <th>Full name</th>
                    <th>Email</th>
                    <th>Phone number</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Registered</th>
                    <th className="admin-table-actions-col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {accountResult.items.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="admin-table-empty">
                        No accounts found. Register the first account or adjust your filters.
                      </td>
                    </tr>
                  ) : (
                    accountResult.items.map((user) => (
                      <tr key={user._id}>
                        <td>
                          <div className="admin-user-cell">
                            <span className="admin-user-avatar" aria-hidden="true">
                              {getInitials(user.fullName)}
                            </span>
                            <span className="admin-user-name">{user.fullName}</span>
                          </div>
                        </td>
                        <td className="admin-email-cell">{user.email}</td>
                        <td className="admin-phone-cell">
                          {user.phone ? (
                            <span className="admin-phone-value">
                              <IconPhone className="admin-phone-icon" />
                              {user.phone}
                            </span>
                          ) : (
                            <span className="admin-text-muted">—</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge badge-role-${user.role}`}>
                            {formatRoleLabel(user.role)}
                          </span>
                        </td>
                        <td>
                          <span className={`badge badge-status-${user.isActive ? "active" : "inactive"}`}>
                            {user.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="admin-date-cell">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="admin-table-actions-col">
                          <div className="admin-row-actions">
                            <button
                              type="button"
                              className="btn btn-sm admin-action-role"
                              onClick={() => openChangeRoleModal(user)}
                            >
                              <IconShield className="admin-btn-icon" />
                              Change role
                            </button>
                            {user.isActive ? (
                              <button
                                type="button"
                                className="btn btn-sm admin-action-deactivate"
                                onClick={() => handleDeactivateUser(user._id)}
                              >
                                Inactive
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-sm admin-action-reactivate"
                                onClick={() => handleReactivateUser(user._id)}
                              >
                                Reactivate
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <AppPagination
              page={accountResult.page}
              totalPages={accountResult.totalPages}
              total={accountResult.total}
              limit={accountFilters.limit}
              itemLabel="accounts"
              onPageChange={(page) => applyAccountFilters({ page })}
            />
          </div>
        </ScrollReveal>
      )}

      
      {!loading && activeTab === "specialties" && (
        <ScrollReveal variant="up" delay={80}>
          <div className="card admin-card">
            <div className="admin-section-bar">
              <span className="admin-section-count">{specialtyListResult.total} specialties</span>
            </div>

            <div className="admin-filters-grid" style={{ marginBottom: "1rem" }}>
              <div className="admin-filters-fields">
                <FilterSearchField
                  id="admin-specialty-search"
                  placeholder="Code or name…"
                  value={specialtyFilters.q}
                  onChange={(e) => setSpecialtyFilters((f) => ({ ...f, q: e.target.value }))}
                  onSearch={() => setSpecialtyFilters((f) => ({ ...f, q: specialtyFilters.q, page: 1 }))}
                />
              </div>
              <div className="admin-filters-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setSpecialtyFilters((f) => ({ ...f, page: 1 }))}
                >
                  Search
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setSpecialtyFilters({ q: "", page: 1, limit: 10 })}
                >
                  Clear filters
                </button>
              </div>
            </div>

            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name specialties</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th className="admin-table-actions-col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {specialtyListResult.items.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: "center", padding: "2rem" }}>
                        No specialties found.
                      </td>
                    </tr>
                  ) : (
                    specialtyListResult.items.map((spec) => (
                    <tr key={spec._id}>
                      <td><code>{spec.code}</code></td>
                      <td><strong>{spec.name}</strong></td>
                      <td style={{ maxWidth: "300px" }}>{spec.description || <em style={{ color: "var(--color-text-muted)" }}>None</em>}</td>
                      <td>
                        <span className={`badge badge-status-${spec.isActive ? "active" : "inactive"}`}>
                          {spec.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="admin-table-actions-col">
                        <div className="table-row-actions">
                        <button
                          className="btn btn-outline btn-xs"
                          onClick={() => openSpecialtyModal(spec)}
                        >
                          Edit
                        </button>
                        </div>
                      </td>
                    </tr>
                  ))
                  )}
                </tbody>
              </table>
            </div>

            <AppPagination
              page={specialtyListResult.page}
              totalPages={specialtyListResult.totalPages}
              total={specialtyListResult.total}
              limit={specialtyFilters.limit}
              itemLabel="specialties"
              onPageChange={(page) => setSpecialtyFilters((f) => ({ ...f, page }))}
            />
          </div>
        </ScrollReveal>
      )}

      
      {!loading && activeTab === "rooms" && (
        <ScrollReveal variant="up" delay={80}>
          <div className="card admin-card">
            <div className="admin-section-bar">
              <span className="admin-section-count">{roomPagination.total} clinic rooms</span>
            </div>

            <div className="admin-filters-grid" style={{ marginBottom: "1rem" }}>
              <div className="admin-filters-fields">
                <FilterSearchField
                  id="admin-room-search"
                  placeholder="Room number or name…"
                  value={roomFilters.q}
                  onChange={(e) => setRoomFilters((f) => ({ ...f, q: e.target.value }))}
                  onSearch={() => setRoomFilters((f) => ({ ...f, q: roomFilters.q, page: 1 }))}
                />
              </div>
              <div className="admin-filters-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setRoomFilters((f) => ({ ...f, page: 1 }))}
                >
                  Search
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setRoomFilters({ q: "", page: 1, limit: 10 })}
                >
                  Clear filters
                </button>
              </div>
            </div>

            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Room number</th>
                    <th>Room name</th>
                    <th>Assigned specialty</th>
                    <th>Current status</th>
                    <th className="admin-table-actions-col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rooms.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: "center", padding: "2rem" }}>
                        No clinic rooms have been registered yet.
                      </td>
                    </tr>
                  ) : (
                    rooms.map((room) => (
                      <tr key={room._id}>
                        <td><code>{room.roomNumber}</code></td>
                        <td><strong>{room.name}</strong></td>
                        <td>{room.specialtyId?.name || "—"}</td>
                        <td>
                          <span className={`badge badge-status-${room.status}`}>
                            {formatRoomStatus(room.status)}
                          </span>
                        </td>
                        <td className="admin-table-actions-col">
                          <div className="table-row-actions">
                          <button
                            className="btn btn-outline btn-xs"
                            onClick={() => openRoomModal(room)}
                          >
                            Edit
                          </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <AppPagination
              page={roomPagination.page}
              totalPages={roomPagination.totalPages}
              total={roomPagination.total}
              limit={roomFilters.limit}
              itemLabel="clinic rooms"
              onPageChange={(page) => setRoomFilters((f) => ({ ...f, page }))}
            />
          </div>
        </ScrollReveal>
      )}

      
      {!loading && activeTab === "doctors" && (
        <ScrollReveal variant="up" delay={80}>
          <div className="card admin-card">
            <div className="admin-section-bar">
              <span className="admin-section-count">{doctorPagination.total} doctors</span>
            </div>
            <div className="admin-doctors-toolbar">
              <div className="admin-filters-grid admin-doctors-filters">
                <div className="admin-filters-fields">
                  <FilterSearchField
                    id="admin-doctor-search"
                    label="Search by name"
                    placeholder="Search doctors…"
                    value={doctorFilters.name}
                    onChange={(e) => setDoctorFilters((f) => ({ ...f, name: e.target.value, page: 1 }))}
                  />

                  <CustomSelect
                    className="filter-field"
                    label="Status"
                    value={doctorFilters.isActive}
                    onChange={(isActive) => setDoctorFilters((f) => ({ ...f, isActive, page: 1 }))}
                    options={DOCTOR_STATUS_FILTER_OPTIONS}
                  />

                  <CustomSelect
                    className="filter-field"
                    label="Specialty"
                    value={doctorFilters.specialtyId}
                    placeholder="All specialties"
                    onChange={(specialtyId) => setDoctorFilters((f) => ({ ...f, specialtyId, page: 1 }))}
                    options={[
                      { value: "", label: "All specialties" },
                      ...specialties.map((s) => ({ value: s._id, label: s.name })),
                    ]}
                  />

                  <CustomSelect
                    className="filter-field"
                    label="Department"
                    value={doctorFilters.departmentId}
                    placeholder="All departments"
                    onChange={(departmentId) => setDoctorFilters((f) => ({ ...f, departmentId, page: 1 }))}
                    options={[
                      { value: "", label: "All departments" },
                      ...departments.map((d) => ({ value: d._id, label: d.name })),
                    ]}
                  />
                </div>
              </div>

              <div className="admin-filters-actions">
                <button type="button" className="btn btn-outline admin-export-btn" onClick={exportDoctorsToCSV}>
                  <IconDownload className="admin-btn-icon" />
                  Export CSV
                </button>
              </div>
            </div>

            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name doctors</th>
                    <th>Contact info</th>
                    <th>Specialty</th>
                    <th>Department</th>
                    <th>License number</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {doctors.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: "center", padding: "2rem" }}>
                        No doctors match the current criteria.
                      </td>
                    </tr>
                  ) : (
                    doctors.map((doc) => (
                      <tr key={doc._id}>
                        <td><strong>{doc.fullName}</strong></td>
                        <td>
                          <div className="admin-contact-line">
                            <IconMail className="admin-contact-icon" />
                            <span>{doc.email}</span>
                          </div>
                          {doc.phone && (
                            <div className="admin-contact-line admin-contact-line-secondary">
                              <IconPhone className="admin-contact-icon" />
                              <span>{doc.phone}</span>
                            </div>
                          )}
                        </td>
                        <td>{doc.specialty?.name || "—"}</td>
                        <td>{doc.department?.name || "—"}</td>
                        <td><code>{doc.licenseNo}</code></td>
                        <td>
                          <span className={`badge badge-status-${doc.isActive ? "active" : "inactive"}`}>
                            {doc.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            
            <AppPagination
              page={doctorFilters.page}
              totalPages={doctorPagination.totalPages}
              total={doctorPagination.total}
              limit={doctorFilters.limit}
              itemLabel="doctors"
              onPageChange={(page) => setDoctorFilters((f) => ({ ...f, page }))}
            />
          </div>
        </ScrollReveal>
      )}

      
      {!loading && activeTab === "departments" && (
        <ScrollReveal variant="up" delay={80}>
          <div className="card admin-card">
            <div className="admin-section-bar">
              <span className="admin-section-count">{departments.length} departments</span>
            </div>

            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th 
                      onClick={() => handleDeptSort("name")} 
                      className="sortable-header"
                      title="Sort by department name"
                      style={{ cursor: "pointer", userSelect: "none" }}
                    >
                      Name departments 
                      {deptSort.key === "name" && (
                        <span className="sort-indicator">{deptSort.direction === "asc" ? " ▲" : " ▼"}</span>
                      )}
                    </th>
                    <th 
                      onClick={() => handleDeptSort("doctorsCount")} 
                      className="sortable-header"
                      title="Sort by doctor count"
                      style={{ cursor: "pointer", userSelect: "none" }}
                    >
                      Doctor count 
                      {deptSort.key === "doctorsCount" && (
                        <span className="sort-indicator">{deptSort.direction === "asc" ? " ▲" : " ▼"}</span>
                      )}
                    </th>
                    <th 
                      onClick={() => handleDeptSort("location")} 
                      className="sortable-header"
                      title="Sort by location"
                      style={{ cursor: "pointer", userSelect: "none" }}
                    >
                      Location / Building 
                      {deptSort.key === "location" && (
                        <span className="sort-indicator">{deptSort.direction === "asc" ? " ▲" : " ▼"}</span>
                      )}
                    </th>
                    <th>Support phone</th>
                    <th 
                      onClick={() => handleDeptSort("status")} 
                      className="sortable-header"
                      title="Sort by status"
                      style={{ cursor: "pointer", userSelect: "none" }}
                    >
                      Status 
                      {deptSort.key === "status" && (
                        <span className="sort-indicator">{deptSort.direction === "asc" ? " ▲" : " ▼"}</span>
                      )}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[...departments].sort((a, b) => {
                    let compare = 0;
                    if (deptSort.key === "name") {
                      compare = a.name.localeCompare(b.name);
                    } else if (deptSort.key === "doctorsCount") {
                      const countA = allDoctorsForCount.filter(doc => doc.departmentId === a._id || doc.department?._id === a._id).length;
                      const countB = allDoctorsForCount.filter(doc => doc.departmentId === b._id || doc.department?._id === b._id).length;
                      compare = countA - countB;
                    } else if (deptSort.key === "location") {
                      compare = (a.location || "").localeCompare(b.location || "");
                    } else if (deptSort.key === "status") {
                      const statusA = a.isActive ? "Active" : "Inactive";
                      const statusB = b.isActive ? "Active" : "Inactive";
                      compare = statusA.localeCompare(statusB);
                    }
                    return deptSort.direction === "asc" ? compare : -compare;
                  }).map((dept) => {
                    const docCount = allDoctorsForCount.filter(doc => doc.departmentId === dept._id || doc.department?._id === dept._id).length;
                    return (
                      <tr key={dept._id}>
                        <td><strong>{dept.name}</strong></td>
                        <td>
                          <span className="badge badge-role-doctor admin-dept-count">
                            {docCount} doctors
                          </span>
                        </td>
                        <td>{dept.location || "Central building"}</td>
                        <td>{dept.phone || "—"}</td>
                        <td>
                          <span className={`badge badge-status-${dept.isActive ? "active" : "inactive"}`}>
                            {dept.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </ScrollReveal>
      )}

      
      {showAddStaffModal && (
        <div className="modal-backdrop">
          <div className="card modal-card animate-scale" style={{ maxWidth: "520px" }}>
            <h3>Register new user account</h3>
            <p style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)", marginBottom: "1.5rem" }}>
              Register support staff, doctor, patient, or administrator profiles directly. Default status is active.
            </p>
            <form onSubmit={handleAddStaffSubmit} className="form">
              <CustomSelect
                label="System role"
                value={staffForm.role}
                onChange={(role) => setStaffForm((s) => ({ ...s, role }))}
                options={STAFF_ROLE_OPTIONS}
              />

              <label>
                Full name
                <input
                  type="text"
                  required
                  value={staffForm.fullName}
                  onChange={(e) => setStaffForm(s => ({ ...s, fullName: e.target.value }))}
                  placeholder="e.g. John Smith"
                />
              </label>

              <label>
                Email address
                <input
                  type="email"
                  required
                  value={staffForm.email}
                  onChange={(e) => setStaffForm(s => ({ ...s, email: e.target.value }))}
                  placeholder="name@orcaxcare.com"
                />
              </label>

              <label>
                Secure password
                <input
                  type="password"
                  required
                  value={staffForm.password}
                  onChange={(e) => setStaffForm(s => ({ ...s, password: e.target.value }))}
                  placeholder="At least 8 characters (letters and numbers)"
                />
              </label>

              <label>
                Phone number
                <input
                  type="text"
                  value={staffForm.phone}
                  onChange={(e) => setStaffForm(s => ({ ...s, phone: e.target.value }))}
                  placeholder="09XXXXXXXX"
                />
              </label>

              
              {staffForm.role === "doctor" && (
                <fieldset className="form-section animate-fade-in" style={{ padding: "1rem", borderRadius: "10px", marginTop: "1rem", background: "rgba(255, 255, 255, 0.25)" }}>
                  <legend style={{ fontWeight: "bold", fontSize: "0.85rem", color: "var(--color-primary)" }}>Doctor professional details</legend>
                  
                  <label>
                    License number (Code CCHN)
                    <input
                      type="text"
                      required
                      value={staffForm.licenseNo}
                      onChange={(e) => setStaffForm(s => ({ ...s, licenseNo: e.target.value }))}
                      placeholder="e.g. 012345/BYT-CCHN"
                    />
                  </label>

                  <CustomSelect
                    label="Clinical specialty"
                    value={staffForm.specialtyId}
                    placeholder="Select specialty"
                    onChange={(specialtyId) => setStaffForm((s) => ({ ...s, specialtyId }))}
                    options={[
                      { value: "", label: "Select specialty" },
                      ...specialties.map((s) => ({ value: s._id, label: s.name })),
                    ]}
                  />

                  <CustomSelect
                    label="Assigned department"
                    value={staffForm.departmentId}
                    placeholder="Select department"
                    onChange={(departmentId) => setStaffForm((s) => ({ ...s, departmentId }))}
                    options={[
                      { value: "", label: "Select department" },
                      ...departments.map((d) => ({ value: d._id, label: d.name })),
                    ]}
                  />

                  <label>
                    Professional bio
                    <textarea
                      value={staffForm.bio}
                      onChange={(e) => setStaffForm(s => ({ ...s, bio: e.target.value }))}
                      placeholder="Degrees, certifications, specialty summary…"
                      rows={3}
                    />
                  </label>
                </fieldset>
              )}

              
              {staffForm.role === "patient" && (
                <fieldset className="form-section animate-fade-in" style={{ padding: "1rem", borderRadius: "10px", marginTop: "1rem", background: "rgba(255, 255, 255, 0.25)" }}>
                  <legend style={{ fontWeight: "bold", fontSize: "0.85rem", color: "var(--color-primary)" }}>Patient demographic details</legend>
                  
                  <label>
                    Date of birth
                    <input
                      type="date"
                      value={staffForm.dateOfBirth}
                      onChange={(e) => setStaffForm(s => ({ ...s, dateOfBirth: e.target.value }))}
                    />
                  </label>

                  <CustomSelect
                    label="Gender"
                    value={staffForm.gender}
                    onChange={(gender) => setStaffForm((s) => ({ ...s, gender }))}
                    options={GENDER_OPTIONS}
                  />

                  <label>
                    Full address
                    <input
                      type="text"
                      value={staffForm.address}
                      onChange={(e) => setStaffForm(s => ({ ...s, address: e.target.value }))}
                      placeholder="e.g. 123 Main St, District 1, Ho Chi Minh City"
                    />
                  </label>

                  <label>
                    Emergency contact name
                    <input
                      type="text"
                      value={staffForm.emergencyContactName}
                      onChange={(e) => setStaffForm(s => ({ ...s, emergencyContactName: e.target.value }))}
                      placeholder="Relative or guardian name"
                    />
                  </label>

                  <label>
                    Emergency contact phone
                    <input
                      type="text"
                      value={staffForm.emergencyContactPhone}
                      onChange={(e) => setStaffForm(s => ({ ...s, emergencyContactPhone: e.target.value }))}
                      placeholder="09XXXXXXXX"
                    />
                  </label>
                </fieldset>
              )}

              <div className="form-actions" style={{ marginTop: "1.5rem", padding: "1rem 0 0 0" }}>
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                  {actionLoading ? "Registering…" : "Register account"}
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowAddStaffModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      
      {showChangeRoleModal && selectedUser && (
        <div className="modal-backdrop">
          <div className="card modal-card animate-scale" style={{ maxWidth: "520px" }}>
            <h3>Change account role</h3>
            <p style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
              Update information and role for **{selectedUser.fullName}**. This will immediately invalidate all current sessions.
            </p>
            <form onSubmit={handleChangeRoleSubmit} className="form" style={{ marginTop: "1rem" }}>
              <CustomSelect
                label="System role"
                value={roleForm.role}
                onChange={(role) => setRoleForm((r) => ({ ...r, role }))}
                options={SYSTEM_ROLE_OPTIONS}
              />

              {roleForm.role === "doctor" && (
                <fieldset className="form-section animate-fade-in" style={{ padding: "1rem", borderRadius: "10px", marginTop: "1rem" }}>
                  <legend style={{ fontWeight: "bold", fontSize: "0.85rem", color: "var(--color-primary)" }}>License &amp; clinical doctor details</legend>
                  
                  <label>
                    License number (Code CCHN)
                    <input
                      type="text"
                      required
                      value={roleForm.licenseNo}
                      onChange={(e) => setRoleForm(r => ({ ...r, licenseNo: e.target.value }))}
                      placeholder="e.g. 012345/BYT-CCHN"
                    />
                  </label>

                  <CustomSelect
                    label="Clinical specialty"
                    value={roleForm.specialtyId}
                    placeholder="Select specialty"
                    onChange={(specialtyId) => setRoleForm((r) => ({ ...r, specialtyId }))}
                    options={specialties.map((s) => ({ value: s._id, label: s.name }))}
                  />

                  <CustomSelect
                    label="Assigned department"
                    value={roleForm.departmentId}
                    placeholder="Select department"
                    onChange={(departmentId) => setRoleForm((r) => ({ ...r, departmentId }))}
                    options={departments.map((d) => ({ value: d._id, label: d.name }))}
                  />

                  <label>
                    Professional bio
                    <textarea
                      value={roleForm.bio}
                      onChange={(e) => setRoleForm(r => ({ ...r, bio: e.target.value }))}
                      placeholder="Expertise, qualifications, career summary…"
                      rows={3}
                    />
                  </label>
                </fieldset>
              )}

              <div className="form-actions" style={{ marginTop: "1.5rem", padding: "1rem 0 0 0" }}>
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                  {actionLoading ? "Updating…" : "Apply role change"}
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setShowChangeRoleModal(false);
                    setSelectedUser(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      
      {showSpecialtyModal && (
        <div className="modal-backdrop">
          <div className="card modal-card animate-scale">
            <h3>{specialtyForm.id ? "Edit clinical specialty" : "Add clinical specialty"}</h3>
            <form onSubmit={handleSpecialtySubmit} className="form" style={{ marginTop: "1rem" }}>
              <label>
                Specialty code (unique)
                <input
                  type="text"
                  required
                  placeholder="e.g. CARDIOLOGY"
                  value={specialtyForm.code}
                  onChange={(e) => setSpecialtyForm(s => ({ ...s, code: e.target.value }))}
                />
              </label>

              <label>
                Name specialties
                <input
                  type="text"
                  required
                  placeholder="e.g. Cardiology &amp; heart care"
                  value={specialtyForm.name}
                  onChange={(e) => setSpecialtyForm(s => ({ ...s, name: e.target.value }))}
                />
              </label>

              <label>
                Detailed description
                <textarea
                  placeholder="Conditions managed, diagnostic techniques, clinics…"
                  rows={3}
                  value={specialtyForm.description}
                  onChange={(e) => setSpecialtyForm(s => ({ ...s, description: e.target.value }))}
                />
              </label>

              <label className="checkbox-label" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input
                  type="checkbox"
                  checked={specialtyForm.isActive}
                  onChange={(e) => setSpecialtyForm(s => ({ ...s, isActive: e.target.checked }))}
                />
                Active &amp; selectable
              </label>

              <div className="form-actions" style={{ marginTop: "1.5rem", padding: "1rem 0 0 0" }}>
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                  {actionLoading ? "Saving…" : "Save specialty"}
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowSpecialtyModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      
      {showRoomModal && (
        <div className="modal-backdrop">
          <div className="card modal-card animate-scale">
            <h3>{roomForm.id ? "Edit consultation room" : "Register consultation room"}</h3>
            <form onSubmit={handleRoomSubmit} className="form" style={{ marginTop: "1rem" }}>
              <label>
                Room number (unique)
                <input
                  type="text"
                  required
                  placeholder="e.g. Room 104"
                  value={roomForm.roomNumber}
                  onChange={(e) => setRoomForm(r => ({ ...r, roomNumber: e.target.value }))}
                />
              </label>

              <label>
                Room name
                <input
                  type="text"
                  required
                  placeholder="e.g. Diagnostic ultrasound room 1"
                  value={roomForm.name}
                  onChange={(e) => setRoomForm(r => ({ ...r, name: e.target.value }))}
                />
              </label>

              <CustomSelect
                label="Assigned clinical specialty"
                value={roomForm.specialtyId}
                onChange={(specialtyId) => setRoomForm((r) => ({ ...r, specialtyId }))}
                options={specialties.map((s) => ({ value: s._id, label: s.name }))}
              />

              <CustomSelect
                label="Room status"
                value={roomForm.status}
                onChange={(status) => setRoomForm((r) => ({ ...r, status }))}
                options={ROOM_STATUS_OPTIONS}
              />

              <div className="form-actions" style={{ marginTop: "1.5rem", padding: "1rem 0 0 0" }}>
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                  {actionLoading ? "Saving…" : "Save room details"}
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowRoomModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      
      {confirmModal.show && (
        <div className="modal-backdrop">
          <div className="card modal-card animate-scale" style={{ maxWidth: "420px", padding: "1.75rem" }}>
            <h3 style={{ color: "var(--color-error)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "22px", height: "22px", color: "#d70015" }}>
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              {confirmModal.title}
            </h3>
            <p style={{ fontSize: "0.9rem", color: "var(--color-text-secondary)", margin: "1rem 0 1.5rem 0", lineHeight: "1.4" }}>
              {confirmModal.message}
            </p>
            <div className="form-actions" style={{ borderTop: "none", padding: 0 }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ background: "linear-gradient(180deg, #ff4d4d 0%, #d70015 100%)", boxShadow: "0 4px 14px rgba(215, 0, 21, 0.3)" }}
                onClick={() => {
                  if (confirmModal.onConfirm) confirmModal.onConfirm();
                }}
              >
                Confirm deactivation
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setConfirmModal({ show: false, title: "", message: "", onConfirm: null })}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      </AdminLayout>
    </PageLayout>
  );
}

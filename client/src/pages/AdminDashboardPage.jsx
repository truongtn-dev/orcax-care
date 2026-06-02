import { useState, useEffect, useCallback } from "react";
import "./AdminDashboardPage.css";
import PageLayout from "../components/PageLayout.jsx";
import ScrollReveal from "../components/ScrollReveal.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { AdminApiClient } from "../services/adminApi.js";
import { PublicApiClient } from "../services/publicApi.js";
import { getApiErrorMessage } from "../services/api.js";

export default function AdminDashboardPage() {
  const { fullName } = useAuth();
  
  
  const [activeTab, setActiveTab] = useState("accounts"); 

  
  const [specialties, setSpecialties] = useState([]);
  const [departments, setDepartments] = useState([]);

  
  const [users, setUsers] = useState([]);
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
  const [showSpecialtyModal, setShowSpecialtyModal] = useState(false);

  
  const [rooms, setRooms] = useState([]);
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

  useEffect(() => {
    loadMasterData();
  }, [loadMasterData]);

  
  
  
  const loadUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await AdminApiClient.listUsers();
      setUsers(data.items || []);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const loadRooms = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await AdminApiClient.listClinicRooms();
      setRooms(data.items || []);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

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
      loadUsers();
    } else if (activeTab === "specialties") {
      loadMasterData();
    } else if (activeTab === "rooms") {
      loadRooms();
    } else if (activeTab === "doctors") {
      loadDoctors(doctorFilters);
    } else if (activeTab === "departments") {
      loadAllDoctorsForCount();
    }
  }, [activeTab, doctorFilters, loadDoctors, loadMasterData]);

  
  
  

  const handleAddStaffSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setError("");
    setSuccess("");
    try {
      await AdminApiClient.createStaff(staffForm);
      setSuccess(`${staffForm.role.charAt(0).toUpperCase() + staffForm.role.slice(1)} account created successfully!`);
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
      loadUsers();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeactivateUser = (userId) => {
    setConfirmModal({
      show: true,
      title: "Deactivate Account",
      message: "Are you sure you want to deactivate this account? The user will be instantly logged out and their active sessions will be terminated.",
      onConfirm: async () => {
        setActionLoading(true);
        setError("");
        setSuccess("");
        try {
          await AdminApiClient.deactivateUser(userId);
          setSuccess("Account deactivated and all sessions terminated.");
          loadUsers();
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
      loadUsers();
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
      setSuccess("User role updated successfully. Active sessions invalidated.");
      setShowChangeRoleModal(false);
      setSelectedUser(null);
      loadUsers();
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
      loadRooms();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const exportDoctorsToCSV = () => {
    const headers = ["Full Name", "Email", "Phone", "Specialty", "Department", "License Number", "Status"];
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

  return (
    <PageLayout>
      <ScrollReveal variant="up">
        <div className="dashboard-welcome">
          <h1>Admin Portal</h1>
          <p>Welcome, {fullName || "Administrator"}. Securely manage systems, accounts, doctors, and rooms.</p>
          <span className="dashboard-role-badge">Administrator Console</span>
        </div>
      </ScrollReveal>

      
      <ScrollReveal variant="up" delay={50}>
        <div className="tab-menu-container">
          <div className="tab-menu">
            <button
              onClick={() => setActiveTab("accounts")}
              className={`tab-btn ${activeTab === "accounts" ? "tab-btn-active" : ""}`}
            >
              Accounts &amp; Staff
            </button>
            <button
              onClick={() => setActiveTab("specialties")}
              className={`tab-btn ${activeTab === "specialties" ? "tab-btn-active" : ""}`}
            >
              Specialties
            </button>
            <button
              onClick={() => setActiveTab("rooms")}
              className={`tab-btn ${activeTab === "rooms" ? "tab-btn-active" : ""}`}
            >
              Clinic Rooms
            </button>
            <button
              onClick={() => setActiveTab("doctors")}
              className={`tab-btn ${activeTab === "doctors" ? "tab-btn-active" : ""}`}
            >
              Doctors Profile
            </button>
            <button
              onClick={() => setActiveTab("departments")}
              className={`tab-btn ${activeTab === "departments" ? "tab-btn-active" : ""}`}
            >
              Departments
            </button>
          </div>
        </div>
      </ScrollReveal>
      
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
          Loading resources…
        </div>
      )}

      
      {!loading && activeTab === "accounts" && (
        <ScrollReveal variant="up" delay={80}>
          <div className="card admin-card">
            <div className="card-header-flex">
              <div>
                <h2>User System Accounts</h2>
                <p>Register support staff, activate or deactivate accounts, and update roles.</p>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => setShowAddStaffModal(true)}
              >
                + Register Account
              </button>
            </div>

            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Full Name</th>
                    <th>Email Address</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Registered At</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user._id}>
                      <td>
                        <strong>{user.fullName}</strong>
                        {user.phone && <div style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>📞 {user.phone}</div>}
                      </td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`badge badge-role-${user.role}`}>
                          {user.role}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-status-${user.isActive ? "active" : "inactive"}`}>
                          {user.isActive ? "Active" : "Deactivated"}
                        </span>
                      </td>
                      <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td style={{ textAlign: "right" }}>
                        <div className="table-actions">
                          <button
                            className="btn btn-outline btn-xs"
                            onClick={() => openChangeRoleModal(user)}
                          >
                            Change Role
                          </button>
                          {user.isActive ? (
                            <button
                              className="btn btn-outline btn-xs btn-danger"
                              onClick={() => handleDeactivateUser(user._id)}
                            >
                              Deactivate
                            </button>
                          ) : (
                            <button
                              className="btn btn-outline btn-xs btn-success"
                              onClick={() => handleReactivateUser(user._id)}
                            >
                              Reactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </ScrollReveal>
      )}

      
      {!loading && activeTab === "specialties" && (
        <ScrollReveal variant="up" delay={80}>
          <div className="card admin-card">
            <div className="card-header-flex">
              <div>
                <h2>Clinical Specialties</h2>
                <p>Manage medical specialties and classifications.</p>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => openSpecialtyModal()}
              >
                + Add Specialty
              </button>
            </div>

            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Specialty Name</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {specialties.map((spec) => (
                    <tr key={spec._id}>
                      <td><code>{spec.code}</code></td>
                      <td><strong>{spec.name}</strong></td>
                      <td style={{ maxWidth: "300px" }}>{spec.description || <em style={{ color: "var(--color-text-muted)" }}>None</em>}</td>
                      <td>
                        <span className={`badge badge-status-${spec.isActive ? "active" : "inactive"}`}>
                          {spec.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          className="btn btn-outline btn-xs"
                          onClick={() => openSpecialtyModal(spec)}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </ScrollReveal>
      )}

      
      {!loading && activeTab === "rooms" && (
        <ScrollReveal variant="up" delay={80}>
          <div className="card admin-card">
            <div className="card-header-flex">
              <div>
                <h2>Clinic Rooms</h2>
                <p>Track physical clinic consultation rooms and their specialized assignments.</p>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => openRoomModal()}
              >
                + Add Clinic Room
              </button>
            </div>

            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Room Number</th>
                    <th>Room Name</th>
                    <th>Assigned Specialty</th>
                    <th>Current Status</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rooms.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: "center", padding: "2rem" }}>
                        No clinic rooms registered yet.
                      </td>
                    </tr>
                  ) : (
                    rooms.map((room) => (
                      <tr key={room._id}>
                        <td><code>{room.roomNumber}</code></td>
                        <td><strong>{room.name}</strong></td>
                        <td>{room.specialtyId?.name || "N/A"}</td>
                        <td>
                          <span className={`badge badge-status-${room.status}`}>
                            {room.status}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            className="btn btn-outline btn-xs"
                            onClick={() => openRoomModal(room)}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </ScrollReveal>
      )}

      
      {!loading && activeTab === "doctors" && (
        <ScrollReveal variant="up" delay={80}>
          <div className="card admin-card">
            <h2>Doctors Management Console</h2>
            <p>Monitor doctor licenses, clinical departments, specialties, and active states.</p>

            
            <div className="card-header-flex" style={{ margin: "1rem 0", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div className="admin-filters-grid" style={{ marginBottom: 0, flexGrow: 1, gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", width: "80%" }}>
                <label>
                  Search Name
                  <input
                    type="search"
                    placeholder="Search doctor..."
                    value={doctorFilters.name}
                    onChange={(e) => setDoctorFilters(f => ({ ...f, name: e.target.value, page: 1 }))}
                    style={{ padding: "0.42rem 0.75rem", fontSize: "0.9rem" }}
                  />
                </label>

                <label>
                  Status
                  <select
                    value={doctorFilters.isActive}
                    onChange={(e) => setDoctorFilters(f => ({ ...f, isActive: e.target.value, page: 1 }))}
                  >
                    <option value="all">All states</option>
                    <option value="true">Active Only</option>
                    <option value="false">Inactive Only</option>
                  </select>
                </label>

                <label>
                  Specialty
                  <select
                    value={doctorFilters.specialtyId}
                    onChange={(e) => setDoctorFilters(f => ({ ...f, specialtyId: e.target.value, page: 1 }))}
                  >
                    <option value="">All specialties</option>
                    {specialties.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
                </label>

                <label>
                  Department
                  <select
                    value={doctorFilters.departmentId}
                    onChange={(e) => setDoctorFilters(f => ({ ...f, departmentId: e.target.value, page: 1 }))}
                  >
                    <option value="">All departments</option>
                    {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                  </select>
                </label>
              </div>

              <button
                type="button"
                className="btn btn-outline"
                style={{ padding: "0.6rem 1rem", fontSize: "0.85rem", height: "40px", display: "flex", alignItems: "center", gap: "0.25rem", marginTop: "1rem" }}
                onClick={exportDoctorsToCSV}
              >
                📥 Export CSV
              </button>
            </div>

            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Doctor Name</th>
                    <th>Contact Info</th>
                    <th>Specialty</th>
                    <th>Department</th>
                    <th>License Number</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {doctors.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: "center", padding: "2rem" }}>
                        No doctors matching the current criteria found.
                      </td>
                    </tr>
                  ) : (
                    doctors.map((doc) => (
                      <tr key={doc._id}>
                        <td><strong>{doc.fullName}</strong></td>
                        <td>
                          <div>✉️ {doc.email}</div>
                          {doc.phone && <div style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>📞 {doc.phone}</div>}
                        </td>
                        <td>{doc.specialty?.name || "N/A"}</td>
                        <td>{doc.department?.name || "N/A"}</td>
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

            
            {doctorPagination.totalPages > 1 && (
              <div className="pagination" style={{ marginTop: "1.5rem" }}>
                <button
                  type="button"
                  className="btn btn-outline btn-xs"
                  disabled={doctorFilters.page <= 1}
                  onClick={() => setDoctorFilters(f => ({ ...f, page: f.page - 1 }))}
                >
                  Previous
                </button>
                <span className="pagination-info">
                  Page {doctorFilters.page} of {doctorPagination.totalPages}
                </span>
                <button
                  type="button"
                  className="btn btn-outline btn-xs"
                  disabled={doctorFilters.page >= doctorPagination.totalPages}
                  onClick={() => setDoctorFilters(f => ({ ...f, page: f.page + 1 }))}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </ScrollReveal>
      )}

      
      {!loading && activeTab === "departments" && (
        <ScrollReveal variant="up" delay={80}>
          <div className="card admin-card">
            <h2>Clinical Departments &amp; Divisions</h2>
            <p>View all clinics and departments directory. Standard clinic staff and doctors belong to these units.</p>

            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Department Name</th>
                    <th>Doctors Count</th>
                    <th>Location / Block</th>
                    <th>Phone Support</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[...departments].sort((a, b) => a.name.localeCompare(b.name)).map((dept) => {
                    const docCount = allDoctorsForCount.filter(doc => doc.departmentId === dept._id || doc.department?._id === dept._id).length;
                    return (
                      <tr key={dept._id}>
                        <td><strong>{dept.name}</strong></td>
                        <td>
                          <span className="badge badge-role-doctor" style={{ fontSize: "0.8rem", padding: "0.2rem 0.5rem" }}>
                            👤 {docCount} {docCount === 1 ? "Doctor" : "Doctors"}
                          </span>
                        </td>
                        <td>{dept.location || "Central Block"}</td>
                        <td>{dept.phone || "N/A"}</td>
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
            <h3>Register New User Account</h3>
            <p style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)", marginBottom: "1.5rem" }}>
              Register a support staff, doctor, patient or admin profile directly. Default status will be active.
            </p>
            <form onSubmit={handleAddStaffSubmit} className="form">
              <label>
                System Role
                <select
                  value={staffForm.role}
                  onChange={(e) => setStaffForm(s => ({ ...s, role: e.target.value }))}
                  style={{ marginBottom: "1rem" }}
                >
                  <option value="staff">Staff (Support / Receptionist)</option>
                  <option value="patient">Patient (Full demographics)</option>
                  <option value="doctor">Doctor (Specialist)</option>
                  <option value="admin">Administrator</option>
                </select>
              </label>

              <label>
                Full Name
                <input
                  type="text"
                  required
                  value={staffForm.fullName}
                  onChange={(e) => setStaffForm(s => ({ ...s, fullName: e.target.value }))}
                  placeholder="e.g. Nguyễn Văn A"
                />
              </label>

              <label>
                Email Address
                <input
                  type="email"
                  required
                  value={staffForm.email}
                  onChange={(e) => setStaffForm(s => ({ ...s, email: e.target.value }))}
                  placeholder="name@orcaxcare.com"
                />
              </label>

              <label>
                Secure Password
                <input
                  type="password"
                  required
                  value={staffForm.password}
                  onChange={(e) => setStaffForm(s => ({ ...s, password: e.target.value }))}
                  placeholder="Minimum 8 characters (letters & numbers)"
                />
              </label>

              <label>
                Phone Number
                <input
                  type="text"
                  value={staffForm.phone}
                  onChange={(e) => setStaffForm(s => ({ ...s, phone: e.target.value }))}
                  placeholder="09XXXXXXXX"
                />
              </label>

              
              {staffForm.role === "doctor" && (
                <fieldset className="form-section animate-fade-in" style={{ padding: "1rem", borderRadius: "10px", marginTop: "1rem", background: "rgba(255, 255, 255, 0.25)" }}>
                  <legend style={{ fontWeight: "bold", fontSize: "0.85rem", color: "var(--color-primary)" }}>Doctor Professional Details</legend>
                  
                  <label>
                    License Number (Mã CCHN)
                    <input
                      type="text"
                      required
                      value={staffForm.licenseNo}
                      onChange={(e) => setStaffForm(s => ({ ...s, licenseNo: e.target.value }))}
                      placeholder="e.g. 012345/BYT-CCHN"
                    />
                  </label>

                  <label>
                    Clinical Specialty
                    <select
                      value={staffForm.specialtyId}
                      onChange={(e) => setStaffForm(s => ({ ...s, specialtyId: e.target.value }))}
                    >
                      <option value="">Select Specialty</option>
                      {specialties.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>
                  </label>

                  <label>
                    Assigned Department
                    <select
                      value={staffForm.departmentId}
                      onChange={(e) => setStaffForm(s => ({ ...s, departmentId: e.target.value }))}
                    >
                      <option value="">Select Department</option>
                      {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                    </select>
                  </label>

                  <label>
                    Professional Bio
                    <textarea
                      value={staffForm.bio}
                      onChange={(e) => setStaffForm(s => ({ ...s, bio: e.target.value }))}
                      placeholder="Degrees, professional credentials, expertise summary…"
                      rows={3}
                    />
                  </label>
                </fieldset>
              )}

              
              {staffForm.role === "patient" && (
                <fieldset className="form-section animate-fade-in" style={{ padding: "1rem", borderRadius: "10px", marginTop: "1rem", background: "rgba(255, 255, 255, 0.25)" }}>
                  <legend style={{ fontWeight: "bold", fontSize: "0.85rem", color: "var(--color-primary)" }}>Patient Demographic Demands</legend>
                  
                  <label>
                    Date of Birth
                    <input
                      type="date"
                      value={staffForm.dateOfBirth}
                      onChange={(e) => setStaffForm(s => ({ ...s, dateOfBirth: e.target.value }))}
                    />
                  </label>

                  <label>
                    Gender
                    <select
                      value={staffForm.gender}
                      onChange={(e) => setStaffForm(s => ({ ...s, gender: e.target.value }))}
                    >
                      <option value="">Prefer not to say</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </label>

                  <label>
                    Full Address
                    <input
                      type="text"
                      value={staffForm.address}
                      onChange={(e) => setStaffForm(s => ({ ...s, address: e.target.value }))}
                      placeholder="e.g. 123 Nguyen Hue, District 1, HCMC"
                    />
                  </label>

                  <label>
                    Emergency Contact Name
                    <input
                      type="text"
                      value={staffForm.emergencyContactName}
                      onChange={(e) => setStaffForm(s => ({ ...s, emergencyContactName: e.target.value }))}
                      placeholder="Guardian or relative name"
                    />
                  </label>

                  <label>
                    Emergency Contact Phone
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
                  {actionLoading ? "Registering…" : "Register Account"}
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
            <h3>Change Account Role</h3>
            <p style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
              Update credentials and role for **{selectedUser.fullName}**. This action immediately invalidates all their current sessions.
            </p>
            <form onSubmit={handleChangeRoleSubmit} className="form" style={{ marginTop: "1rem" }}>
              <label>
                System Role
                <select
                  value={roleForm.role}
                  onChange={(e) => setRoleForm(r => ({ ...r, role: e.target.value }))}
                >
                  <option value="patient">Patient</option>
                  <option value="staff">Staff</option>
                  <option value="doctor">Doctor</option>
                  <option value="admin">Administrator</option>
                </select>
              </label>

              {roleForm.role === "doctor" && (
                <fieldset className="form-section animate-fade-in" style={{ padding: "1rem", borderRadius: "10px", marginTop: "1rem" }}>
                  <legend style={{ fontWeight: "bold", fontSize: "0.85rem", color: "var(--color-primary)" }}>Doctor License &amp; Clinical Details</legend>
                  
                  <label>
                    License Number (Mã CCHN)
                    <input
                      type="text"
                      required
                      value={roleForm.licenseNo}
                      onChange={(e) => setRoleForm(r => ({ ...r, licenseNo: e.target.value }))}
                      placeholder="e.g. 012345/BYT-CCHN"
                    />
                  </label>

                  <label>
                    Clinical Specialty
                    <select
                      value={roleForm.specialtyId}
                      onChange={(e) => setRoleForm(r => ({ ...r, specialtyId: e.target.value }))}
                    >
                      {specialties.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>
                  </label>

                  <label>
                    Assigned Department
                    <select
                      value={roleForm.departmentId}
                      onChange={(e) => setRoleForm(r => ({ ...r, departmentId: e.target.value }))}
                    >
                      {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                    </select>
                  </label>

                  <label>
                    Professional Bio
                    <textarea
                      value={roleForm.bio}
                      onChange={(e) => setRoleForm(r => ({ ...r, bio: e.target.value }))}
                      placeholder="Specialty expertise, degrees, professional career summary…"
                      rows={3}
                    />
                  </label>
                </fieldset>
              )}

              <div className="form-actions" style={{ marginTop: "1.5rem", padding: "1rem 0 0 0" }}>
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                  {actionLoading ? "Updating Role…" : "Apply Role Change"}
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
            <h3>{specialtyForm.id ? "Edit Clinical Specialty" : "Add Clinical Specialty"}</h3>
            <form onSubmit={handleSpecialtySubmit} className="form" style={{ marginTop: "1rem" }}>
              <label>
                Specialty Code (Unique)
                <input
                  type="text"
                  required
                  placeholder="e.g. CARDIOLOGY"
                  value={specialtyForm.code}
                  onChange={(e) => setSpecialtyForm(s => ({ ...s, code: e.target.value }))}
                />
              </label>

              <label>
                Specialty Name
                <input
                  type="text"
                  required
                  placeholder="e.g. Cardiology &amp; Heart Care"
                  value={specialtyForm.name}
                  onChange={(e) => setSpecialtyForm(s => ({ ...s, name: e.target.value }))}
                />
              </label>

              <label>
                Detailed Description
                <textarea
                  placeholder="Medical conditions managed, diagnostic techniques, clinic rooms…"
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
                Is Active &amp; Selectable
              </label>

              <div className="form-actions" style={{ marginTop: "1.5rem", padding: "1rem 0 0 0" }}>
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                  {actionLoading ? "Saving…" : "Save Specialty"}
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
            <h3>{roomForm.id ? "Edit Clinic Consultation Room" : "Register Clinic Consultation Room"}</h3>
            <form onSubmit={handleRoomSubmit} className="form" style={{ marginTop: "1rem" }}>
              <label>
                Room Number (Unique)
                <input
                  type="text"
                  required
                  placeholder="e.g. Room 104"
                  value={roomForm.roomNumber}
                  onChange={(e) => setRoomForm(r => ({ ...r, roomNumber: e.target.value }))}
                />
              </label>

              <label>
                Room Name
                <input
                  type="text"
                  required
                  placeholder="e.g. Ultrasound Diagnostic Clinic 1"
                  value={roomForm.name}
                  onChange={(e) => setRoomForm(r => ({ ...r, name: e.target.value }))}
                />
              </label>

              <label>
                Assigned Clinical Specialty
                <select
                  value={roomForm.specialtyId}
                  onChange={(e) => setRoomForm(r => ({ ...r, specialtyId: e.target.value }))}
                >
                  {specialties.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </label>

              <label>
                Room Status
                <select
                  value={roomForm.status}
                  onChange={(e) => setRoomForm(r => ({ ...r, status: e.target.value }))}
                >
                  <option value="active">Active (Available)</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>

              <div className="form-actions" style={{ marginTop: "1.5rem", padding: "1rem 0 0 0" }}>
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                  {actionLoading ? "Saving…" : "Save Room Details"}
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
                Confirm Deactivation
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

      
    </PageLayout>
  );
}

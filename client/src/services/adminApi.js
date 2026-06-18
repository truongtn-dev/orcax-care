import { api } from "./api.js";

export const AdminApiClient = {
  getDashboard(params) {
    return api.get("/api/admin/dashboard", { params });
  },

  listAccounts(params) {
    return api.get("/api/admin/accounts", { params });
  },

  createAccount(payload) {
    return api.post("/api/admin/accounts", payload);
  },

  getAccount(id) {
    return api.get(`/api/admin/accounts/${id}`);
  },

  updateAccount(id, payload) {
    return api.put(`/api/admin/accounts/${id}`, payload);
  },

  getSpecialties(params) {
    return api.get("/api/admin/specialties", { params });
  },

  listSpecialties(params) {
    return api.get("/api/admin/specialties", { params });
  },

  getDepartments(params) {
    return api.get("/api/admin/departments", { params });
  },

  createDepartment(payload) {
    return api.post("/api/admin/departments", payload);
  },

  getDepartment(id) {
    return api.get(`/api/admin/departments/${id}`);
  },

  updateDepartment(id, payload) {
    return api.put(`/api/admin/departments/${id}`, payload);
  },

  deactivateDepartment(id) {
    return api.put(`/api/admin/departments/${id}/deactivate`);
  },

  getDoctors(params) {
    return api.get("/api/admin/doctors", { params });
  },

  getDoctor(id) {
    return api.get(`/api/admin/doctors/${id}`);
  },

  updateDoctor(id, payload) {
    return api.put(`/api/admin/doctors/${id}`, payload);
  },

  getPatients(params) {
    return api.get("/api/admin/patients", { params });
  },

  getPatient(id) {
    return api.get(`/api/admin/patients/${id}`);
  },

  updatePatient(id, payload) {
    return api.put(`/api/admin/patients/${id}`, payload);
  },

  createStaff(payload) {
    return api.post("/api/admin/staff", payload);
  },

  listUsers() {
    return api.get("/api/admin/users");
  },

  changeRole(userId, role, extraProfileData = {}) {
    return api.put(`/api/admin/users/${userId}/role`, { role, ...extraProfileData });
  },

  deactivateUser(userId) {
    return api.put(`/api/admin/users/${userId}/deactivate`);
  },

  reactivateUser(userId) {
    return api.put(`/api/admin/users/${userId}/reactivate`);
  },

  createSpecialty(payload) {
    return api.post("/api/admin/specialties", payload);
  },

  updateSpecialty(id, payload) {
    return api.put(`/api/admin/specialties/${id}`, payload);
  },

  deleteSpecialty(id) {
    return api.delete(`/api/admin/specialties/${id}`);
  },

  listClinicRoomDepartments() {
    return api.get("/api/admin/clinic-rooms/departments");
  },

  listClinicRooms(params) {
    return api.get("/api/admin/clinic-rooms", { params });
  },

  createClinicRoom(payload) {
    return api.post("/api/admin/clinic-rooms", payload);
  },

  updateClinicRoom(id, payload) {
    return api.put(`/api/admin/clinic-rooms/${id}`, payload);
  },

  listDoctors(params) {
    return api.get("/api/admin/doctors", { params });
  },

  createWorkShift(payload) {
    return api.post("/api/admin/work-shifts", payload);
  },

  previewWorkShift(payload) {
    return api.post("/api/admin/work-shifts/preview", payload);
  },

  listWorkShifts(params) {
    return api.get("/api/admin/work-shifts", { params });
  },

  getWorkShift(id) {
    return api.get(`/api/admin/work-shifts/${id}`);
  },

  getDeleteShiftImpact(id) {
    return api.get(`/api/admin/work-shifts/${id}/delete-impact`);
  },

  updateWorkShift(id, payload) {
    return api.put(`/api/admin/work-shifts/${id}`, payload);
  },

  deleteWorkShift(id) {
    return api.delete(`/api/admin/work-shifts/${id}`);
  },

  previewAppointmentSlots(payload) {
    return api.post("/api/admin/appointment-slots/preview", payload);
  },

  generateAppointmentSlots(payload) {
    return api.post("/api/admin/appointment-slots/generate", payload);
  },
};

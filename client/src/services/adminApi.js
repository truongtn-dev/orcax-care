import { api } from "./api.js";

export const AdminApiClient = {
  getAccount(id) {
    return api.get(`/api/admin/accounts/${id}`);
  },

  updateAccount(id, payload) {
    return api.put(`/api/admin/accounts/${id}`, payload);
  },

  getSpecialties(params) {
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
};

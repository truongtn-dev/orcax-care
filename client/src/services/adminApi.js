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

  createDepartment(payload) {
    return api.post("/api/admin/departments", payload);
  },

  getDepartment(id) {
    return api.get(`/api/admin/departments/${id}`);
  },
};

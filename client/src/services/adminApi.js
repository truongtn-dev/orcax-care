import { api } from "./api.js";

export const AdminApiClient = {
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

  listClinicRooms() {
    return api.get("/api/admin/clinic-rooms");
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
};

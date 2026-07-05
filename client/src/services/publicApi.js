import { api } from "./api.js";

export const PublicApiClient = {
  getSpecialties() {
    return api.get("/api/public/specialties");
  },

  getDepartments() {
    return api.get("/api/public/departments");
  },

  searchDoctors(params) {
    return api.get("/api/public/doctors", { params });
  },

  getFeaturedDoctors(limit = 6) {
    return api.get("/api/public/doctors/featured", { params: { limit } });
  },

  getDoctor(id) {
    return api.get(`/api/public/doctors/${id}`);
  },

  getDoctorAvailability(id, params) {
    return api.get(`/api/public/doctors/${id}/availability`, { params });
  },

  listDoctorReviews(id, params) {
    return api.get(`/api/public/doctors/${id}/reviews`, { params });
  },

  listBranches() {
    return api.get("/api/public/branches");
  },

  getBranch(id) {
    return api.get(`/api/public/branches/${id}`);
  },
};

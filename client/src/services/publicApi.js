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
};

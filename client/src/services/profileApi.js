import { api } from "./api.js";

export const ProfileApiClient = {
  getProfile() {
    return api.get("/api/profile");
  },

  updateProfile(payload) {
    return api.put("/api/profile", payload);
  },
};

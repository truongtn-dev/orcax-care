import { api } from "./api.js";

export const NotificationApiClient = {
  listNotifications(params) {
    return api.get("/api/patient/notifications", { params });
  },

  markNotificationRead(id) {
    return api.put(`/api/patient/notifications/${id}/read`);
  },
};

import { api } from "./api.js";

export const NotificationApiClient = {
  listNotifications(params) {
    return api.get("/api/patient/notifications", { params });
  },

  markNotificationRead(id) {
    return api.put(`/api/patient/notifications/${id}/read`);
  },

  getPushSubscription() {
    return api.get("/api/patient/push-subscription");
  },

  savePushSubscription(payload) {
    return api.post("/api/patient/push-subscription", payload);
  },

  deactivatePushSubscription() {
    return api.delete("/api/patient/push-subscription");
  },
};

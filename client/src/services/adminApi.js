import { api } from "./api.js";

export const AdminApiClient = {
  getAccount(id) {
    return api.get(`/api/admin/accounts/${id}`);
  },

  updateAccount(id, payload) {
    return api.put(`/api/admin/accounts/${id}`, payload);
  },
};

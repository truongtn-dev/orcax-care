import { api } from "./api.js";

export const PatientApiClient = {
  getWallet(params) {
    return api.get("/api/patient/wallet", { params });
  },

  createPayosTopup(payload) {
    return api.post("/api/patient/wallet/topups/payos", payload);
  },

  confirmMockPayosTopup(payload) {
    return api.post("/api/patient/wallet/payos/mock-confirm", payload);
  },

  getTopupReceipt(orderCode) {
    return api.get(`/api/patient/wallet/receipts/${orderCode}`);
  },
};

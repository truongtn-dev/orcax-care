import { api } from "./api.js";

export const PatientApiClient = {
  getWallet(params) {
    return api.get("/api/patient/wallet", { params });
  },

  createPayosTopup(payload) {
    return api.post("/api/patient/wallet/topups/payos", payload);
  },

  createMomoTopup(payload) {
    return api.post("/api/patient/wallet/topups/momo", payload);
  },

  confirmMockPayosTopup(payload) {
    return api.post("/api/patient/wallet/payos/mock-confirm", payload);
  },

  confirmMockMomoTopup(payload) {
    return api.post("/api/patient/wallet/momo/mock-confirm", payload);
  },

  getTopupReceipt(ref) {
    return api.get(`/api/patient/wallet/receipts/${ref}`);
  },

  listInsuranceCards() {
    return api.get("/api/patient/insurance-cards");
  },

  createInsuranceCard(payload) {
    return api.post("/api/patient/insurance-cards", payload);
  },
};

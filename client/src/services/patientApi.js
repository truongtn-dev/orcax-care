import { api } from "./api.js";

export const PatientApiClient = {
  getWallet(params) {
    return api.get("/api/patient/wallet", { params });
  },

  createPayosTopup(payload) {
    return api.post("/api/patient/wallet/topups/payos", payload);
  },

  createVnpayTopup(payload) {
    return api.post("/api/patient/wallet/topups/vnpay", payload);
  },

  createSepayTopup(payload) {
    return api.post("/api/patient/wallet/topups/sepay", payload);
  },

  confirmMockPayosTopup(payload) {
    return api.post("/api/patient/wallet/payos/mock-confirm", payload);
  },

  confirmMockVnpayTopup(payload) {
    return api.post("/api/patient/wallet/vnpay/mock-confirm", payload);
  },

  confirmMockSepayTopup(payload) {
    return api.post("/api/patient/wallet/sepay/mock-confirm", payload);
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

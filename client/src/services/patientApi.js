import { api } from "./api.js";

export const PatientApiClient = {
  listFavoriteDoctors() {
    return api.get("/api/patient/favorites");
  },

  addFavoriteDoctor(doctorId) {
    return api.post(`/api/patient/favorites/${doctorId}`);
  },

  removeFavoriteDoctor(doctorId) {
    return api.delete(`/api/patient/favorites/${doctorId}`);
  },

  getWallet(params) {
    return api.get("/api/patient/wallet", { params });
  },

  createPayosTopup(payload) {
    return api.post("/api/patient/wallet/topups/payos", payload);
  },

  createSepayTopup(payload) {
    return api.post("/api/patient/wallet/topups/sepay", payload);
  },

  confirmMockPayosTopup(payload) {
    return api.post("/api/patient/wallet/payos/mock-confirm", payload);
  },

  confirmMockSepayTopup(payload) {
    return api.post("/api/patient/wallet/sepay/mock-confirm", payload);
  },

  getTopupCheckout(provider, ref) {
    return api.get(`/api/patient/wallet/topups/${provider}/${ref}/checkout`);
  },

  cancelTopup(provider, ref) {
    return api.post(`/api/patient/wallet/topups/${provider}/${ref}/cancel`);
  },

  getTopupStatus(provider, ref) {
    return api.get(`/api/patient/wallet/topups/${provider}/${ref}/status`);
  },

  getTopupReceipt(ref) {
    return api.get(`/api/patient/wallet/receipts/${ref}`);
  },

  listAppointments(params) {
    return api.get("/api/patient/appointments", { params });
  },

  getAppointment(id) {
    return api.get(`/api/patient/appointments/${id}`);
  },

  createAppointment(payload) {
    return api.post("/api/patient/appointments", payload);
  },

  rescheduleAppointment(id, payload) {
    return api.put(`/api/patient/appointments/${id}/reschedule`, payload);
  },

  listInsuranceCards() {
    return api.get("/api/patient/insurance-cards");
  },

  createInsuranceCard(payload) {
    return api.post("/api/patient/insurance-cards", payload);
  },

  extractInsuranceCardOcr(payload) {
    return api.post("/api/patient/insurance-cards/ocr", payload);
  },
};

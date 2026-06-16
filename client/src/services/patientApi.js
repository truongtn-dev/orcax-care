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

  listInsuranceCards() {
    return api.get("/api/patient/insurance-cards");
  },

  createInsuranceCard(payload) {
    return api.post("/api/patient/insurance-cards", payload);
  },

  getDoctorSlots(doctorId) {
    return api.get(`/api/patient/doctors/${doctorId}/slots`);
  },

  listAppointments() {
    return api.get("/api/patient/appointments");
  },

  bookAppointment(payload) {
    return api.post("/api/patient/appointments", payload);
  },

  // cancelAppointment(id, payload) {
  //   return api.post(`/api/patient/appointments/${id}/cancel`, payload);
  // },

  rateAppointment(id, payload) {
    return api.post(`/api/patient/appointments/${id}/rate`, payload);
  },
};

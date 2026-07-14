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
    return api.post("/api/patient/wallet/topups/payos/mock-confirm", payload);
  },

  confirmMockSepayTopup(payload) {
    return api.post("/api/patient/wallet/topups/sepay/mock-confirm", payload);
  },

  getTopupCheckout(provider, ref) {
    return api.get(`/api/patient/wallet/topups/${provider}/${ref}/checkout`);
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

  previewAppointmentFee(params) {
    return api.get("/api/patient/appointments/fee-preview", { params });
  },

  rescheduleAppointment(id, payload) {
    return api.put(`/api/patient/appointments/${id}/reschedule`, payload);
  },

  rateAppointment(id, payload) {
    return api.post(`/api/patient/appointments/${id}/rate`, payload);
  },

  cancelAppointment(id, payload) {
    return api.post(`/api/patient/appointments/${id}/cancel`, payload);
  },

  listEmrTimeline(params) {
    return api.get("/api/patient/emr/timeline", { params });
  },

  getPrescription(id) {
    return api.get(`/api/patient/prescriptions/${id}`);
  },

  listInsuranceCards() {
    return api.get("/api/patient/insurance-cards");
  },

  createInsuranceCard(payload) {
    return api.post("/api/patient/insurance-cards", payload);
  },

  updateInsuranceCard(id, payload) {
    return api.put(`/api/patient/insurance-cards/${id}`, payload);
  },

  deleteInsuranceCard(id) {
    return api.delete(`/api/patient/insurance-cards/${id}`);
  },

  extractInsuranceCardOcr(payload) {
    return api.post("/api/patient/insurance-cards/ocr", payload);
  },

  listComplaints(params) {
    return api.get("/api/patient/complaints", { params });
  },

  createComplaint(payload) {
    return api.post("/api/patient/complaints", payload);
  },
};

import { api } from "./api.js";

export const DoctorApiClient = {
  listWorkShifts(params) {
    return api.get("/api/doctor/work-shifts", { params });
  },

  getSchedule(params) {
    return api.get("/api/doctor/schedule", { params });
  },

  listTodayAppointments(params) {
    return api.get("/api/doctor/appointments/today", { params });
  },

  getAppointment(id) {
    return api.get(`/api/doctor/appointments/${id}`);
  },

  getEncounter(id) {
    return api.get(`/api/doctor/encounters/${id}`);
  },

  updateEncounter(id, payload) {
    return api.put(`/api/doctor/encounters/${id}`, payload);
  },

  signOffEncounter(id) {
    return api.post(`/api/doctor/encounters/${id}/sign-off`);
  },

  deleteMedicalImage(id) {
    return api.delete(`/api/doctor/medical-images/${id}`);
  },

  uploadMedicalImage(encounterId, payload) {
    return api.post(`/api/doctor/encounters/${encounterId}/medical-images`, payload);
  },

  listMedicines(params) {
    return api.get("/api/doctor/medicines", { params });
  },

  createPrescription(encounterId, payload) {
    return api.post(`/api/doctor/encounters/${encounterId}/prescriptions`, payload);
  },

  getPrescription(id) {
    return api.get(`/api/doctor/prescriptions/${id}`);
  },

  removePrescriptionLineItem(prescriptionId, itemId) {
    return api.delete(`/api/doctor/prescriptions/${prescriptionId}/items/${itemId}`);
  },

  getAppointmentSlot(id) {
    return api.get(`/api/doctor/appointment-slots/${id}`);
  },

  blockAppointmentSlot(id) {
    return api.put(`/api/doctor/appointment-slots/${id}/block`);
  },

  unblockAppointmentSlot(id) {
    return api.put(`/api/doctor/appointment-slots/${id}/unblock`);
  },
};

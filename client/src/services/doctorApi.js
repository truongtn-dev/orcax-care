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

  startConsultation(appointmentId) {
    return api.post(`/api/doctor/appointments/${appointmentId}/start-consultation`);
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

  updatePrescriptionLineItem(prescriptionId, itemId, payload) {
    return api.put(`/api/doctor/prescriptions/${prescriptionId}/items/${itemId}`, payload);
  },

  addPrescriptionLineItem(prescriptionId, payload) {
    return api.post(`/api/doctor/prescriptions/${prescriptionId}/items`, payload);
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

  searchIcd10(params) {
    return api.get("/api/doctor/icd10", { params });
  },

  addDiagnosis(encounterId, payload) {
    return api.post(`/api/doctor/encounters/${encounterId}/diagnoses`, payload);
  },

  updateDiagnosis(encounterId, code, payload) {
    return api.put(`/api/doctor/encounters/${encounterId}/diagnoses/${encodeURIComponent(code)}`, payload);
  },

  removeDiagnosis(encounterId, code) {
    return api.delete(`/api/doctor/encounters/${encounterId}/diagnoses/${encodeURIComponent(code)}`);
  },

  getPrescriptionForEncounter(encounterId) {
    return api.get(`/api/doctor/encounters/${encounterId}/prescription`);
  },

  listPrescriptions(params) {
    return api.get("/api/doctor/prescriptions", { params });
  },
};

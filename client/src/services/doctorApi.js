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

import { api } from "./api.js";

export const QueueApiClient = {
  listDoctorRooms() {
    return api.get("/api/doctor/queue/rooms");
  },

  getDoctorActiveSession() {
    return api.get("/api/queue/sessions/me");
  },

  getSession(sessionId) {
    return api.get(`/api/queue/sessions/${sessionId}`);
  },

  openSession(payload) {
    return api.post("/api/queue/sessions/open", payload);
  },

  callNext(sessionId) {
    return api.post(`/api/queue/sessions/${sessionId}/call-next`);
  },

  recallTicket(sessionId) {
    return api.post(`/api/queue/sessions/${sessionId}/recall`);
  },

  markSkipped(sessionId, ticketId) {
    return api.post(`/api/queue/sessions/${sessionId}/tickets/${ticketId}/skip`);
  },

  pauseSession(sessionId) {
    return api.post(`/api/queue/sessions/${sessionId}/pause`);
  },

  resumeSession(sessionId) {
    return api.post(`/api/queue/sessions/${sessionId}/resume`);
  },

  closeSession(sessionId) {
    return api.post(`/api/queue/sessions/${sessionId}/close`);
  },

  getMyQueueStatus() {
    return api.get("/api/queue/my-status");
  },

  getQueueBoard(roomId) {
    return api.get(`/api/queue/board/${roomId}`);
  },

  listTodayCheckinAppointments() {
    return api.get("/api/staff/checkin/today");
  },

  getTodayCheckinOverview(query) {
    return api.get("/api/staff/checkin/today", { params: query ? { q: query } : {} });
  },

  searchCheckinAppointments(query) {
    return api.get("/api/staff/checkin/search", { params: { q: query } });
  },

  issueAllTickets() {
    return api.post("/api/staff/checkin/issue-all");
  },

  issueTicket(appointmentId) {
    return api.post(`/api/staff/checkin/${appointmentId}/issue-ticket`);
  },
};

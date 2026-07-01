import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL || (typeof window !== "undefined" ? window.location.origin : "");

let socketInstance = null;

export function getQueueSocket() {
  if (!socketInstance) {
    socketInstance = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      withCredentials: true,
    });
  }
  return socketInstance;
}

export function joinQueueRoom(roomId) {
  if (!roomId) return;
  getQueueSocket().emit("queue:join-room", roomId);
}

export function joinQueueSession(sessionId) {
  if (!sessionId) return;
  getQueueSocket().emit("queue:join-session", sessionId);
}

export function joinQueuePatient(patientUserId) {
  if (!patientUserId) return;
  getQueueSocket().emit("queue:join-patient", patientUserId);
}

export function disconnectQueueSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}

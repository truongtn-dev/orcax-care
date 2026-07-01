import { Server } from "socket.io";

let ioInstance = null;

export function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    socket.on("queue:join-room", (roomId) => {
      if (roomId) socket.join(roomChannel(roomId));
    });

    socket.on("queue:join-session", (sessionId) => {
      if (sessionId) socket.join(sessionChannel(sessionId));
    });

    socket.on("queue:join-patient", (patientUserId) => {
      if (patientUserId) socket.join(patientChannel(patientUserId));
    });
  });

  ioInstance = io;
  return io;
}

export function getIo() {
  return ioInstance;
}

export function roomChannel(roomId) {
  return `queue:room:${roomId}`;
}

export function sessionChannel(sessionId) {
  return `queue:session:${sessionId}`;
}

export function patientChannel(patientUserId) {
  return `queue:patient:${patientUserId}`;
}

export function emitQueueEvent(targets, event, payload) {
  const io = getIo();
  if (!io) return;

  if (targets.roomId) {
    io.to(roomChannel(targets.roomId)).emit(event, payload);
  }
  if (targets.sessionId) {
    io.to(sessionChannel(targets.sessionId)).emit(event, payload);
  }
  if (targets.patientUserId) {
    io.to(patientChannel(targets.patientUserId)).emit(event, payload);
  }
}

import { Router } from "express";
import * as QueueController from "../controllers/queue.controller.js";
import { authMiddleware, requireRole } from "../middlewares/auth.middleware.js";
import { requireDatabase } from "../middlewares/requireDatabase.js";

export const queueRouter = Router();

queueRouter.use(requireDatabase);

queueRouter.get("/board/:roomId", QueueController.getQueueBoard);

queueRouter.get("/my-status", authMiddleware, requireRole("patient"), QueueController.getMyQueueStatus);

queueRouter.get(
  "/sessions/me",
  authMiddleware,
  requireRole("doctor"),
  QueueController.getDoctorActiveSession
);

queueRouter.get(
  "/sessions/:id",
  authMiddleware,
  requireRole("doctor", "staff", "admin"),
  QueueController.getSession
);

queueRouter.post("/sessions/open", authMiddleware, requireRole("doctor"), QueueController.openSession);

queueRouter.post(
  "/sessions/:id/call-next",
  authMiddleware,
  requireRole("doctor"),
  QueueController.callNext
);

queueRouter.post(
  "/sessions/:id/recall",
  authMiddleware,
  requireRole("doctor"),
  QueueController.recallTicket
);

queueRouter.post(
  "/sessions/:id/tickets/:ticketId/skip",
  authMiddleware,
  requireRole("doctor"),
  QueueController.markSkipped
);

queueRouter.post(
  "/sessions/:id/pause",
  authMiddleware,
  requireRole("doctor"),
  QueueController.pauseSession
);

queueRouter.post(
  "/sessions/:id/resume",
  authMiddleware,
  requireRole("doctor"),
  QueueController.resumeSession
);

queueRouter.post(
  "/sessions/:id/close",
  authMiddleware,
  requireRole("doctor"),
  QueueController.closeSession
);

export const doctorQueueRouter = Router();

doctorQueueRouter.use(requireDatabase, authMiddleware, requireRole("doctor"));
doctorQueueRouter.get("/rooms", QueueController.listDoctorRooms);

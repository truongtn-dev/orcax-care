import { Router } from "express";
import * as ProfileController from "../controllers/profile.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { requireDatabase } from "../middlewares/requireDatabase.js";

export const profileRouter = Router();

profileRouter.use(requireDatabase);
profileRouter.use(authMiddleware);

profileRouter.get("/", ProfileController.getProfile);
profileRouter.put("/", ProfileController.updateProfile);

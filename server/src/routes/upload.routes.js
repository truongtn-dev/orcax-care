import { Router } from "express";
import * as UploadController from "../controllers/upload.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { requireDatabase } from "../middlewares/requireDatabase.js";

export const uploadRouter = Router();

uploadRouter.use(requireDatabase);
uploadRouter.use(authMiddleware);

uploadRouter.get("/cloudinary-config", UploadController.getCloudinaryConfig);
uploadRouter.post("/image", UploadController.uploadImage);

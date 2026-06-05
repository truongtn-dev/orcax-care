import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as AuthController from "../controllers/auth.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { requireDatabase } from "../middlewares/requireDatabase.js";

export const authRouter = Router();

const resendLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { message: "Quá nhiều yêu cầu. Vui lòng thử lại sau." },
});

authRouter.use(requireDatabase);

authRouter.post("/login", AuthController.login);
authRouter.post("/register", AuthController.register);
authRouter.post("/forgot-password", AuthController.forgotPassword);
authRouter.post("/reset-password", AuthController.resetPassword);
authRouter.get("/verify-email", AuthController.verifyEmail);
authRouter.post("/resend-verification", resendLimiter, AuthController.resendVerification);
authRouter.post("/logout", authMiddleware, AuthController.logout);
authRouter.put("/change-password", authMiddleware, AuthController.changePassword);
authRouter.get("/me", authMiddleware, AuthController.me);

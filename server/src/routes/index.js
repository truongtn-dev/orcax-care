import { Router } from "express";
import { authRouter } from "./auth.routes.js";
import { publicRouter } from "./public.routes.js";
import { profileRouter } from "./profile.routes.js";

export const apiRouter = Router();

apiRouter.get("/", (req, res) => {
  res.json({ ok: true, message: "OrcaXCare API" });
});

apiRouter.use("/auth", authRouter);
apiRouter.use("/profile", profileRouter);
apiRouter.use("/public", publicRouter);

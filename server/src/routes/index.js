import { Router } from "express";
import { adminRouter } from "./admin.routes.js";
import { authRouter } from "./auth.routes.js";
import { publicRouter } from "./public.routes.js";
import { profileRouter } from "./profile.routes.js";
import { doctorRouter } from "./doctor.routes.js";

export const apiRouter = Router();

apiRouter.get("/", (req, res) => {
  res.json({ ok: true, message: "OrcaXCare API" });
});

apiRouter.use("/auth", authRouter);
apiRouter.use("/admin", adminRouter);
apiRouter.use("/profile", profileRouter);
apiRouter.use("/doctor", doctorRouter);
apiRouter.use("/public", publicRouter);

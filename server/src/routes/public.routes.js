import { Router } from "express";
import * as PublicController from "../controllers/public.controller.js";
import { requireDatabase } from "../middlewares/requireDatabase.js";

export const publicRouter = Router();

publicRouter.use(requireDatabase);

publicRouter.get("/specialties", PublicController.listSpecialties);
publicRouter.get("/departments", PublicController.listDepartments);
publicRouter.get("/doctors/featured", PublicController.listFeaturedDoctors);
publicRouter.get("/doctors/:id", PublicController.getDoctor);
publicRouter.get("/doctors", PublicController.searchDoctors);

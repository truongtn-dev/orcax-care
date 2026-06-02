import { Router } from "express";
import * as AdminController from "../controllers/admin.controller.js";
import { authMiddleware, requireRole } from "../middlewares/auth.middleware.js";
import { requireDatabase } from "../middlewares/requireDatabase.js";

export const adminRouter = Router();


adminRouter.use(requireDatabase);
adminRouter.use(authMiddleware);
adminRouter.use(requireRole("admin"));


adminRouter.post("/staff", AdminController.createStaffAccount);
adminRouter.get("/users", AdminController.listAllUsers);
adminRouter.put("/users/:userId/role", AdminController.changeUserRole);
adminRouter.put("/users/:userId/deactivate", AdminController.deactivateAccount);
adminRouter.put("/users/:userId/reactivate", AdminController.reactivateAccount);


adminRouter.post("/specialties", AdminController.createSpecialty);
adminRouter.put("/specialties/:specialtyId", AdminController.updateSpecialty);


adminRouter.get("/clinic-rooms", AdminController.listClinicRooms);
adminRouter.post("/clinic-rooms", AdminController.createClinicRoom);
adminRouter.put("/clinic-rooms/:roomId", AdminController.updateClinicRoom);


adminRouter.get("/doctors", AdminController.viewDoctorsList);

import express from "express";
import {
  getManagedUsers,
  createManagedUser,
  updateManagedUserStatus,
} from "../controllers/userController";
import { protect, authorize } from "../middleware/auth";
import { UserRole } from "../models/User";
import { validateBody } from "../middleware/validate";
import {
  createManagedUserSchema,
  updateManagedUserStatusSchema,
} from "../validation/marketplaceSchemas";

const router = express.Router();

router.get("/", protect, authorize(UserRole.ADMIN), getManagedUsers);
router.post(
  "/",
  protect,
  authorize(UserRole.ADMIN),
  validateBody(createManagedUserSchema),
  createManagedUser,
);
router.patch(
  "/:id/status",
  protect,
  authorize(UserRole.ADMIN),
  validateBody(updateManagedUserStatusSchema),
  updateManagedUserStatus,
);

export default router;

import express from "express";
import {
  assignTask,
  updateTaskStatus,
  getTasks,
} from "../controllers/taskController";
import { protect, authorize } from "../middleware/auth";
import { UserRole } from "../models/User";
import { validateBody } from "../middleware/validate";
import {
  assignTaskSchema,
  updateTaskSchema,
} from "../validation/marketplaceSchemas";

const router = express.Router();

router.post(
  "/assign",
  protect,
  authorize(UserRole.ADMIN),
  validateBody(assignTaskSchema),
  assignTask,
);
router.get("/", protect, getTasks);
router.patch(
  "/:id/status",
  protect,
  authorize(UserRole.EXPERT, UserRole.ADMIN),
  validateBody(updateTaskSchema),
  updateTaskStatus,
);
router.patch(
  "/:id",
  protect,
  authorize(UserRole.EXPERT, UserRole.ADMIN),
  validateBody(updateTaskSchema),
  updateTaskStatus,
);

export default router;

import express from "express";
import {
  createExpert,
  getExperts,
  getExpertById,
  getExpertCategories,
  getMyExpertProfile,
} from "../controllers/expertController";
import { protect, authorize } from "../middleware/auth";
import { UserRole } from "../models/User";
import { validateBody } from "../middleware/validate";
import { createExpertSchema } from "../validation/marketplaceSchemas";

const router = express.Router();

router.get("/", getExperts);
router.post(
  "/",
  protect,
  authorize(UserRole.ADMIN),
  validateBody(createExpertSchema),
  createExpert,
);
router.get("/categories/list", getExpertCategories);
router.get(
  "/me/profile",
  protect,
  authorize(UserRole.EXPERT),
  getMyExpertProfile,
);
router.get("/:id", getExpertById);

export default router;

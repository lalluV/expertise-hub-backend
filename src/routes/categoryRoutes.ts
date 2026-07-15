import express from "express";
import {
  getPublicCategories,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/categoryController";
import { protect, authorize } from "../middleware/auth";
import { UserRole } from "../models/User";
import { validateBody } from "../middleware/validate";
import {
  createCategorySchema,
  updateCategorySchema,
} from "../validation/marketplaceSchemas";

const router = express.Router();

router.get("/public", getPublicCategories);
router.get("/", protect, authorize(UserRole.ADMIN), getCategories);
router.post(
  "/",
  protect,
  authorize(UserRole.ADMIN),
  validateBody(createCategorySchema),
  createCategory,
);
router.patch(
  "/:id",
  protect,
  authorize(UserRole.ADMIN),
  validateBody(updateCategorySchema),
  updateCategory,
);
router.delete(
  "/:id",
  protect,
  authorize(UserRole.ADMIN),
  deleteCategory,
);

export default router;

import express from "express";
import {
  createQuote,
  updateQuoteStatus,
  getQuotes,
  getQuoteById,
} from "../controllers/quoteController";
import { protect, authorize } from "../middleware/auth";
import { UserRole } from "../models/User";
import { validateBody } from "../middleware/validate";
import {
  createQuoteSchema,
  updateQuoteStatusSchema,
} from "../validation/marketplaceSchemas";

const router = express.Router();

router.post(
  "/",
  protect,
  authorize(UserRole.ADMIN),
  validateBody(createQuoteSchema),
  createQuote,
);
router.get("/", protect, getQuotes);
router.get("/:id", protect, getQuoteById);
router.patch(
  "/:id/status",
  protect,
  authorize(UserRole.CUSTOMER),
  validateBody(updateQuoteStatusSchema),
  updateQuoteStatus,
);

export default router;

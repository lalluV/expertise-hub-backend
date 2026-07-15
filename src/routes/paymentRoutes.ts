import express from "express";
import { processPayment, getPayments } from "../controllers/paymentController";
import { protect, authorize } from "../middleware/auth";
import { UserRole } from "../models/User";
import { validateBody } from "../middleware/validate";
import { processPaymentSchema } from "../validation/marketplaceSchemas";

const router = express.Router();

router.get("/", protect, getPayments);
router.post(
  "/",
  protect,
  authorize(UserRole.CUSTOMER),
  validateBody(processPaymentSchema),
  processPayment,
);
router.post(
  "/process",
  protect,
  authorize(UserRole.CUSTOMER),
  validateBody(processPaymentSchema),
  processPayment,
);

export default router;

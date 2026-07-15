import express from "express";
import {
  createRequest,
  getRequests,
  getRequestById,
  updateRequestStatus,
  assignExpertToRequest,
  expertRespondToRequest,
  rescheduleRequest,
  submitRequestReview,
} from "../controllers/requestController";
import { protect, authorize } from "../middleware/auth";
import { UserRole } from "../models/User";
import { upload } from "../middleware/upload";
import { validateBody } from "../middleware/validate";
import {
  createRequestSchema,
  expertRespondRequestSchema,
  rescheduleRequestSchema,
  assignExpertSchema,
  submitRequestReviewSchema,
} from "../validation/marketplaceSchemas";

const router = express.Router();

router.post(
  "/",
  protect,
  authorize(UserRole.CUSTOMER),
  upload.array("attachments", 5),
  validateBody(createRequestSchema),
  createRequest,
);
router.get("/", protect, getRequests);
router.get("/:id", protect, getRequestById);
router.patch(
  "/:id/status",
  protect,
  authorize(UserRole.ADMIN),
  updateRequestStatus,
);
router.patch(
  "/:id/expert",
  protect,
  authorize(UserRole.ADMIN),
  validateBody(assignExpertSchema),
  assignExpertToRequest,
);
router.patch(
  "/:id/respond",
  protect,
  authorize(UserRole.EXPERT),
  validateBody(expertRespondRequestSchema),
  expertRespondToRequest,
);
router.patch(
  "/:id/schedule",
  protect,
  validateBody(rescheduleRequestSchema),
  rescheduleRequest,
);
router.post(
  "/:id/review",
  protect,
  authorize(UserRole.CUSTOMER),
  validateBody(submitRequestReviewSchema),
  submitRequestReview,
);

export default router;

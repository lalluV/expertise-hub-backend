"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const requestController_1 = require("../controllers/requestController");
const auth_1 = require("../middleware/auth");
const User_1 = require("../models/User");
const upload_1 = require("../middleware/upload");
const validate_1 = require("../middleware/validate");
const marketplaceSchemas_1 = require("../validation/marketplaceSchemas");
const router = express_1.default.Router();
router.post("/", auth_1.protect, (0, auth_1.authorize)(User_1.UserRole.CUSTOMER), upload_1.upload.array("attachments", 5), upload_1.verifyUploadContent, (0, validate_1.validateBody)(marketplaceSchemas_1.createRequestSchema), requestController_1.createRequest);
router.get("/", auth_1.protect, requestController_1.getRequests);
router.get("/:id", auth_1.protect, requestController_1.getRequestById);
router.patch("/:id", auth_1.protect, (0, auth_1.authorize)(User_1.UserRole.CUSTOMER), (0, validate_1.validateBody)(marketplaceSchemas_1.updateRequestSchema), requestController_1.updateRequest);
router.patch("/:id/cancel", auth_1.protect, (0, auth_1.authorize)(User_1.UserRole.CUSTOMER), (0, validate_1.validateBody)(marketplaceSchemas_1.cancelRequestSchema), requestController_1.cancelRequest);
router.delete("/:id", auth_1.protect, (0, auth_1.authorize)(User_1.UserRole.CUSTOMER), requestController_1.deleteRequest);
router.patch("/:id/status", auth_1.protect, (0, auth_1.authorize)(User_1.UserRole.ADMIN), // only admins may set a status, incl. "completed"
(0, validate_1.validateBody)(marketplaceSchemas_1.updateRequestStatusSchema), requestController_1.updateRequestStatus);
router.patch("/:id/expert", auth_1.protect, (0, auth_1.authorize)(User_1.UserRole.ADMIN), (0, validate_1.validateBody)(marketplaceSchemas_1.assignExpertSchema), requestController_1.assignExpertToRequest);
router.patch("/:id/respond", auth_1.protect, (0, auth_1.authorize)(User_1.UserRole.EXPERT), (0, validate_1.validateBody)(marketplaceSchemas_1.expertRespondRequestSchema), requestController_1.expertRespondToRequest);
router.patch("/:id/schedule", auth_1.protect, (0, validate_1.validateBody)(marketplaceSchemas_1.rescheduleRequestSchema), requestController_1.rescheduleRequest);
router.post("/:id/review", auth_1.protect, (0, auth_1.authorize)(User_1.UserRole.CUSTOMER), (0, validate_1.validateBody)(marketplaceSchemas_1.submitRequestReviewSchema), requestController_1.submitRequestReview);
exports.default = router;

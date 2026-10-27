"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const reviewController_1 = require("../controllers/reviewController");
const auth_1 = require("../middleware/auth");
const User_1 = require("../models/User");
const validate_1 = require("../middleware/validate");
const marketplaceSchemas_1 = require("../validation/marketplaceSchemas");
const router = express_1.default.Router();
router.use(auth_1.protect, (0, auth_1.authorize)(User_1.UserRole.ADMIN));
router.get("/", reviewController_1.listReviews);
router.get("/pending", (req, res, next) => {
    req.query.status = "pending";
    return (0, reviewController_1.listReviews)(req, res).catch(next);
});
router.post("/", (0, validate_1.validateBody)(marketplaceSchemas_1.adminCreateReviewSchema), reviewController_1.createAdminReview);
router.patch("/:id/approve", reviewController_1.approveReview);
router.patch("/:id/reject", (0, validate_1.validateBody)(marketplaceSchemas_1.rejectReviewSchema), reviewController_1.rejectReview);
exports.default = router;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const paymentController_1 = require("../controllers/paymentController");
const auth_1 = require("../middleware/auth");
const User_1 = require("../models/User");
const validate_1 = require("../middleware/validate");
const marketplaceSchemas_1 = require("../validation/marketplaceSchemas");
const router = express_1.default.Router();
router.get("/", auth_1.protect, paymentController_1.getPayments);
router.post("/", auth_1.protect, (0, auth_1.authorize)(User_1.UserRole.CUSTOMER), (0, validate_1.validateBody)(marketplaceSchemas_1.processPaymentSchema), paymentController_1.processPayment);
router.post("/process", auth_1.protect, (0, auth_1.authorize)(User_1.UserRole.CUSTOMER), (0, validate_1.validateBody)(marketplaceSchemas_1.processPaymentSchema), paymentController_1.processPayment);
exports.default = router;

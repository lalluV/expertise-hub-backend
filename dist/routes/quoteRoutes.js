"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const quoteController_1 = require("../controllers/quoteController");
const auth_1 = require("../middleware/auth");
const User_1 = require("../models/User");
const validate_1 = require("../middleware/validate");
const marketplaceSchemas_1 = require("../validation/marketplaceSchemas");
const router = express_1.default.Router();
router.post("/", auth_1.protect, (0, auth_1.authorize)(User_1.UserRole.ADMIN), (0, validate_1.validateBody)(marketplaceSchemas_1.createQuoteSchema), quoteController_1.createQuote);
router.get("/", auth_1.protect, quoteController_1.getQuotes);
router.get("/:id", auth_1.protect, quoteController_1.getQuoteById);
router.patch("/:id/status", auth_1.protect, (0, auth_1.authorize)(User_1.UserRole.CUSTOMER), (0, validate_1.validateBody)(marketplaceSchemas_1.updateQuoteStatusSchema), quoteController_1.updateQuoteStatus);
exports.default = router;

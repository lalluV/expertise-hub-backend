"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const expertController_1 = require("../controllers/expertController");
const auth_1 = require("../middleware/auth");
const User_1 = require("../models/User");
const validate_1 = require("../middleware/validate");
const marketplaceSchemas_1 = require("../validation/marketplaceSchemas");
const router = express_1.default.Router();
router.get("/", expertController_1.getExperts);
router.post("/", auth_1.protect, (0, auth_1.authorize)(User_1.UserRole.ADMIN), (0, validate_1.validateBody)(marketplaceSchemas_1.createExpertSchema), expertController_1.createExpert);
router.get("/categories/list", expertController_1.getExpertCategories);
router.get("/me/profile", auth_1.protect, (0, auth_1.authorize)(User_1.UserRole.EXPERT), expertController_1.getMyExpertProfile);
router.get("/:id", expertController_1.getExpertById);
exports.default = router;

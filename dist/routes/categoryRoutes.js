"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const categoryController_1 = require("../controllers/categoryController");
const auth_1 = require("../middleware/auth");
const User_1 = require("../models/User");
const validate_1 = require("../middleware/validate");
const marketplaceSchemas_1 = require("../validation/marketplaceSchemas");
const router = express_1.default.Router();
router.get("/public", categoryController_1.getPublicCategories);
router.get("/", auth_1.protect, (0, auth_1.authorize)(User_1.UserRole.ADMIN), categoryController_1.getCategories);
router.post("/", auth_1.protect, (0, auth_1.authorize)(User_1.UserRole.ADMIN), (0, validate_1.validateBody)(marketplaceSchemas_1.createCategorySchema), categoryController_1.createCategory);
router.patch("/:id", auth_1.protect, (0, auth_1.authorize)(User_1.UserRole.ADMIN), (0, validate_1.validateBody)(marketplaceSchemas_1.updateCategorySchema), categoryController_1.updateCategory);
router.delete("/:id", auth_1.protect, (0, auth_1.authorize)(User_1.UserRole.ADMIN), categoryController_1.deleteCategory);
exports.default = router;

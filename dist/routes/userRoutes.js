"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userController_1 = require("../controllers/userController");
const auth_1 = require("../middleware/auth");
const User_1 = require("../models/User");
const validate_1 = require("../middleware/validate");
const marketplaceSchemas_1 = require("../validation/marketplaceSchemas");
const router = express_1.default.Router();
router.get("/", auth_1.protect, (0, auth_1.authorize)(User_1.UserRole.ADMIN), userController_1.getManagedUsers);
router.post("/", auth_1.protect, (0, auth_1.authorize)(User_1.UserRole.ADMIN), (0, validate_1.validateBody)(marketplaceSchemas_1.createManagedUserSchema), userController_1.createManagedUser);
router.patch("/:id/status", auth_1.protect, (0, auth_1.authorize)(User_1.UserRole.ADMIN), (0, validate_1.validateBody)(marketplaceSchemas_1.updateManagedUserStatusSchema), userController_1.updateManagedUserStatus);
exports.default = router;

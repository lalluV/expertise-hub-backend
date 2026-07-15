"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const taskController_1 = require("../controllers/taskController");
const auth_1 = require("../middleware/auth");
const User_1 = require("../models/User");
const validate_1 = require("../middleware/validate");
const marketplaceSchemas_1 = require("../validation/marketplaceSchemas");
const router = express_1.default.Router();
router.post("/assign", auth_1.protect, (0, auth_1.authorize)(User_1.UserRole.ADMIN), (0, validate_1.validateBody)(marketplaceSchemas_1.assignTaskSchema), taskController_1.assignTask);
router.get("/", auth_1.protect, taskController_1.getTasks);
router.patch("/:id/status", auth_1.protect, (0, auth_1.authorize)(User_1.UserRole.EXPERT, User_1.UserRole.ADMIN), (0, validate_1.validateBody)(marketplaceSchemas_1.updateTaskSchema), taskController_1.updateTaskStatus);
router.patch("/:id", auth_1.protect, (0, auth_1.authorize)(User_1.UserRole.EXPERT, User_1.UserRole.ADMIN), (0, validate_1.validateBody)(marketplaceSchemas_1.updateTaskSchema), taskController_1.updateTaskStatus);
exports.default = router;

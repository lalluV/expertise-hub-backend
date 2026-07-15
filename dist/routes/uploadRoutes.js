"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const uploadController_1 = require("../controllers/uploadController");
const auth_1 = require("../middleware/auth");
const upload_1 = require("../middleware/upload");
const router = express_1.default.Router();
router.post("/image", auth_1.protect, upload_1.upload.single("file"), uploadController_1.uploadImage);
router.post("/images", auth_1.protect, upload_1.upload.array("files", 10), uploadController_1.uploadImages);
exports.default = router;

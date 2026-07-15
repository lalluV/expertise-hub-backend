import express from "express";
import { uploadImage, uploadImages } from "../controllers/uploadController";
import { protect } from "../middleware/auth";
import { upload } from "../middleware/upload";

const router = express.Router();

router.post("/image", protect, upload.single("file"), uploadImage);
router.post("/images", protect, upload.array("files", 10), uploadImages);

export default router;

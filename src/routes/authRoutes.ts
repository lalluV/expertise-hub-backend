import express from "express";
import {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  sendOtp,
  verifyOtp,
  uploadAvatar,
} from "../controllers/authController";
import {
  getSavedExperts,
  toggleSavedExpert,
} from "../controllers/savedExpertController";
import { protect } from "../middleware/auth";
import { upload } from "../middleware/upload";

const router = express.Router();

router.post("/otp/send", sendOtp);
router.post("/otp/verify", verifyOtp);
router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/profile", protect, getUserProfile);
router.patch("/profile", protect, updateUserProfile);
router.get("/saved-experts", protect, getSavedExperts);
router.post("/saved-experts/:expertId", protect, toggleSavedExpert);
router.post(
  "/avatar",
  protect,
  upload.single("avatar"),
  uploadAvatar,
);

export default router;

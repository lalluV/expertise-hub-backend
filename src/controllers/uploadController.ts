import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import {
  resolveStoredAssetUrl,
  uploadMulterFile,
  uploadMulterFiles,
} from "../services/storageService";

// @desc    Upload a single image
// @route   POST /api/uploads/image
// @access  Private
export const uploadImage = async (req: AuthRequest, res: Response) => {
  const file = req.file as Express.Multer.File | undefined;
  if (!file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const folder =
    req.body.folder === "requests" || req.body.folder === "avatars"
      ? req.body.folder
      : "uploads";

  const storedValue = await uploadMulterFile(file, folder);

  res.status(201).json({
    key: storedValue,
    url: resolveStoredAssetUrl(storedValue),
  });
};

// @desc    Upload multiple images/files
// @route   POST /api/uploads/images
// @access  Private
export const uploadImages = async (req: AuthRequest, res: Response) => {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (files.length === 0) {
    return res.status(400).json({ message: "No files uploaded" });
  }

  const folder =
    req.body.folder === "requests" || req.body.folder === "avatars"
      ? req.body.folder
      : "uploads";

  const storedValues = await uploadMulterFiles(files, folder);

  res.status(201).json({
    files: storedValues.map((storedValue) => ({
      key: storedValue,
      url: resolveStoredAssetUrl(storedValue),
    })),
  });
};

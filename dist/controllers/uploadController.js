"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadImages = exports.uploadImage = void 0;
const storageService_1 = require("../services/storageService");
// @desc    Upload a single image
// @route   POST /api/uploads/image
// @access  Private
const uploadImage = async (req, res) => {
    const file = req.file;
    if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
    }
    const folder = req.body.folder === "requests" || req.body.folder === "avatars"
        ? req.body.folder
        : "uploads";
    const storedValue = await (0, storageService_1.uploadMulterFile)(file, folder);
    res.status(201).json({
        key: storedValue,
        url: (0, storageService_1.resolveStoredAssetUrl)(storedValue),
    });
};
exports.uploadImage = uploadImage;
// @desc    Upload multiple images/files
// @route   POST /api/uploads/images
// @access  Private
const uploadImages = async (req, res) => {
    const files = req.files ?? [];
    if (files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
    }
    const folder = req.body.folder === "requests" || req.body.folder === "avatars"
        ? req.body.folder
        : "uploads";
    const storedValues = await (0, storageService_1.uploadMulterFiles)(files, folder);
    res.status(201).json({
        files: storedValues.map((storedValue) => ({
            key: storedValue,
            url: (0, storageService_1.resolveStoredAssetUrl)(storedValue),
        })),
    });
};
exports.uploadImages = uploadImages;

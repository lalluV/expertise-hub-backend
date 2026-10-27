"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyUploadContent = exports.upload = exports.ALLOWED_MIME_TYPES = void 0;
const multer_1 = __importDefault(require("multer"));
const sniff_1 = require("../utils/sniff");
exports.ALLOWED_MIME_TYPES = new Set([
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
    "application/pdf",
]);
exports.upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024, files: 10 },
    fileFilter: (_req, file, cb) => {
        if (exports.ALLOWED_MIME_TYPES.has(file.mimetype)) {
            cb(null, true);
            return;
        }
        cb(new Error(`Unsupported file type: ${file.mimetype}`));
    },
});
const normalizeMime = (mime) => (mime === "image/jpg" ? "image/jpeg" : mime);
/**
 * Sniffs the real file type from the bytes (magic numbers) and rejects files
 * whose content is not an allowed type or does not match the declared
 * Content-Type (e.g. HTML uploaded as image/png). Run after multer.
 */
const verifyUploadContent = async (req, res, next) => {
    const files = [];
    if (req.file)
        files.push(req.file);
    if (Array.isArray(req.files))
        files.push(...req.files);
    else if (req.files)
        Object.values(req.files).forEach((list) => files.push(...list));
    for (const file of files) {
        const mime = (0, sniff_1.sniffMime)(file.buffer);
        const detected = mime ? { mime } : undefined;
        if (!detected || !exports.ALLOWED_MIME_TYPES.has(detected.mime)) {
            return res.status(400).json({
                success: false,
                message: `File "${file.originalname}" is not a valid image or PDF`,
            });
        }
        if (normalizeMime(detected.mime) !== normalizeMime(file.mimetype)) {
            return res.status(400).json({
                success: false,
                message: `File "${file.originalname}" content (${detected.mime}) does not match its type (${file.mimetype})`,
            });
        }
        // Trust the sniffed type from here on (used as the stored Content-Type).
        file.mimetype = detected.mime;
    }
    next();
};
exports.verifyUploadContent = verifyUploadContent;

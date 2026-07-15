"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveStoredAssetUrl = void 0;
exports.uploadBuffer = uploadBuffer;
exports.uploadMulterFile = uploadMulterFile;
exports.uploadMulterFiles = uploadMulterFiles;
const client_s3_1 = require("@aws-sdk/client-s3");
const crypto_1 = __importDefault(require("crypto"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const storage_1 = require("../config/storage");
const MIME_EXTENSIONS = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "application/pdf": ".pdf",
};
const resolveExtension = (originalName, mimeType) => {
    const fromName = path_1.default.extname(originalName);
    if (fromName)
        return fromName.toLowerCase();
    return MIME_EXTENSIONS[mimeType] || "";
};
const buildObjectKey = (folder, originalName, mimeType) => {
    const ext = resolveExtension(originalName, mimeType);
    return `${folder}/${Date.now()}-${crypto_1.default.randomBytes(8).toString("hex")}${ext}`;
};
const resolveStoredAssetUrl = (storedValue) => {
    if (!storedValue)
        return undefined;
    if (storedValue.startsWith("http://") || storedValue.startsWith("https://")) {
        return storedValue;
    }
    const publicBase = (0, storage_1.getStoragePublicBaseUrl)();
    if (publicBase && (0, storage_1.isObjectStorageConfigured)()) {
        const key = storedValue.replace(/^\/+/, "");
        return `${publicBase}/${key}`;
    }
    const normalized = storedValue.replace(/\\/g, "/").replace(/^\/+/, "");
    if (normalized.startsWith("uploads/")) {
        return `/${normalized}`;
    }
    return `/uploads/${normalized}`;
};
exports.resolveStoredAssetUrl = resolveStoredAssetUrl;
async function uploadBuffer(params) {
    const key = buildObjectKey(params.folder, params.originalName, params.mimeType);
    if ((0, storage_1.isObjectStorageConfigured)()) {
        await (0, storage_1.getS3Client)().send(new client_s3_1.PutObjectCommand({
            Bucket: (0, storage_1.getStorageBucket)(),
            Key: key,
            Body: params.buffer,
            ContentType: params.mimeType,
        }));
        const publicBase = (0, storage_1.getStoragePublicBaseUrl)();
        if (publicBase) {
            return `${publicBase}/${key}`;
        }
        return key;
    }
    const localPath = path_1.default.join(process.cwd(), "uploads", key);
    await promises_1.default.mkdir(path_1.default.dirname(localPath), { recursive: true });
    await promises_1.default.writeFile(localPath, params.buffer);
    return key.replace(/\\/g, "/");
}
async function uploadMulterFile(file, folder) {
    return uploadBuffer({
        buffer: file.buffer,
        mimeType: file.mimetype,
        originalName: file.originalname,
        folder,
    });
}
async function uploadMulterFiles(files, folder) {
    return Promise.all(files.map((file) => uploadMulterFile(file, folder)));
}

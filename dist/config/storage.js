"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStoragePublicBaseUrl = exports.getStorageBucket = exports.getS3Client = exports.getObjectStorageEndpoint = exports.isObjectStorageConfigured = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const getAccountId = () => process.env.R2_ACCOUNT_ID?.trim() ||
    process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
const isObjectStorageConfigured = () => Boolean(process.env.R2_ACCESS_KEY_ID?.trim() &&
    process.env.R2_SECRET_ACCESS_KEY?.trim() &&
    process.env.R2_BUCKET_NAME?.trim() &&
    getAccountId());
exports.isObjectStorageConfigured = isObjectStorageConfigured;
const getObjectStorageEndpoint = () => {
    if (process.env.R2_ENDPOINT?.trim()) {
        return process.env.R2_ENDPOINT.trim();
    }
    const accountId = getAccountId();
    if (!accountId) {
        throw new Error("R2_ENDPOINT, R2_ACCOUNT_ID, or CLOUDFLARE_ACCOUNT_ID is required");
    }
    return `https://${accountId}.r2.cloudflarestorage.com`;
};
exports.getObjectStorageEndpoint = getObjectStorageEndpoint;
let s3Client = null;
const getS3Client = () => {
    if (!(0, exports.isObjectStorageConfigured)()) {
        throw new Error("Object storage is not configured");
    }
    if (!s3Client) {
        s3Client = new client_s3_1.S3Client({
            region: process.env.R2_REGION || "auto",
            endpoint: (0, exports.getObjectStorageEndpoint)(),
            credentials: {
                accessKeyId: process.env.R2_ACCESS_KEY_ID,
                secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
            },
            forcePathStyle: true,
        });
    }
    return s3Client;
};
exports.getS3Client = getS3Client;
const getStorageBucket = () => process.env.R2_BUCKET_NAME.trim();
exports.getStorageBucket = getStorageBucket;
const getStoragePublicBaseUrl = () => {
    const configured = process.env.R2_PUBLIC_URL?.trim().replace(/\/$/, "");
    if (configured)
        return configured;
    const bucket = process.env.R2_BUCKET_NAME?.trim();
    const accountId = getAccountId();
    if (bucket && accountId) {
        return `https://${accountId}.r2.cloudflarestorage.com/${bucket}`;
    }
    return undefined;
};
exports.getStoragePublicBaseUrl = getStoragePublicBaseUrl;

import { PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import {
  getS3Client,
  getStorageBucket,
  getStoragePublicBaseUrl,
  isObjectStorageConfigured,
} from "../config/storage";

export type StorageFolder = "avatars" | "requests" | "uploads";

const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "application/pdf": ".pdf",
};

const resolveExtension = (originalName: string, mimeType: string) => {
  const fromName = path.extname(originalName);
  if (fromName) return fromName.toLowerCase();
  return MIME_EXTENSIONS[mimeType] || "";
};

const buildObjectKey = (
  folder: StorageFolder,
  originalName: string,
  mimeType: string,
) => {
  const ext = resolveExtension(originalName, mimeType);
  return `${folder}/${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;
};

export const resolveStoredAssetUrl = (storedValue?: string) => {
  if (!storedValue) return undefined;
  if (storedValue.startsWith("http://") || storedValue.startsWith("https://")) {
    return storedValue;
  }

  const publicBase = getStoragePublicBaseUrl();
  if (publicBase && isObjectStorageConfigured()) {
    const key = storedValue.replace(/^\/+/, "");
    return `${publicBase}/${key}`;
  }

  const normalized = storedValue.replace(/\\/g, "/").replace(/^\/+/, "");
  if (normalized.startsWith("uploads/")) {
    return `/${normalized}`;
  }

  return `/uploads/${normalized}`;
};

export async function uploadBuffer(params: {
  buffer: Buffer;
  mimeType: string;
  originalName: string;
  folder: StorageFolder;
}): Promise<string> {
  const key = buildObjectKey(
    params.folder,
    params.originalName,
    params.mimeType,
  );

  if (isObjectStorageConfigured()) {
    await getS3Client().send(
      new PutObjectCommand({
        Bucket: getStorageBucket(),
        Key: key,
        Body: params.buffer,
        ContentType: params.mimeType,
      }),
    );

    const publicBase = getStoragePublicBaseUrl();
    if (publicBase) {
      return `${publicBase}/${key}`;
    }

    return key;
  }

  const localPath = path.join(process.cwd(), "uploads", key);
  await fs.mkdir(path.dirname(localPath), { recursive: true });
  await fs.writeFile(localPath, params.buffer);
  return key.replace(/\\/g, "/");
}

export async function uploadMulterFile(
  file: Express.Multer.File,
  folder: StorageFolder,
): Promise<string> {
  return uploadBuffer({
    buffer: file.buffer,
    mimeType: file.mimetype,
    originalName: file.originalname,
    folder,
  });
}

export async function uploadMulterFiles(
  files: Express.Multer.File[],
  folder: StorageFolder,
): Promise<string[]> {
  return Promise.all(files.map((file) => uploadMulterFile(file, folder)));
}

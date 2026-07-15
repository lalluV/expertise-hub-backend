import { S3Client } from "@aws-sdk/client-s3";

const getAccountId = () =>
  process.env.R2_ACCOUNT_ID?.trim() ||
  process.env.CLOUDFLARE_ACCOUNT_ID?.trim();

export const isObjectStorageConfigured = () =>
  Boolean(
    process.env.R2_ACCESS_KEY_ID?.trim() &&
      process.env.R2_SECRET_ACCESS_KEY?.trim() &&
      process.env.R2_BUCKET_NAME?.trim() &&
      getAccountId(),
  );

export const getObjectStorageEndpoint = () => {
  if (process.env.R2_ENDPOINT?.trim()) {
    return process.env.R2_ENDPOINT.trim();
  }

  const accountId = getAccountId();
  if (!accountId) {
    throw new Error(
      "R2_ENDPOINT, R2_ACCOUNT_ID, or CLOUDFLARE_ACCOUNT_ID is required",
    );
  }

  return `https://${accountId}.r2.cloudflarestorage.com`;
};

let s3Client: S3Client | null = null;

export const getS3Client = (): S3Client => {
  if (!isObjectStorageConfigured()) {
    throw new Error("Object storage is not configured");
  }

  if (!s3Client) {
    s3Client = new S3Client({
      region: process.env.R2_REGION || "auto",
      endpoint: getObjectStorageEndpoint(),
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
      forcePathStyle: true,
    });
  }

  return s3Client;
};

export const getStorageBucket = () => process.env.R2_BUCKET_NAME!.trim();

export const getStoragePublicBaseUrl = () => {
  const configured = process.env.R2_PUBLIC_URL?.trim().replace(/\/$/, "");
  if (configured) return configured;

  const bucket = process.env.R2_BUCKET_NAME?.trim();
  const accountId = getAccountId();
  if (bucket && accountId) {
    return `https://${accountId}.r2.cloudflarestorage.com/${bucket}`;
  }

  return undefined;
};

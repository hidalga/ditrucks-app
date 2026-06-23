import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID || "";
const BUCKET_NAME = process.env.R2_BUCKET_NAME || "";
const PUBLIC_URL = (process.env.R2_PUBLIC_URL || "").replace(/\/$/, "");

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

export async function uploadToR2(
  key: string,
  body: Buffer,
  contentType: string
): Promise<void> {
  await r2Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
}

export async function getFromR2(
  key: string
): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const result = await r2Client.send(
      new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key })
    );
    const bytes = await result.Body?.transformToByteArray();
    if (!bytes) return null;
    return {
      buffer: Buffer.from(bytes),
      contentType: result.ContentType || "application/octet-stream",
    };
  } catch {
    return null;
  }
}

export async function deleteFromR2(key: string): Promise<void> {
  await r2Client.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: key }));
}

export function buildPublicUrl(key: string): string {
  return `${PUBLIC_URL}/${key}`;
}

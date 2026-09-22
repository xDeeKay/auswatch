import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { requireEnvString } from "@/lib/required-env";

let client: S3Client | null = null;

function getClient(): S3Client {
  if (client) return client;
  const accountId = requireEnvString("R2_ACCOUNT_ID");
  client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requireEnvString("R2_ACCESS_KEY_ID"),
      secretAccessKey: requireEnvString("R2_SECRET_ACCESS_KEY"),
    },
  });
  return client;
}

function getBucketName(): string {
  return requireEnvString("R2_BUCKET_NAME");
}

export async function uploadPhoto(key: string, data: Buffer, contentType: string): Promise<void> {
  await getClient().send(
    new PutObjectCommand({ Bucket: getBucketName(), Key: key, Body: data, ContentType: contentType })
  );
}

export async function getPhotoBytes(key: string): Promise<{ data: Uint8Array; contentType: string } | null> {
  try {
    const response = await getClient().send(new GetObjectCommand({ Bucket: getBucketName(), Key: key }));
    if (!response.Body) return null;
    const data = await response.Body.transformToByteArray();
    return { data, contentType: response.ContentType ?? "application/octet-stream" };
  } catch {
    return null;
  }
}

export async function deletePhoto(key: string): Promise<void> {
  await getClient().send(new DeleteObjectCommand({ Bucket: getBucketName(), Key: key }));
}

export function buildCameraPhotoKey(cameraId: string, photoId: string): string {
  return `cameras/${cameraId}/${photoId}.jpg`;
}

export function buildCorrectionPhotoKey(correctionReportId: string, photoId: string): string {
  return `corrections/${correctionReportId}/${photoId}.jpg`;
}

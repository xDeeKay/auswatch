import {
  validatePhotoUpload,
  validatePhotoCount,
  extractExifSignals,
  processPhotoForStorage,
  type Point,
} from "@/lib/photo-processing";

export type PendingPhoto = {
  data: Buffer;
  contentType: string;
  width: number;
  height: number;
  gpsDistanceMeters: number | null;
  capturedAgeHours: number | null;
};

export type PhotoCollectionResult =
  | { ok: true; photos: PendingPhoto[] }
  | { ok: false; message: string };

/**
 * Reads, validates, EXIF-extracts, and re-encodes every "photo" file field in
 * a submission/correction's multipart body. Runs entirely before any
 * database write so a bad photo fails the request cleanly rather than
 * leaving a partially-created record behind.
 */
export async function collectAndProcessPhotos(
  formData: FormData,
  submittedPoint: Point,
  submittedAt: Date
): Promise<PhotoCollectionResult> {
  const files = formData.getAll("photo").filter((entry): entry is File => entry instanceof File && entry.size > 0);

  const countCheck = validatePhotoCount(files.length);
  if (!countCheck.ok) return { ok: false, message: countCheck.message };

  const photos: PendingPhoto[] = [];
  for (const file of files) {
    const typeCheck = validatePhotoUpload({ type: file.type, size: file.size });
    if (!typeCheck.ok) return { ok: false, message: typeCheck.message };

    const buffer = Buffer.from(await file.arrayBuffer());
    const [signals, processed] = await Promise.all([
      extractExifSignals(buffer, submittedPoint, submittedAt),
      processPhotoForStorage(buffer),
    ]);

    photos.push({ ...processed, ...signals });
  }

  return { ok: true, photos };
}

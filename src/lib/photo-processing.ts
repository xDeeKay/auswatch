import sharp from "sharp";
import exifr from "exifr";
import { haversineMeters } from "@/lib/geo";
import { MAX_UPLOAD_BYTES, MAX_PHOTOS_PER_SUBMISSION, ALLOWED_PHOTO_CONTENT_TYPES } from "@/lib/photo-limits";

export type Point = { lat: number; lng: number };

export type PhotoExifSignals = {
  gpsDistanceMeters: number | null;
  capturedAgeHours: number | null;
};

export { MAX_UPLOAD_BYTES, MAX_PHOTOS_PER_SUBMISSION };
const ALLOWED_CONTENT_TYPES = new Set<string>(ALLOWED_PHOTO_CONTENT_TYPES);

export type PhotoValidationResult = { ok: true } | { ok: false; message: string };

export function validatePhotoUpload(file: { type: string; size: number }): PhotoValidationResult {
  if (!ALLOWED_CONTENT_TYPES.has(file.type)) {
    return { ok: false, message: "Photos must be JPEG, PNG, or WebP." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, message: "Each photo must be 8MB or smaller." };
  }
  return { ok: true };
}

export function validatePhotoCount(count: number): PhotoValidationResult {
  if (count > MAX_PHOTOS_PER_SUBMISSION) {
    return { ok: false, message: `You can attach at most ${MAX_PHOTOS_PER_SUBMISSION} photos.` };
  }
  return { ok: true };
}

export function computeGpsDistanceMeters(exifGps: Point | null, submittedPoint: Point): number | null {
  if (!exifGps) return null;
  return haversineMeters(exifGps, submittedPoint);
}

/** Positive = photo taken before the submission, negative = photo dated after it (worth a moderator's attention). */
export function computeCapturedAgeHours(capturedAt: Date | null, submittedAt: Date): number | null {
  if (!capturedAt) return null;
  return (submittedAt.getTime() - capturedAt.getTime()) / (1000 * 60 * 60);
}

async function readExifGps(buffer: Buffer): Promise<Point | null> {
  try {
    const gps = await exifr.gps(buffer);
    if (!gps || !Number.isFinite(gps.latitude) || !Number.isFinite(gps.longitude)) return null;
    return { lat: gps.latitude, lng: gps.longitude };
  } catch {
    return null;
  }
}

async function readExifCapturedAt(buffer: Buffer): Promise<Date | null> {
  try {
    const tags = await exifr.parse(buffer, { pick: ["DateTimeOriginal"] });
    const value = tags?.DateTimeOriginal;
    return value instanceof Date && !Number.isNaN(value.getTime()) ? value : null;
  } catch {
    return null;
  }
}

/**
 * Reads just the GPS coordinate and capture timestamp from a photo's EXIF and
 * immediately reduces them to two derived numbers. The raw coordinate and
 * timestamp are never returned or persisted anywhere, they're exactly the
 * kind of trail the project's anonymous-reporter design exists to avoid
 * retaining, even for moderator-only evidence.
 */
export async function extractExifSignals(
  buffer: Buffer,
  submittedPoint: Point,
  submittedAt: Date
): Promise<PhotoExifSignals> {
  const [gps, capturedAt] = await Promise.all([readExifGps(buffer), readExifCapturedAt(buffer)]);
  return {
    gpsDistanceMeters: computeGpsDistanceMeters(gps, submittedPoint),
    capturedAgeHours: computeCapturedAgeHours(capturedAt, submittedAt),
  };
}

export type ProcessedPhoto = { data: Buffer; contentType: string; width: number; height: number };

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 82;
export const PROCESSED_PHOTO_CONTENT_TYPE = "image/jpeg";

/** Re-encodes to JPEG, which strips EXIF by default (no .withMetadata() call), and caps dimensions/size. */
export async function processPhotoForStorage(buffer: Buffer): Promise<ProcessedPhoto> {
  const { data, info } = await sharp(buffer)
    .rotate()
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer({ resolveWithObject: true });

  return { data, contentType: PROCESSED_PHOTO_CONTENT_TYPE, width: info.width, height: info.height };
}

// Plain constants only, no server-only dependencies (sharp, exifr) - this
// file is safe to import from client components for advisory-only checks.
// The server always re-validates independently in photo-processing.ts.
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const MAX_PHOTOS_PER_SUBMISSION = 3;
export const ALLOWED_PHOTO_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

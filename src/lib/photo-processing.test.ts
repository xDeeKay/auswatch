import { describe, it, expect, vi, afterEach } from "vitest";
import sharp from "sharp";
import exifr from "exifr";
import { haversineMeters } from "@/lib/geo";

vi.mock("exifr", async (importOriginal) => {
  const actual = await importOriginal<{ default: typeof exifr }>();
  return { default: { ...actual.default, gps: vi.fn(actual.default.gps) } };
});
import {
  validatePhotoUpload,
  validatePhotoCount,
  computeGpsDistanceMeters,
  computeCapturedAgeHours,
  extractExifSignals,
  processPhotoForStorage,
  MAX_UPLOAD_BYTES,
  MAX_PHOTOS_PER_SUBMISSION,
  PROCESSED_PHOTO_CONTENT_TYPE,
} from "./photo-processing";

async function plainJpeg(width: number, height: number): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: { r: 40, g: 80, b: 120 } } })
    .jpeg()
    .toBuffer();
}

describe("validatePhotoUpload", () => {
  it("accepts an allowed content type under the size cap", () => {
    expect(validatePhotoUpload({ type: "image/jpeg", size: 1000 })).toEqual({ ok: true });
  });

  it.each(["image/heic", "image/gif", "application/pdf", "text/plain"])(
    "rejects a disallowed content type %s",
    (type) => {
      const result = validatePhotoUpload({ type, size: 1000 });
      expect(result.ok).toBe(false);
    }
  );

  it("rejects a file over the size cap", () => {
    const result = validatePhotoUpload({ type: "image/jpeg", size: MAX_UPLOAD_BYTES + 1 });
    expect(result.ok).toBe(false);
  });

  it("accepts a file exactly at the size cap", () => {
    expect(validatePhotoUpload({ type: "image/jpeg", size: MAX_UPLOAD_BYTES })).toEqual({ ok: true });
  });
});

describe("validatePhotoCount", () => {
  it("accepts a count within the limit", () => {
    expect(validatePhotoCount(MAX_PHOTOS_PER_SUBMISSION)).toEqual({ ok: true });
  });

  it("rejects a count over the limit", () => {
    const result = validatePhotoCount(MAX_PHOTOS_PER_SUBMISSION + 1);
    expect(result.ok).toBe(false);
  });

  it("accepts zero photos, since photo evidence is optional", () => {
    expect(validatePhotoCount(0)).toEqual({ ok: true });
  });
});

describe("computeGpsDistanceMeters", () => {
  const submittedPoint = { lat: -31.9505, lng: 115.8605 };

  it("returns null when the photo carries no GPS EXIF", () => {
    expect(computeGpsDistanceMeters(null, submittedPoint)).toBeNull();
  });

  it("matches haversineMeters for a present GPS coordinate", () => {
    const exifGps = { lat: -32.0569, lng: 115.7439 };
    expect(computeGpsDistanceMeters(exifGps, submittedPoint)).toBeCloseTo(
      haversineMeters(exifGps, submittedPoint),
      6
    );
  });

  it("returns 0 when the photo's GPS exactly matches the submitted pin", () => {
    expect(computeGpsDistanceMeters(submittedPoint, submittedPoint)).toBeCloseTo(0, 6);
  });
});

describe("computeCapturedAgeHours", () => {
  const submittedAt = new Date("2026-09-16T12:00:00Z");

  it("returns null when the photo carries no capture timestamp", () => {
    expect(computeCapturedAgeHours(null, submittedAt)).toBeNull();
  });

  it("returns a positive value for a photo taken before submission", () => {
    const capturedAt = new Date("2026-09-16T06:00:00Z");
    expect(computeCapturedAgeHours(capturedAt, submittedAt)).toBeCloseTo(6, 6);
  });

  it("returns a negative value for a photo dated after submission, as a red flag rather than clamping to zero", () => {
    const capturedAt = new Date("2026-09-16T18:00:00Z");
    expect(computeCapturedAgeHours(capturedAt, submittedAt)).toBeCloseTo(-6, 6);
  });

  it("returns 0 when the photo was captured at the exact moment of submission", () => {
    expect(computeCapturedAgeHours(submittedAt, submittedAt)).toBe(0);
  });
});

describe("extractExifSignals", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns both signals null for a photo with no EXIF data, without throwing", async () => {
    const buffer = await plainJpeg(200, 150);
    const signals = await extractExifSignals(buffer, { lat: -31.95, lng: 115.86 }, new Date());
    expect(signals).toEqual({ gpsDistanceMeters: null, capturedAgeHours: null });
  });

  it("treats a malformed GPS tag (present but non-finite) as no location data rather than NaN", async () => {
    vi.mocked(exifr.gps).mockResolvedValueOnce({ latitude: NaN, longitude: NaN } as never);
    const buffer = await plainJpeg(200, 150);
    const signals = await extractExifSignals(buffer, { lat: -31.95, lng: 115.86 }, new Date());
    expect(signals.gpsDistanceMeters).toBeNull();
  });
});

describe("processPhotoForStorage", () => {
  it("re-encodes to JPEG regardless of input format", async () => {
    const buffer = await sharp({ create: { width: 100, height: 100, channels: 3, background: "#123456" } })
      .png()
      .toBuffer();
    const result = await processPhotoForStorage(buffer);
    expect(result.contentType).toBe(PROCESSED_PHOTO_CONTENT_TYPE);
  });

  it("downsizes an oversized image to the max dimension without distorting aspect ratio", async () => {
    const buffer = await plainJpeg(4000, 2000);
    const result = await processPhotoForStorage(buffer);
    expect(result.width).toBe(1600);
    expect(result.height).toBe(800);
  });

  it("never upscales a small image", async () => {
    const buffer = await plainJpeg(100, 80);
    const result = await processPhotoForStorage(buffer);
    expect(result.width).toBe(100);
    expect(result.height).toBe(80);
  });

  it("produces an output buffer with no EXIF segment", async () => {
    const withExif = await sharp({ create: { width: 100, height: 100, channels: 3, background: "#123456" } })
      .withExif({ IFD0: { Copyright: "test marker should not survive" } })
      .jpeg()
      .toBuffer();

    const result = await processPhotoForStorage(withExif);
    const outputMetadata = await sharp(result.data).metadata();
    expect(outputMetadata.exif).toBeUndefined();
  });
});

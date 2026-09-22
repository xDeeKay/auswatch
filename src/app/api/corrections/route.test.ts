import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CameraStatus, CameraType, CaptureType, ModerationState, OperatorCategory } from "@/generated/prisma/enums";

const cameraFindUniqueMock = vi.fn();
const correctionReportCountMock = vi.fn();
const correctionReportCreateMock = vi.fn();
const checkCorrectionRateLimitMock = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    camera: { findUnique: (...args: unknown[]) => cameraFindUniqueMock(...args) },
    correctionReport: {
      count: (...args: unknown[]) => correctionReportCountMock(...args),
      create: (...args: unknown[]) => correctionReportCreateMock(...args),
    },
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  checkCorrectionRateLimit: (...args: unknown[]) => checkCorrectionRateLimitMock(...args),
}));

vi.mock("@/lib/reporter-identity", () => ({
  getOrCreateReporterIdentity: async () => ({ token: "test-token" }),
  reporterIdentityCookieHeader: (token: string) => `aw_rid=${token}; HttpOnly`,
}));

const { POST } = await import("./route");

const ENV_KEYS = [
  "CORRECTION_RATE_LIMIT_WINDOW_MINUTES",
  "CORRECTION_VELOCITY_ALERT_THRESHOLD_PER_WINDOW",
  "CORRECTION_MAX_PENDING_PER_CAMERA",
] as const;

const camera = {
  id: "camera-1",
  lat: -31.9505,
  lng: 115.8605,
  type: CameraType.alpr,
  operatorCategory: OperatorCategory.state_police,
  operator: "WA Police",
  captures: CaptureType.plates,
  notes: "Mounted on a light pole.",
  status: CameraStatus.active,
  moderationState: ModerationState.verified,
};

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    cameraId: camera.id,
    lat: camera.lat,
    lng: camera.lng,
    type: camera.type,
    operatorCategory: camera.operatorCategory,
    operator: camera.operator,
    captures: camera.captures,
    notes: camera.notes,
    reporterNote: "",
    ...overrides,
  };
}

function postRequest(body: unknown) {
  const formData = new FormData();
  formData.set("payload", JSON.stringify(body));
  return new Request("http://localhost/api/corrections", { method: "POST", body: formData });
}

describe("POST /api/corrections anti-enumeration", () => {
  const originalEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of ENV_KEYS) originalEnv[key] = process.env[key];
    process.env.CORRECTION_RATE_LIMIT_WINDOW_MINUTES = "45";
    process.env.CORRECTION_VELOCITY_ALERT_THRESHOLD_PER_WINDOW = "4";
    process.env.CORRECTION_MAX_PENDING_PER_CAMERA = "3";

    cameraFindUniqueMock.mockReset().mockResolvedValue(camera);
    correctionReportCountMock.mockReset().mockResolvedValue(0);
    correctionReportCreateMock.mockReset().mockResolvedValue({});
    checkCorrectionRateLimitMock.mockReset().mockResolvedValue({
      allowed: true,
      counts: { signalCount: 0, globalCount: 0 },
    });
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
  });

  it("returns the generic accepted response when rate-limited", async () => {
    checkCorrectionRateLimitMock.mockResolvedValue({
      allowed: false,
      counts: { signalCount: 99, globalCount: 99 },
    });

    const res = await POST(postRequest(validBody({ operator: "NSW Police" })));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      status: "received",
      message: "Thanks, your correction has been received and is under review.",
    });
    expect(correctionReportCreateMock).not.toHaveBeenCalled();
  });

  // A nonexistent camera id and an existing-but-unverified one hit the same
  // findUnique(where: { id, moderationState: verified }) query and both
  // resolve to null, so a single case covers both rejection reasons.
  it("returns the generic accepted response when the camera doesn't exist or isn't verified", async () => {
    cameraFindUniqueMock.mockResolvedValue(null);

    const res = await POST(postRequest(validBody({ operator: "NSW Police" })));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      status: "received",
      message: "Thanks, your correction has been received and is under review.",
    });
    expect(correctionReportCreateMock).not.toHaveBeenCalled();
  });

  it("returns the generic accepted response when the camera is over its pending-correction cap", async () => {
    correctionReportCountMock.mockResolvedValue(3);

    const res = await POST(postRequest(validBody({ operator: "NSW Police" })));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      status: "received",
      message: "Thanks, your correction has been received and is under review.",
    });
    expect(correctionReportCreateMock).not.toHaveBeenCalled();
  });

  it("returns the generic accepted response when the proposal diffs to nothing", async () => {
    const res = await POST(postRequest(validBody()));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      status: "received",
      message: "Thanks, your correction has been received and is under review.",
    });
    expect(correctionReportCreateMock).not.toHaveBeenCalled();
  });

  it("gives every rejection reason the byte-identical response body", async () => {
    checkCorrectionRateLimitMock.mockResolvedValueOnce({
      allowed: false,
      counts: { signalCount: 99, globalCount: 99 },
    });
    const rateLimited = await (await POST(postRequest(validBody({ operator: "NSW Police" })))).json();

    cameraFindUniqueMock.mockResolvedValueOnce(null);
    const notFound = await (await POST(postRequest(validBody({ operator: "NSW Police" })))).json();

    correctionReportCountMock.mockResolvedValueOnce(3);
    const overCap = await (await POST(postRequest(validBody({ operator: "NSW Police" })))).json();

    const noOpDiff = await (await POST(postRequest(validBody()))).json();

    expect(rateLimited).toEqual(notFound);
    expect(notFound).toEqual(overCap);
    expect(overCap).toEqual(noOpDiff);
  });

  it("only differentiates a genuinely malformed request body, with a 400", async () => {
    const res = await POST(postRequest({ cameraId: camera.id }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.status).toBe("invalid");
    expect(correctionReportCreateMock).not.toHaveBeenCalled();
  });

  it("creates a correction and returns the same generic body on a real, in-cap proposal", async () => {
    const res = await POST(postRequest(validBody({ operator: "NSW Police" })));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      status: "received",
      message: "Thanks, your correction has been received and is under review.",
    });
    expect(correctionReportCreateMock).toHaveBeenCalledTimes(1);
  });

  it("creates a correction reporting removal even when no other field changed", async () => {
    const res = await POST(postRequest(validBody({ reportedRemoved: true })));

    expect(res.status).toBe(200);
    expect(correctionReportCreateMock).toHaveBeenCalledTimes(1);
    expect(correctionReportCreateMock.mock.calls[0][0].data).toMatchObject({ reportedRemoved: true });
  });

  it("ignores a removal report for a camera that's already removed", async () => {
    cameraFindUniqueMock.mockResolvedValue({ ...camera, status: CameraStatus.removed });

    const res = await POST(postRequest(validBody({ reportedRemoved: true })));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      status: "received",
      message: "Thanks, your correction has been received and is under review.",
    });
    expect(correctionReportCreateMock).not.toHaveBeenCalled();
  });
});

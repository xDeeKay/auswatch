import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { evaluateRateLimit } from "./rate-limit";

const limits = { maxPerSignal: 3, maxGlobal: 11 };

const cameraCountMock = vi.fn();
const correctionReportCountMock = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    camera: { count: (...args: unknown[]) => cameraCountMock(...args) },
    correctionReport: { count: (...args: unknown[]) => correctionReportCountMock(...args) },
  },
}));

const { checkSubmissionRateLimit, checkCorrectionRateLimit } = await import("./rate-limit");

const SUBMISSION_ENV_KEYS = [
  "SUBMISSION_RATE_LIMIT_WINDOW_MINUTES",
  "SUBMISSION_RATE_LIMIT_MAX_PER_SIGNAL_WINDOW",
  "SUBMISSION_RATE_LIMIT_MAX_GLOBAL_PER_WINDOW",
] as const;

const CORRECTION_ENV_KEYS = [
  "CORRECTION_RATE_LIMIT_WINDOW_MINUTES",
  "CORRECTION_RATE_LIMIT_MAX_PER_SIGNAL_WINDOW",
  "CORRECTION_RATE_LIMIT_MAX_GLOBAL_PER_WINDOW",
] as const;

describe("checkSubmissionRateLimit / checkCorrectionRateLimit isolation", () => {
  const originalEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    cameraCountMock.mockReset().mockResolvedValue(0);
    correctionReportCountMock.mockReset().mockResolvedValue(0);
    for (const key of [...SUBMISSION_ENV_KEYS, ...CORRECTION_ENV_KEYS]) {
      originalEnv[key] = process.env[key];
    }
  });

  afterEach(() => {
    for (const key of [...SUBMISSION_ENV_KEYS, ...CORRECTION_ENV_KEYS]) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
  });

  it("checkSubmissionRateLimit only queries camera.count, never correctionReport.count", async () => {
    process.env.SUBMISSION_RATE_LIMIT_WINDOW_MINUTES = "60";
    process.env.SUBMISSION_RATE_LIMIT_MAX_PER_SIGNAL_WINDOW = "5";
    process.env.SUBMISSION_RATE_LIMIT_MAX_GLOBAL_PER_WINDOW = "200";

    await checkSubmissionRateLimit("token-a");

    expect(cameraCountMock).toHaveBeenCalled();
    expect(correctionReportCountMock).not.toHaveBeenCalled();
  });

  it("checkCorrectionRateLimit only queries correctionReport.count, never camera.count", async () => {
    process.env.CORRECTION_RATE_LIMIT_WINDOW_MINUTES = "60";
    process.env.CORRECTION_RATE_LIMIT_MAX_PER_SIGNAL_WINDOW = "4";
    process.env.CORRECTION_RATE_LIMIT_MAX_GLOBAL_PER_WINDOW = "150";

    await checkCorrectionRateLimit("token-a");

    expect(correctionReportCountMock).toHaveBeenCalled();
    expect(cameraCountMock).not.toHaveBeenCalled();
  });

  it("checkSubmissionRateLimit throws if only CORRECTION_* env vars are set (no fallback bleed between namespaces)", async () => {
    delete process.env.SUBMISSION_RATE_LIMIT_WINDOW_MINUTES;
    process.env.CORRECTION_RATE_LIMIT_WINDOW_MINUTES = "60";
    process.env.CORRECTION_RATE_LIMIT_MAX_PER_SIGNAL_WINDOW = "4";
    process.env.CORRECTION_RATE_LIMIT_MAX_GLOBAL_PER_WINDOW = "150";

    await expect(checkSubmissionRateLimit("token-a")).rejects.toThrow(
      "SUBMISSION_RATE_LIMIT_WINDOW_MINUTES"
    );
  });

  it("checkCorrectionRateLimit throws if only SUBMISSION_* env vars are set (no fallback bleed between namespaces)", async () => {
    delete process.env.CORRECTION_RATE_LIMIT_WINDOW_MINUTES;
    process.env.SUBMISSION_RATE_LIMIT_WINDOW_MINUTES = "60";
    process.env.SUBMISSION_RATE_LIMIT_MAX_PER_SIGNAL_WINDOW = "5";
    process.env.SUBMISSION_RATE_LIMIT_MAX_GLOBAL_PER_WINDOW = "200";

    await expect(checkCorrectionRateLimit("token-a")).rejects.toThrow(
      "CORRECTION_RATE_LIMIT_WINDOW_MINUTES"
    );
  });
});

describe("evaluateRateLimit", () => {
  it("allows when under both limits", () => {
    const result = evaluateRateLimit({ signalCount: 1, globalCount: 5 }, limits);
    expect(result).toEqual({ allowed: true });
  });

  it("blocks with scope 'signal' when over the per-signal limit only", () => {
    const result = evaluateRateLimit({ signalCount: 3, globalCount: 5 }, limits);
    expect(result).toEqual({ allowed: false, scope: "signal" });
  });

  it("blocks with scope 'global' when over the global limit", () => {
    const result = evaluateRateLimit({ signalCount: 1, globalCount: 11 }, limits);
    expect(result).toEqual({ allowed: false, scope: "global" });
  });

  it("prefers 'global' scope when both limits are exceeded", () => {
    const result = evaluateRateLimit({ signalCount: 5, globalCount: 20 }, limits);
    expect(result).toEqual({ allowed: false, scope: "global" });
  });

  it("treats the limit as inclusive (count === max blocks)", () => {
    const result = evaluateRateLimit({ signalCount: 2, globalCount: 10 }, limits);
    expect(result).toEqual({ allowed: true });
  });
});

import { prisma } from "@/lib/db";
import { requireEnvNumber } from "@/lib/required-env";

export type RateLimitCounts = {
  signalCount: number;
  globalCount: number;
};

export type RateLimitThresholds = {
  maxPerSignal: number;
  maxGlobal: number;
};

export type RateLimitDecision =
  | { allowed: true }
  | { allowed: false; scope: "signal" | "global" };

export function evaluateRateLimit(
  counts: RateLimitCounts,
  limits: RateLimitThresholds
): RateLimitDecision {
  if (counts.globalCount >= limits.maxGlobal) {
    return { allowed: false, scope: "global" };
  }
  if (counts.signalCount >= limits.maxPerSignal) {
    return { allowed: false, scope: "signal" };
  }
  return { allowed: true };
}

export async function checkSubmissionRateLimit(
  reporterToken: string
): Promise<RateLimitDecision & { counts: RateLimitCounts }> {
  const windowMinutes = requireEnvNumber("SUBMISSION_RATE_LIMIT_WINDOW_MINUTES");
  const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000);

  const [signalCount, globalCount] = await Promise.all([
    prisma.camera.count({
      where: { reporterId: reporterToken, createdAt: { gte: cutoff } },
    }),
    prisma.camera.count({
      where: { createdAt: { gte: cutoff } },
    }),
  ]);

  const limits: RateLimitThresholds = {
    maxPerSignal: requireEnvNumber("SUBMISSION_RATE_LIMIT_MAX_PER_SIGNAL_WINDOW"),
    maxGlobal: requireEnvNumber("SUBMISSION_RATE_LIMIT_MAX_GLOBAL_PER_WINDOW"),
  };

  const counts: RateLimitCounts = { signalCount, globalCount };
  return { ...evaluateRateLimit(counts, limits), counts };
}

export async function checkCorrectionRateLimit(
  reporterToken: string
): Promise<RateLimitDecision & { counts: RateLimitCounts }> {
  const windowMinutes = requireEnvNumber("CORRECTION_RATE_LIMIT_WINDOW_MINUTES");
  const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000);

  const [signalCount, globalCount] = await Promise.all([
    prisma.correctionReport.count({
      where: { reporterId: reporterToken, createdAt: { gte: cutoff } },
    }),
    prisma.correctionReport.count({
      where: { createdAt: { gte: cutoff } },
    }),
  ]);

  const limits: RateLimitThresholds = {
    maxPerSignal: requireEnvNumber("CORRECTION_RATE_LIMIT_MAX_PER_SIGNAL_WINDOW"),
    maxGlobal: requireEnvNumber("CORRECTION_RATE_LIMIT_MAX_GLOBAL_PER_WINDOW"),
  };

  const counts: RateLimitCounts = { signalCount, globalCount };
  return { ...evaluateRateLimit(counts, limits), counts };
}

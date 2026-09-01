import { requireEnvNumber } from "@/lib/required-env";

export function logSubmissionVelocitySignal(event: {
  scope: "signal" | "global";
  count: number;
  windowMinutes: number;
}): void {
  const alertThreshold = requireEnvNumber("SUBMISSION_VELOCITY_ALERT_THRESHOLD_PER_WINDOW");
  if (event.count < alertThreshold) return;

  console.warn(
    JSON.stringify({
      type: "submission_velocity_alert",
      scope: event.scope,
      count: event.count,
      windowMinutes: event.windowMinutes,
      at: new Date().toISOString(),
    })
  );
}

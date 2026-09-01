export function logVelocitySignal(event: {
  kind: "submission" | "correction";
  scope: "signal" | "global";
  count: number;
  windowMinutes: number;
  alertThreshold: number;
}): void {
  if (event.count < event.alertThreshold) return;

  console.warn(
    JSON.stringify({
      type: `${event.kind}_velocity_alert`,
      scope: event.scope,
      count: event.count,
      windowMinutes: event.windowMinutes,
      at: new Date().toISOString(),
    })
  );
}

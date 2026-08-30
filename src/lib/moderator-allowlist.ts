export function isModeratorEmail(
  email: string | null | undefined,
  allowlistEnvValue: string | undefined
): boolean {
  if (!email) return false;

  const normalizedEmail = email.trim().toLowerCase();
  const allowlist = (allowlistEnvValue ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  return allowlist.includes(normalizedEmail);
}

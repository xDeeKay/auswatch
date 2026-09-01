export function requireEnvNumber(name: string): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") {
    throw new Error(`${name} must be set (no default is provided in source)`);
  }
  const value = Number(raw);
  if (Number.isNaN(value)) {
    throw new Error(`${name} is set to a non-numeric value: "${raw}"`);
  }
  return value;
}

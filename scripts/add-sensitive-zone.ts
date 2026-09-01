import { prisma } from "@/lib/db";
import { SensitiveZoneCategory } from "@/generated/prisma/enums";

function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (const arg of argv) {
    const match = /^--([^=]+)=(.*)$/.exec(arg);
    if (match) args[match[1]!] = match[2]!;
  }
  return args;
}

function usageAndExit(message?: string): never {
  if (message) console.error(`Error: ${message}\n`);
  console.error(
    "Usage: npm run zone:add -- --category=<category> --lat=<lat> --lng=<lng> --radius=<meters> --note=\"<note>\"\n" +
      `Categories: ${Object.values(SensitiveZoneCategory).join(", ")}`
  );
  process.exit(1);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const category = args.category as SensitiveZoneCategory;
  if (!Object.values(SensitiveZoneCategory).includes(category)) {
    usageAndExit(`--category must be one of: ${Object.values(SensitiveZoneCategory).join(", ")}`);
  }

  const lat = Number(args.lat);
  const lng = Number(args.lng);
  const radius = Number(args.radius);

  if (!Number.isFinite(lat) || lat < -90 || lat > 90) usageAndExit("--lat must be a number between -90 and 90");
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) usageAndExit("--lng must be a number between -180 and 180");
  if (!Number.isFinite(radius) || radius <= 0) usageAndExit("--radius must be a positive number of meters");

  const zone = await prisma.sensitiveZone.create({
    data: {
      category,
      lat,
      lng,
      radiusMeters: Math.round(radius),
      note: args.note ?? "",
    },
  });

  console.log(`Created SensitiveZone ${zone.id} (${zone.category})`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

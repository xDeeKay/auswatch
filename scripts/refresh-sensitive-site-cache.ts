import "dotenv/config";
import { refreshSensitiveSiteOsmCache } from "@/lib/sensitive-site-cache-refresh";

async function main() {
  console.log("Fetching nationwide OSM sensitive-site features...");
  const result = await refreshSensitiveSiteOsmCache();

  if (result.status === "error") {
    console.error(`Refresh failed, existing cache left untouched: ${result.message}`);
    process.exit(1);
  }

  console.log(`Cached ${result.featureCount} feature(s) as of ${result.refreshedAt.toISOString()}.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

const fs = require("fs");
const path = require("path");

// maplibre-gl's ESM build locates its worker script via `import.meta.url`,
// which only resolves correctly when the module is loaded as a real network
// URL - once webpack bundles it into an app chunk, that URL points at the
// chunk itself, not the actual worker file, and the worker silently fails to
// load (no vector tiles ever render, only non-source style layers). Serving
// the worker (and the shared chunk it imports) as static files and pointing
// maplibre-gl's config.WORKER_URL at them side-steps bundling entirely.
const files = ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"];
const srcDir = path.join(__dirname, "..", "node_modules", "maplibre-gl", "dist");
const destDir = path.join(__dirname, "..", "public");

fs.mkdirSync(destDir, { recursive: true });

for (const file of files) {
  fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
}

console.log(`Copied ${files.join(", ")} to public/`);

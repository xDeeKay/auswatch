import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // sharp ships a platform-specific native binary; without this, standalone
  // output's file tracing can fail to carry it into the Docker runtime image.
  serverExternalPackages: ["sharp"],
};

export default nextConfig;

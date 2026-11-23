import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";

// Phones open the dev server using a LAN IP instead of localhost. Next.js
// requires those hostnames to be explicitly allowed for its dev resources.
const localAddresses = Object.values(networkInterfaces())
  .flatMap((addresses) => addresses ?? [])
  .filter(
    (address) =>
      address.family === "IPv4" && !address.address.startsWith("169.254."),
  )
  .map((address) => address.address);

const nextConfig: NextConfig = {
  devIndicators: false,
  allowedDevOrigins: [...new Set(["127.0.0.1", ...localAddresses])],
  output: "standalone",
};

export default nextConfig;

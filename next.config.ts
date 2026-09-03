import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // RainbowKit's Coinbase connector optionally pulls in @coinbase/cdp-sdk's
  // x402/Solana payment code, whose subpackages aren't installed. We don't
  // use that path (EVM-only vault), so keep it external instead of bundling.
};

export default nextConfig;

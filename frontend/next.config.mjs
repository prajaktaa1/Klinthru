import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

// Keep production builds from replacing the running dev server's CSS and chunks.
export default (phase) => ({
  reactStrictMode: true,
  experimental: { externalDir: true },
  distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next"
});

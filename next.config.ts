import type { NextConfig } from "next";

// b2b.hackclub.app is the canonical host. Nest points both domains at this
// same server (one container, one port), so the alias is folded in here as a
// host-matched redirect rather than a second process: anything arriving on
// back-to-basics.hackclub.app is sent to the short host, path and all.
const CANONICAL_HOST = "b2b.hackclub.app";
const ALIAS_HOSTS = ["back-to-basics.hackclub.app"];

const nextConfig: NextConfig = {
  async redirects() {
    return ALIAS_HOSTS.map((host) => ({
      source: "/:path*",
      has: [{ type: "host" as const, value: host }],
      destination: `https://${CANONICAL_HOST}/:path*`,
      permanent: true,
    }));
  },
};

export default nextConfig;

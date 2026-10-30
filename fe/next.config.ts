import type { NextConfig } from "next";

if (process.env.VERCEL === "1") {
  if (
    !process.env.API_INTERNAL_URL?.startsWith("https://") ||
    !process.env.NEXT_PUBLIC_API_WS_URL?.startsWith("wss://") ||
    process.env.NEXT_PUBLIC_HOSTED_UPLOADS !== "1"
  ) {
    throw new Error(
      "Set API_INTERNAL_URL (https), NEXT_PUBLIC_API_WS_URL (wss), and NEXT_PUBLIC_HOSTED_UPLOADS=1 before building Jude on Vercel.",
    );
  }
}

const nextConfig: NextConfig = {
  async rewrites() {
    const api = process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8000";
    return [{ source: "/api/:path*", destination: `${api}/api/:path*` }];
  },
};

export default nextConfig;

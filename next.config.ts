import type { NextConfig } from "next";

const backendUrl =
  process.env.API_BACKEND_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  'http://localhost:8000'

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl.replace(/\/$/, '')}/api/:path*`,
      },
    ]
  },
};

export default nextConfig;

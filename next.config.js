/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // ESLint runs separately via `npm run lint`.
    // Storybook plugin conflict causes false parse errors during build.
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [
      {
        // CORS for API routes — allows React Native mobile app (different origin)
        source: "/api/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            // In production: set to specific mobile app origin or use env var
            value: process.env.CORS_ALLOWED_ORIGIN || "*",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
          {
            key: "Access-Control-Max-Age",
            value: "86400",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;

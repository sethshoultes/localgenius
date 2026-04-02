/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // ESLint runs separately via `npm run lint`.
    // Storybook plugin conflict causes false parse errors during build.
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;

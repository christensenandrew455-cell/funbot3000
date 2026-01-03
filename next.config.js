/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Prevent Next.js from bundling playwright-core (server only)
    if (isServer) {
      config.externals.push("playwright-core");
    }
    return config;
  },
  experimental: {
    runtime: "nodejs" // ensure API routes use Node runtime
  }
};

module.exports = nextConfig;

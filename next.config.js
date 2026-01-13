/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // You can remove outputFileTracingIncludes if not using Puppeteer
    // outputFileTracingIncludes: {
    //   "app/api/generate/route": [
    //     "node_modules/@sparticuz/chromium/**"
    //   ]
    // }
  },
  reactStrictMode: true,
};

module.exports = nextConfig;

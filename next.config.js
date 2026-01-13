/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    outputFileTracingIncludes: {
      "app/api/generate/route": [
        "node_modules/@sparticuz/chromium/**"
      ]
    }
  }
};

module.exports = nextConfig;

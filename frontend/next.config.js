/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 500,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
  async rewrites() {
    // BACKEND_ORIGIN is a server/build-time environment variable (e.g. configured on Vercel).
    // In local development, fall back to http://localhost:5000 if not specified.
    const backendOrigin = (
      process.env.BACKEND_ORIGIN ||
      (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000')
    ).trim().replace(/\/$/, '');

    if (!backendOrigin) {
      return [];
    }

    return [
      {
        source: '/api/:path*',
        destination: `${backendOrigin}/api/:path*`,
      },
    ];
  },
};

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer(nextConfig);

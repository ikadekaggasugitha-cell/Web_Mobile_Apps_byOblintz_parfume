/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@oblintz/shared'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      // Uploaded media is served by the API over http in dev / same-host setups
      // (e.g. http://<host>:5001/uploads/...). Allow http so next/image can load it.
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:5001',
  },
};

module.exports = nextConfig;

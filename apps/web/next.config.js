/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@oblintz/shared'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.API_URL,
  },
};

module.exports = nextConfig;

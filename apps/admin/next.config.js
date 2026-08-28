/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@oblintz/shared'],
  images: {
    domains: ['localhost'],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.API_URL || 'http://localhost:5000',
  },
};

module.exports = nextConfig;

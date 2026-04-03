/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  serverExternalPackages: ['viem', '@x402/fetch', '@x402/evm', '@x402/core'],
};

module.exports = nextConfig;

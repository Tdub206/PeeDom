import { fileURLToPath } from 'node:url';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Graduated out of `experimental` in Next 15.5.
  typedRoutes: true,
  // The mobile Expo app lives in the repo root; we don't want Next
  // trying to trace node_modules up there.
  outputFileTracingRoot: fileURLToPath(new URL('.', import.meta.url)),
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
};

export default nextConfig;

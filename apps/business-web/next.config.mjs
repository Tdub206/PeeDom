import path from 'node:path';
import { fileURLToPath } from 'node:url';

const configDir = fileURLToPath(new URL('.', import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Graduated out of `experimental` in Next 15.5.
  typedRoutes: true,
  // The mobile Expo app lives in the repo root; we don't want Next
  // trying to trace node_modules up there.
  outputFileTracingRoot: configDir,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  webpack(config) {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      '@': path.join(configDir, 'src'),
    };
    return config;
  },
};

export default nextConfig;

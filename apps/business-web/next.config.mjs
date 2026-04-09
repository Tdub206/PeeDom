/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Keeps us honest — forces server actions to be opt-in per file.
    typedRoutes: true,
  },
  // The mobile Expo app lives in the repo root; we don't want Next
  // trying to trace node_modules up there.
  outputFileTracingRoot: new URL('.', import.meta.url).pathname,
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

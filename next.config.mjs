/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Don't fail prod builds on lint warnings — Vercel runs ESLint by default
  // and we don't want a stale ESLint plugin missing on CI to break deploys.
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'prisma'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'models.readyplayer.me' },
      { protocol: 'https', hostname: 'api.readyplayer.me' },
    ],
  },
  webpack: (config) => {
    config.module.rules.push({ test: /\.(glb|gltf)$/, type: 'asset/resource' });
    return config;
  },
};
export default nextConfig;

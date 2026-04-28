/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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

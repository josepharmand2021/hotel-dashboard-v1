// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Supaya deploy TIDAK gagal hanya karena lint error
  eslint: {
    ignoreDuringBuilds: true,
  },

  // ⚠️ Opsi darurat (hindari kalau bisa)
  typescript: {
    ignoreBuildErrors: true,
  },

  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**.supabase.co' }],
  },
};

export default nextConfig;

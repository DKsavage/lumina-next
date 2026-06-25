import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'xkkvudlpuvvctkbklsox.supabase.co' },
    ],
    // AVIF > WebP : meilleure compression pour les photos haute résolution des candidatures
    formats: ['image/avif', 'image/webp'],
    // 24h de cache CDN : évite de re-signer les URLs Supabase Storage à chaque render
    minimumCacheTTL: 86400,
  },
}

export default nextConfig

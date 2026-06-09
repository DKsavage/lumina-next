import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    /* picsum.photos = photos placeholder pendant le dev.
       À remplacer par les vraies photos Supabase Storage en prod. */
    remotePatterns: [
      { protocol: 'https', hostname: 'picsum.photos' },
    ],
  },
}

export default nextConfig

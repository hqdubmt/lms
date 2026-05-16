import type { NextConfig } from 'next';

const config: NextConfig = {
  compress: true,
  poweredByHeader: false,
  allowedDevOrigins: ['103.82.24.142'],

  experimental: {
    optimizePackageImports: ['lucide-react'],
  },

  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'https', hostname: '**' },
    ],
    // Cache ảnh lâu hơn (7 ngày)
    minimumCacheTTL: 604800,
  },

  async headers() {
    return [
      {
        // Cache static assets dài hạn
        source: '/_next/static/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        // Cache font
        source: '/fonts/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },

  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.INTERNAL_API_URL || 'http://localhost:4000'}/:path*`,
      },
    ];
  },
};

export default config;

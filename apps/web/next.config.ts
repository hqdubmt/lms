import type { NextConfig } from 'next';
import crypto from 'crypto';

// Build ID dùng để bust cache trình duyệt khi deploy phiên bản mới
const buildId = process.env.BUILD_ID || crypto.randomBytes(8).toString('hex');

const config: NextConfig = {
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  allowedDevOrigins: ['103.82.24.142', '100.109.210.10', 'hqdu.tamarin-pinecone.ts.net', process.env.ALLOWED_DEV_ORIGIN].filter(Boolean) as string[],
  generateBuildId: async () => buildId,

  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
    // Optimize server component rendering
    serverMinification: true,
  },

  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: '**' },
      { protocol: 'https', hostname: '**' },
    ],
    minimumCacheTTL: 604800, // 7 days
    formats: ['image/avif', 'image/webp'],
  },

  async headers() {
    const isProd = process.env.NODE_ENV === 'production';
    return [
      {
        // HTML pages không cache để luôn nhận phiên bản mới nhất
        source: '/((?!_next/static|_next/image|favicon).*)',
        headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }],
      },
      // Chỉ cache immutable trong production — dev dùng content-hash nên an toàn
      // Dev không dùng hash → phải để browser tự re-fetch khi HMR không hoạt động
      ...(isProd ? [
        {
          source: '/_next/static/:path*',
          headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
        },
        {
          source: '/fonts/:path*',
          headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
        },
      ] : [
        {
          source: '/_next/static/:path*',
          headers: [{ key: 'Cache-Control', value: 'no-cache, no-store' }],
        },
      ]),
      {
        // Public API data: revalidate every 2 minutes
        source: '/api/courses',
        headers: [{ key: 'Cache-Control', value: 'public, s-maxage=120, stale-while-revalidate=300' }],
      },
      {
        source: '/api/courses/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, s-maxage=300, stale-while-revalidate=600' }],
      },
      {
        source: '/api/meta/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, s-maxage=3600, stale-while-revalidate=7200' }],
      },
    ];
  },

  async rewrites() {
    const apiDest = process.env.INTERNAL_API_URL || 'http://localhost:4000';
    return [
      // Proxy Socket.IO through Next.js so WSS works on HTTPS domains (Tailscale etc.)
      {
        source: '/socket.io/:path*',
        destination: `${apiDest}/socket.io/:path*`,
      },
      {
        source: '/api/:path*',
        destination: `${apiDest}/:path*`,
      },
    ];
  },
};

export default config;

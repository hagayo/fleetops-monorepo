/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { typedRoutes: true },
  async rewrites() {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4330';
    // Proxy any request under /api/* to the gateway during dev
    return [
      {
        source: '/api/:path*',
        destination: `${apiBase}/:path*`
      }
    ];
  },
  eslint: { ignoreDuringBuilds: false }
};

module.exports = nextConfig;

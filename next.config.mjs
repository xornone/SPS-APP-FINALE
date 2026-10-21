/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: false,
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    // staleTimes permet des transitions instantanées (0ms) entre les onglets
    // et lors des retours arrière pendant 30 secondes. En cas d'action
    // (inscription, suppression) ou de Pull-to-Refresh, router.refresh() purge
    // immédiatement ce cache.
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
};

export default nextConfig;

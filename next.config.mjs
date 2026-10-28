/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  // TypeScript errors fail the build (the default); keep it that way
  images: {
    unoptimized: true,
  },
  // Sign-in lives at "/"; auth helpers and stale-token handlers send users to /login
  async redirects() {
    return [
      { source: "/login", destination: "/", permanent: false },
      // Older English-path legal pages, replaced by the Turkish ones
      { source: "/privacy-policy", destination: "/gizlilik-politikasi", permanent: true },
      { source: "/data-processing-notice", destination: "/kvkk", permanent: true },
    ];
  },
}

export default nextConfig

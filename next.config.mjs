/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Sign-in lives at "/"; auth helpers and stale-token handlers send users to /login
  async redirects() {
    return [{ source: "/login", destination: "/", permanent: false }];
  },
}

export default nextConfig

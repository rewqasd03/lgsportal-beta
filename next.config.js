/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // TypeScript hatalarını build sırasında ignore et
    ignoreBuildErrors: true,
  },
  eslint: {
    // ESLint hatalarını da ignore et
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    // Enable if using server actions with Prisma in Next.js 14
    // serverActions: true,
  },
};

module.exports = nextConfig;

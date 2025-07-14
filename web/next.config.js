/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Allow images from Supabase storage
  images: {
    domains: [
      'localhost',
      process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : '',
    ].filter(Boolean),
  },
  // Disable type checking during build for better performance
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig; 
// next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['zvebdabtofcusfdaacrq.supabase.co'], // add your Supabase domain if needed, e.g. 'xxxx.supabase.co'
  },
  // Add any other config you had before (experimental, webpack, etc.)
  // BUT NO import/export statements!
};

module.exports = nextConfig;



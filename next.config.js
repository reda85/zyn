// next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['zvebdabtofcusfdaacrq.supabase.co'], // add your Supabase domain if needed, e.g. 'xxxx.supabase.co'
  },
  // Anciennes routes hors organisation (supprimées) : retour au point d'entrée.
  async redirects() {
    return ['/members', '/settings', '/reports', '/profile'].map((source) => ({
      source,
      destination: '/workspaces',
      permanent: false,
    }))
  },
};

module.exports = nextConfig;



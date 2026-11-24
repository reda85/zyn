// next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['zvebdabtofcusfdaacrq.supabase.co'], // add your Supabase domain if needed, e.g. 'xxxx.supabase.co'
  },
  // Mesure d'audience Umami relayée par notre domaine : /mesure/script.js et
  // /mesure/api/send. Les bloqueurs qui visent cloud.umami.is ne coupent pas la mesure.
  async rewrites() {
    const umami = process.env.UMAMI_ORIGINE ?? 'https://cloud.umami.is'
    return [{ source: '/mesure/:chemin*', destination: `${umami}/:chemin*` }]
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



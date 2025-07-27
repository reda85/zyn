import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode : false
};

// next.config.js
module.exports = {
  images: {
    domains: ['zvebdabtofcusfdaacrq.supabase.co'], // your Supabase project domain
  },
}


export default nextConfig;

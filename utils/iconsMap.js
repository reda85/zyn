

// map database string -> Lucide component

const getBaseUrl = () => {
  if (typeof window !== 'undefined') return ''; // Browser
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
};

export const pdfIconsMap = {
  "grid": `${getBaseUrl()}/icons/grid-white.png`,
  'zap': `${getBaseUrl()}/icons/zap-white.png`,
  'droplets': `${getBaseUrl()}/icons/droplets-white.png`,
  'paint': `${getBaseUrl()}/icons/paint-roller-white.png`,
  'fire-extinguisher': `${getBaseUrl()}/icons/fire-extinguisher-white.png`,
  'carrelage': `${getBaseUrl()}/icons/grid-white.png`,
  'Non assigne': `${getBaseUrl()}/icons/user-x-white.png`,
};

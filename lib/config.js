// URL du backend (rapports PDF, traitement des plans, notifications).
// Surchargeable par environnement ; la valeur par défaut est la production.
export const BACKEND_URL = (
  process.env.NEXT_PUBLIC_BACKEND_URL || 'https://zaynbackend-production.up.railway.app'
).replace(/\/$/, '')

export const getCookieDomain = (host: string): Record<string, string> => {
  const baseDomain = host.startsWith("app.") ? host.replace("app.", "") : host;

  if (baseDomain.includes("localhost")) {
    return {}; // No domain for localhost — browser handles it
  }

  if (baseDomain.endsWith(".vercel.app")) {
    return { domain: baseDomain };
  }

  return { domain: `.${baseDomain}` }; // Dot prefix = shared across subdomains
};
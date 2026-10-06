/**
 * Domaine des cookies de session, identique pour TOUS les clients Supabase
 * (middleware, serveur, navigateur).
 *
 * Si l'un d'eux écrit le cookie sans domaine pendant qu'un autre l'écrit avec
 * `.zaynspace.com`, le navigateur garde deux cookies de même nom ; l'un des
 * deux contient un jeton périmé et la session se casse de façon aléatoire
 * (« connecté mais aucune organisation », déconnexions inattendues).
 */
export const getCookieDomain = (host: string): Record<string, string> => {
  const hostname = (host || "").split(":")[0].toLowerCase();
  const baseDomain = hostname.startsWith("app.") ? hostname.slice(4) : hostname;

  // Pas de domaine explicite en local ou sur une adresse IP : le navigateur s'en charge.
  if (!baseDomain || baseDomain === "localhost" || /^[\d.]+$/.test(baseDomain) || !baseDomain.includes(".")) {
    return {};
  }

  // `vercel.app` est un suffixe public : le cookie doit porter l'hôte exact.
  if (baseDomain.endsWith(".vercel.app")) {
    return { domain: baseDomain };
  }

  return { domain: `.${baseDomain}` }; // partagé entre zaynspace.com et app.zaynspace.com
};

/** Vrai pour les cookies de session Supabase (`sb-<ref>-auth-token`, éventuellement découpés `.0`, `.1`…). */
export const isAuthCookieName = (name: string) => /^sb-.+-auth-token(\.\d+)?$/.test(name);

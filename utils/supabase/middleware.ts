import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

// Define the hosts/prefixes for clarity and easy modification
const APP_SUBDOMAIN = 'app.';
const SIGN_IN_URL = '/sign-in';
const APP_DASHBOARD_PATH = '/projects'; // Assuming your app's main page is /projects

// Liste des chemins d'authentification pour la flexibilité
const AUTH_PATHS = [
    SIGN_IN_URL,
    '/sign-up',
    '/forgot-password',
    '/reset-password',
    '/auth/callback'  
];

// Vérifie si un chemin donné est une page d'authentification
const isAuthPath = (pathname: string) => AUTH_PATHS.includes(pathname);

export const updateSession = async (request: NextRequest) => {
  // Use the host header to determine if the user is accessing the app subdomain
  const hostHeader = request.headers.get('host') || '';
  const isAppSubdomain = hostHeader.startsWith(APP_SUBDOMAIN);
  
  // Dynamic calculation of the base domain (e.g., 'localhost:3000' or 'zaynspace.com')
  const baseDomain = hostHeader.startsWith(APP_SUBDOMAIN)
    ? hostHeader.replace(APP_SUBDOMAIN, '')
    : hostHeader;

  // This try/catch block is for handling environment variable setup errors.
  try {
    // 1. Create an unmodified response template
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    // 2. Create Supabase client with cookie handling
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value),
            );
            // Recreate response with updated request cookies for subsequent logic
            response = NextResponse.next({ request });
            
            // Set response cookies for browser
            cookiesToSet.forEach(({ name, value, options }) => {
              
              // --- DYNAMIC COOKIE DOMAIN FIX: CLÉ POUR LES SOUS-DOMAINES ---
              let finalDomainOption = {};
              
              if (baseDomain.includes('localhost')) {
                // 1. Environnement Local
                finalDomainOption = { domain: 'localhost' };
              } else if (baseDomain.endsWith('.vercel.app')) {
                 // 2. Domaines Vercel (eTLD+1), pas de point de tête
                 finalDomainOption = { domain: baseDomain }; 
              } else {
                // 3. Domaine Personnalisé (e.g., zaynspace.com)
                // Le point de tête est OBLIGATOIRE (e.g., .zaynspace.com) pour le partage de session
                finalDomainOption = { domain: `.${baseDomain}` }; 
              }

              response.cookies.set(name, value, {
                ...options,
                ...finalDomainOption,
                // Ensure secure flag is set correctly based on HTTPS
                secure: request.nextUrl.protocol === 'https:' || options.secure,
              });
            });
          },
        },
      },
    );

    // 3. Refresh Supabase session
    const { data: { user } } = await supabase.auth.getUser();

    // --- NEW AUTHORIZATION LOGIC ---
    
    // A. Protect the entire app subdomain
    if (isAppSubdomain && !user) {
      const mainDomainHost = baseDomain;
      
      // Use request.nextUrl.protocol to preserve http/https scheme
      const redirectUrl = `${request.nextUrl.protocol}//${mainDomainHost}${SIGN_IN_URL}`;
      
      // FIX: Permet l'accès aux chemins d'authentification sur le sous-domaine
      // pour que la connexion puisse être initiée de là si nécessaire.
      if (!isAuthPath(request.nextUrl.pathname)) {
        return NextResponse.redirect(new URL(redirectUrl));
      }
    }

    // B. Handle unauthenticated users trying to access the main site's protected routes
    if (request.nextUrl.pathname.startsWith("/protected") && !user) {
      return NextResponse.redirect(new URL(SIGN_IN_URL, request.url));
    }
    
    // C. Redirect authenticated users hitting the dashboard path or any auth path on the main domain.
    // L'utilisateur connecté peut accéder à la racine ("/") sans redirection.
    if (
      user &&
      !isAppSubdomain && // NEVER redirect inside app.domain
      (request.nextUrl.pathname.startsWith(APP_DASHBOARD_PATH) || isAuthPath(request.nextUrl.pathname)) // <-- Redirige s'il essaie d'accéder à /projects OU à une page d'auth
    ) {
      const appHost = APP_SUBDOMAIN + baseDomain;
      
      // Détermine la destination : si c'est une page d'auth, on redirige vers /projects
      const destinationPath = isAuthPath(request.nextUrl.pathname) 
        ? APP_DASHBOARD_PATH
        : request.nextUrl.pathname;

      const redirectUrl = `${request.nextUrl.protocol}//${appHost}${destinationPath}`;
      
      return NextResponse.redirect(new URL(redirectUrl));
    }
    
    // --- END AUTHORIZATION LOGIC ---

    // 4. Return the response (which may now contain new session cookies)
    return response;
  } catch (e) {
    // Handle Supabase client creation errors (e.g., missing ENV vars)
    console.error("Supabase client creation error in middleware:", e);
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }
};
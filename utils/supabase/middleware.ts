import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

// Define the hosts/prefixes for clarity and easy modification
const APP_SUBDOMAIN = 'app.';
const SIGN_IN_URL = '/sign-in';
const APP_DASHBOARD_PATH = '/projects'; // Assuming your app's main page is /dashboard
const baseDomain = 'zaynspace.com';
export const updateSession = async (request: NextRequest) => {
  // Use the host header to determine if the user is accessing the app subdomain
  const hostHeader = request.headers.get('host') || '';
  const isAppSubdomain = hostHeader.startsWith(APP_SUBDOMAIN);
  
  // Dynamic calculation of the base domain (e.g., 'localhost:3000' or 'zyn-jet.vercel.app')
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
              
              // --- DYNAMIC COOKIE DOMAIN FIX ---
              let finalDomainOption = {};
              // For localhost/development, we use 'localhost' or let it default
              if (baseDomain.includes('localhost')) {
                finalDomainOption = { domain: 'localhost' };
              } 
              // For production (e.g., Vercel), we MUST use the exact domain 
              // without the leading dot to avoid the eTLD+1 security block.
              else {
                // Use the base domain (e.g., zyn-jet.vercel.app)
                finalDomainOption = { domain: baseDomain }; 
              }

              response.cookies.set(name, value, {
                ...options,
                ...finalDomainOption,
                // Ensure secure flag is set correctly based on Vercel's use of HTTPS
                secure: baseDomain.includes('.vercel.app') || options.secure,
              });
            });
          },
        },
      },
    );

    // 3. Refresh Supabase session
    const { data: { user } } = await supabase.auth.getUser();

    // --- NEW AUTHORIZATION LOGIC ---
    
    // Si aucune règle ne correspond ci-dessous pour un utilisateur non connecté,
    // la requête passera par défaut via `return response` à la fin,
    // permettant l'accès à localhost:3000 ou localhost:3000/sign-in.


    // A. Protect the entire app subdomain
    if (isAppSubdomain && !user) {
      const mainDomainHost = baseDomain; // Already calculated base domain
      
      // Use request.nextUrl.origin to preserve http/https scheme
      const redirectUrl = `${request.nextUrl.protocol}//${mainDomainHost}${SIGN_IN_URL}`;
      
      // La règle suivante permet à l'utilisateur non authentifié d'accéder à
      // app.localhost:3000/sign-in SANS être redirigé vers localhost:3000/sign-in.
      if (request.nextUrl.pathname !== SIGN_IN_URL) {
        return NextResponse.redirect(new URL(redirectUrl));
      }
    }

    // B. Handle unauthenticated users trying to access the main site's protected routes
    if (request.nextUrl.pathname.startsWith("/protected") && !user) {
      return NextResponse.redirect(new URL(SIGN_IN_URL, request.url));
    }
    
    // C. Redirect authenticated users hitting the dashboard path on the main domain.
    // L'utilisateur connecté peut désormais accéder à la racine ("/") sans redirection.
    if (
      user &&
      !isAppSubdomain && // NEVER redirect inside app.domain
      request.nextUrl.pathname.startsWith(APP_DASHBOARD_PATH) // <-- SEULEMENT POUR /projects*
    ) {
      const appHost = APP_SUBDOMAIN + baseDomain;
      
      // Utilisation du chemin complet pour la redirection (e.g., /projects/123)
      const redirectUrl = `${request.nextUrl.protocol}//${appHost}${request.nextUrl.pathname}`;
      
      return NextResponse.redirect(new URL(redirectUrl));
    }
    
    // --- END AUTHORIZATION LOGIC ---

    // 4. Return the response (which may now contain new session cookies)
    // Si l'utilisateur est déconnecté et demande la racine ou /sign-in,
    // aucune des règles A, B ou C n'est déclenchée, et le contrôle est renvoyé à Next.js (OK).
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
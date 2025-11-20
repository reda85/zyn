import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

// Define the hosts/prefixes for clarity and easy modification
const APP_SUBDOMAIN = 'app.';
const SIGN_IN_URL = '/sign-in';
const APP_DASHBOARD_PATH = '/projects'; // Assuming your app's main page is /dashboard

export const updateSession = async (request: NextRequest) => {
  // Use the host header to determine if the user is accessing the app subdomain
  const hostHeader = request.headers.get('host') || '';
  const isAppSubdomain = hostHeader.startsWith(APP_SUBDOMAIN);
  
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
              const domainOption = process.env.NEXT_PUBLIC_VERCEL_ENV === 'development'
              ? { domain: 'localhost' } // Pour localhost, il suffit de 'localhost' (ou ne rien mettre)
              : { domain: `.zyn-jet.vercel.app` }; // Pour production, il faut mettre le domaine

            response.cookies.set(name, value, {
              ...options,
              ...domainOption,
            });
            }
            );
          },
        },
      },
    );

    // 3. Refresh Supabase session
    const { data: { user } } = await supabase.auth.getUser();

    // --- NEW AUTHORIZATION LOGIC ---

    // A. Protect the entire app subdomain
    if (isAppSubdomain && !user) {
      // If the user is unauthenticated and on the app subdomain (e.g., app.localhost:3000/projects),
      // redirect them back to the main domain's sign-in page.
      // We must construct the full URL for cross-domain redirect.
      const mainDomainHost = hostHeader.replace(APP_SUBDOMAIN, ''); // e.g., removes 'app.' from 'app.localhost:3000'
      const redirectUrl = `http://${mainDomainHost}${SIGN_IN_URL}`;
      
      if (request.nextUrl.pathname !== SIGN_IN_URL) {
      return NextResponse.redirect(new URL(redirectUrl));
    }
    }

    // B. Handle unauthenticated users trying to access the main site's protected routes
    // (This handles legacy protection or if someone manually types /protected on the main domain)
    if (request.nextUrl.pathname.startsWith("/protected") && !user) {
      return NextResponse.redirect(new URL(SIGN_IN_URL, request.url));
    }
    
    // C. Redirect authenticated users hitting the main site root (e.g., localhost:3000/)
    if (
  user &&
  !isAppSubdomain && // NEVER redirect inside app.localhost
  (request.nextUrl.pathname === "/" || request.nextUrl.pathname === SIGN_IN_URL)
) {
  const appHost = APP_SUBDOMAIN + hostHeader.replace(APP_SUBDOMAIN, '');
  const redirectUrl = `http://${appHost}${APP_DASHBOARD_PATH}`;
  
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
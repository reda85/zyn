import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getCookieDomain } from "@/utils/supabase/cookie-domain";

const APP_SUBDOMAIN = "app.";
const SIGN_IN_URL = "/sign-in";
const APP_DASHBOARD_PATH = "/projects";

const AUTH_PATHS = [
  SIGN_IN_URL,
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
  "/accept-invite",
];

const NEVER_REDIRECT_PATHS = ["/accept-invite"];

const isAuthPath = (pathname: string) => AUTH_PATHS.includes(pathname);
const isNeverRedirectPath = (pathname: string) => NEVER_REDIRECT_PATHS.includes(pathname);

export const updateSession = async (request: NextRequest) => {
  const hostHeader = request.headers.get("host") || "";
  const isAppSubdomain = hostHeader.startsWith(APP_SUBDOMAIN);
  const baseDomain = isAppSubdomain
    ? hostHeader.replace(APP_SUBDOMAIN, "")
    : hostHeader;

  let response = NextResponse.next({
    request: { headers: request.headers },
  });

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
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });

          const domainOption = getCookieDomain(hostHeader);

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, {
              ...options,
              ...domainOption,
              secure:
                request.nextUrl.protocol === "https:" || options?.secure,
            });
          });
        },
      },
    }
  );

  const hasSessionCookie = request.cookies
    .getAll()
    .some(
      (c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token")
    );

  let user = null;

  if (hasSessionCookie) {
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      request.cookies
        .getAll()
        .filter((c) => c.name.startsWith("sb-"))
        .forEach((c) => response.cookies.delete(c.name));
    } else {
      user = data.user;
    }
  }

  // A. Protect the entire app subdomain
  if (isAppSubdomain && !user) {
    if (!isAuthPath(request.nextUrl.pathname)) {
      const redirectUrl = `${request.nextUrl.protocol}//${hostHeader}${SIGN_IN_URL}`;
      return NextResponse.redirect(new URL(redirectUrl));
    }
    return response;
  }

  // B. Handle unauthenticated users trying to access the main site's protected routes
  if (request.nextUrl.pathname.startsWith("/app") && !user) {
    return NextResponse.redirect(new URL(SIGN_IN_URL, request.url));
  }

  // C. Redirect authenticated users hitting the dashboard path or any auth path on the main domain
  // Never redirect away from /accept-invite — the user needs to set their password first
  if (
    user &&
    !isAppSubdomain &&
    !isNeverRedirectPath(request.nextUrl.pathname) &&
    (request.nextUrl.pathname.startsWith(APP_DASHBOARD_PATH) ||
      isAuthPath(request.nextUrl.pathname))
  ) {
    const appHost = APP_SUBDOMAIN + baseDomain;

    const destinationPath = isAuthPath(request.nextUrl.pathname)
      ? APP_DASHBOARD_PATH
      : request.nextUrl.pathname;

    const redirectUrl = `${request.nextUrl.protocol}//${appHost}${destinationPath}`;
    return NextResponse.redirect(new URL(redirectUrl));
  }

  return response;
};
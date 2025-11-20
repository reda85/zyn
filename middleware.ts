import { type NextRequest } from "next/server";
import { updateSession } from "./utils/supabase/middleware";


export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match toutes les routes sauf celles qui doivent être ignorées
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|sign-in|sign-up|forgot-password|reset-password|auth/callback).*)',
  ],
};

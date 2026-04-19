import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// Paths reachable without an authenticated session. `/pdf.worker.min.mjs`
// is the pdfjs worker served from public/ — the middleware matcher
// already excludes _next/static and common image types but not .mjs, so
// we whitelist it here to keep PDFs rendering even on public pages.
const publicPaths = ['/', '/sign-in', '/auth/callback', '/pdf.worker.min.mjs'];

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);

  const pathname = request.nextUrl.pathname;
  const isPublic = publicPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isApi = pathname.startsWith('/api');

  if (!user && !isPublic && !isApi) {
    const url = request.nextUrl.clone();
    url.pathname = '/sign-in';
    url.searchParams.set('returnTo', pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};

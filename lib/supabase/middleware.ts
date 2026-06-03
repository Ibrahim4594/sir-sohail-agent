import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import type { Database } from './types';

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          for (const { name, value, options } of toSet) {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Use getSession() not getUser() in middleware — getSession() reads the
  // JWT from cookies (no network call, <1ms). getUser() makes an HTTP
  // round-trip to Supabase Auth on every request, which blows Vercel's
  // ~1s middleware timeout (MIDDLEWARE_INVOCATION_TIMEOUT / 504).
  // Security note: getSession() trusts the cookie JWT without server
  // verification; that's fine for redirect logic. Route handlers call
  // getUser() to cryptographically verify before touching data.
  let user = null;
  try {
    const { data } = await supabase.auth.getSession();
    user = data.session?.user ?? null;
  } catch {
    // session parse error → treat as unauthenticated
  }
  return { response, user };
}

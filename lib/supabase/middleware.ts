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

  // getUser() can throw when @supabase/ssr's onAuthStateChange async
  // callback fails to clear cookies (e.g. expired refresh token +
  // Next.js 16 cookie-API edge cases). Catching here prevents the
  // middleware from returning a 500 — treat auth failure as signed-out.
  let user = null;
  try {
    ({
      data: { user },
    } = await supabase.auth.getUser());
  } catch {
    // auth error → treat as unauthenticated; redirect logic below handles it
  }
  return { response, user };
}

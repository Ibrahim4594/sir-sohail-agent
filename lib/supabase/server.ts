import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { type Env, env } from '@/lib/env';
import type { Database } from './types';

export async function createServerSupabase(validatedEnv?: Env) {
  const cookieStore = await cookies();
  const e = validatedEnv ?? env();
  return createServerClient<Database>(e.NEXT_PUBLIC_SUPABASE_URL, e.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        for (const { name, value, options } of toSet) {
          cookieStore.set(name, value, options);
        }
      },
    },
  });
}

export function createServiceRoleSupabase() {
  const e = env();
  return createServerClient<Database>(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, {
    cookies: { getAll: () => [], setAll: () => {} },
  });
}

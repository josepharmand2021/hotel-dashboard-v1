// src/lib/supabase/server.ts
// (tidak perlu 'use server' di sini)

import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function supabaseServer() {
  // Next 15: cookies() -> Promise<ReadonlyRequestCookies>
  // "await" juga aman di Next 14 karena await non-promise akan langsung mengembalikan value
  const cookieStore = await cookies();

  // Baca ENV dengan fallback nama yang umum
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL;

  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Missing Supabase env: URL/ANON key');
  }

  return createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        // di sebagian konteks (RSC) cookieStore bisa read-only,
        // jadi panggil hanya jika tersedia
        (cookieStore as any).set?.({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        (cookieStore as any).set?.({ name, value: '', maxAge: 0, ...options });
        // jika di Route Handler/Server Action, .set pasti ada
      },
    },
  });
}

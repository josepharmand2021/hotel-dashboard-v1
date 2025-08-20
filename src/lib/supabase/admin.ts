// src/lib/supabase/admin.ts
import 'server-only'; // ❗️akan error kalau file ini di-import dari client

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
// import type { Database } from '@/types/supabase'; // kalau kamu punya tipe DB, aktifkan ini

let _admin: SupabaseClient /* <Database> */ | undefined;

export function supabaseAdmin() {
  // ENV fallback, jangan pakai non-null assertion (!)
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL; // jaga-jaga kalau penamaan lama

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'Missing Supabase env for admin: SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
    );
  }

  if (_admin) return _admin;

  _admin = createClient(/* <Database> */ url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    // optional header agar gampang trace di log
    global: { headers: { 'X-Client-Info': 'admin-server' } },
  });

  return _admin;
}

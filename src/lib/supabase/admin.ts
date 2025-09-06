// src/lib/supabase/admin.ts
import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/** Panggil HANYA di server (Route Handler / Server Action) */
export function supabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Missing SUPABASE envs: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY'
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Kompatibel dua gaya import:
export default supabaseAdmin;           // import getAdmin from '@/lib/supabase/admin'
export const getSupabaseAdmin = supabaseAdmin; // optional alias

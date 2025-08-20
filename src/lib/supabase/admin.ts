// src/lib/supabase/admin.ts
import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _admin: SupabaseClient | undefined;

export function supabaseAdmin(): SupabaseClient {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.SUPABASE_URL; // fallback nama lama jika ada

  // ✅ utamakan SUPABASE_SERVICE_ROLE (sesuai env di Vercel), fallback ke *_KEY jika kamu masih punya lokal lama
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'Missing Supabase admin envs: NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL dan SUPABASE_SERVICE_ROLE(_KEY).'
    );
  }

  if (!_admin) {
    _admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { 'X-Client-Info': 'admin-server' } },
    });
  }
  return _admin;
}

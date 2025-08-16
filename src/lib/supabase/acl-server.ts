import { supabaseServer } from './server';

export async function requireSuperAdminServer() {
  const sb = await supabaseServer(); // <-- WAJIB await

  const { data: { user }, error: userErr } = await sb.auth.getUser();
  if (userErr) throw userErr;
  if (!user) throw new Error('Unauthorized');

  const { data: isSuper, error } = await sb.rpc('is_super_admin');
  if (error) throw error;
  if (!isSuper) throw new Error('Forbidden: superadmin only');
}

// src/lib/roles.ts
'use server';
import { supabaseServer } from '@/lib/supabase/server';

// src/lib/roles.ts
export async function getRoleFlagsServer() {
  const sb = await supabaseServer();
  const { data: isSuper } = await sb.rpc('is_super_admin');
  const { data: hasAdmin } = await sb.rpc('has_role_current', { p_code: 'admin' });
  const isSuperBool = !!isSuper;
  const isAdmin = isSuperBool || !!hasAdmin;
  const canWrite = isAdmin;
  return { isSuper: isSuperBool, isAdmin, canWrite };
}

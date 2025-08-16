'use server';
import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { supabaseServer } from '@/lib/supabase/server';
import { requireSuperAdminServer } from '@/lib/supabase/acl-server';

type RoleCode = 'viewer'|'admin'|'superadmin';

export async function createUserAndAssign({
  email, role, sendInvite = true, password, fullName,
}: { email:string; role:RoleCode; sendInvite?:boolean; password?:string; fullName?:string; }) {
  await requireSuperAdminServer();

  const admin = supabaseAdmin();
  if (sendInvite) {
    const { error } = await admin.auth.admin.inviteUserByEmail(email);
    if (error) throw error;
  } else {
    const { error } = await admin.auth.admin.createUser({
      email, password: password || crypto.randomUUID(), email_confirm: true,
    });
    if (error) throw error;
  }

  // assign role by email (pakai session saat ini, RLS jalan)
  const sb = await supabaseServer();
  const { error: assignErr } = await sb.rpc('assign_role_by_email', { p_email: email, p_code: role });
  if (assignErr) throw assignErr;

  // optional: isi profile
  if (fullName) {
    const { data: list } = await admin.auth.admin.listUsers({ page:1, perPage:1, email });
    const uid = list.users?.[0]?.id;
    if (uid) await admin.from('user_profiles').upsert({ user_id: uid, full_name: fullName });
  }

  revalidatePath('/admin/users');
}

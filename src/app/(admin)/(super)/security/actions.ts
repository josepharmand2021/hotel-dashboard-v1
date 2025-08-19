'use server';

import { supabaseAdmin } from '@/lib/supabase/admin';
import { supabaseServer } from '@/lib/supabase/server';
import { requireSuperAdminServer } from '@/lib/supabase/acl-server';

export async function superadminUpdateOwnPassword(formData: FormData) {
  await requireSuperAdminServer();

  const newPassword = String(formData.get('newPassword') ?? '').trim();
  const confirm = String(formData.get('confirm') ?? '').trim();
  if (newPassword.length < 8) throw new Error('Password must be at least 8 characters');
  if (newPassword !== confirm) throw new Error('Password confirmation does not match');

  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const admin = supabaseAdmin(); // service role bypasses current-password check
  const { error } = await admin.auth.admin.updateUserById(user.id, { password: newPassword });
  if (error) throw error;

}

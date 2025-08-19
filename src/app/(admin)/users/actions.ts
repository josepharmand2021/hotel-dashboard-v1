'use server';

import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { supabaseServer } from '@/lib/supabase/server';
import { requireSuperAdminServer } from '@/lib/supabase/acl-server';
import { requireRoleServer } from '@/lib/supabase/acl-server';


type RoleCode = 'viewer' | 'admin' | 'superadmin';

/** Create (or invite) a user, then assign a role */
export async function createUserAndAssign(formData: FormData) {
  await requireSuperAdminServer();

  const email = String(formData.get('email') || '').trim();
  const roleCode = String(formData.get('roleCode') || 'viewer') as RoleCode;
  const fullName = String(formData.get('fullName') || '').trim() || null;
  const sendInvite = formData.get('sendInvite') !== null; // checkbox presence
  const password = String(formData.get('password') || '').trim();

  if (!email) throw new Error('Email is required');
  if (!sendInvite && !password) throw new Error('Password required when invite is off');

  const admin = supabaseAdmin();

  // 1) create / invite in Auth
  if (sendInvite) {
    const { error } = await admin.auth.admin.inviteUserByEmail(email);
    if (error) throw error;
  } else {
    const { error } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      password,
      user_metadata: fullName ? { full_name: fullName } : undefined,
    });
    if (error) throw error;
  }

  // 2) assign role via RPC (runs as the current superadmin session)
  const sb = await supabaseServer();
  const { error: assignErr } = await sb.rpc('assign_role_by_email', {
    p_email: email,
    p_code: roleCode,
  });
  if (assignErr) throw assignErr;

  // 3) optional: upsert full name in your profile table
  if (fullName) {
    const { error: profErr } = await sb.rpc('upsert_profile_by_email', {
      p_email: email,
      p_full_name: fullName,
    });
    if (profErr) throw profErr;
  }

  revalidatePath('/users');
}

/** Change a user's role */
export async function changeUserRole(formData: FormData) {
  await requireSuperAdminServer();

  const email = String(formData.get('email') || '').trim();
  const roleCode = String(formData.get('roleCode') || 'viewer') as RoleCode;
  if (!email) throw new Error('Email is required');

  const sb = await supabaseServer();
  const { error } = await sb.rpc('assign_role_by_email', {
    p_email: email,
    p_code: roleCode,
  });
  if (error) throw error;

  revalidatePath('/users');
}

/** (Optional) Delete an auth user */
export async function deleteAuthUser(formData: FormData) {
  await requireSuperAdminServer();
  const userId = String(formData.get('userId') || '');
  if (!userId) throw new Error('userId is required');

  const admin = supabaseAdmin();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw error;

  revalidatePath('/users');
}

export async function sendResetLink(email: string) {
  const admin = supabaseAdmin();
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password` },
  });
  if (error) throw error;
  // data.properties.action_link -> bisa ditampilkan sebagai copy-link
  return data?.properties?.action_link as string | undefined;
}

export async function adminSetUserPassword(formData: FormData) {
  await requireRoleServer(['superadmin']); // ⬅️ superadmin only

  const userId = String(formData.get('userId') || '');
  const newPassword = String(formData.get('newPassword') || '');
  if (!userId) throw new Error('Missing userId');
  if (newPassword.length < 8) throw new Error('Password must be at least 8 characters');

  const admin = supabaseAdmin();
  const { error } = await admin.auth.admin.updateUserById(userId, { password: newPassword });
  if (error) throw error;

  return { ok: true };
}

// (opsional) generate reset link untuk dibagikan manual
export async function adminGenerateRecoveryLink(formData: FormData) {
  await requireRoleServer(['superadmin']);

  const email = String(formData.get('email') || '');
  if (!email) throw new Error('Missing email');

  const admin = supabaseAdmin();
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password` }, // jika route ini masih diaktifkan
  });
  if (error) throw error;
  return { link: data?.properties?.action_link as string | undefined };
}

// app/(admin)/users/actions.ts
export async function superadminSetUserPassword(formData: FormData): Promise<void> {
  await requireSuperAdminServer();
  const userId = String(formData.get('userId') ?? '').trim();
  const newPassword = String(formData.get('newPassword') ?? '').trim();
  if (!userId) throw new Error('userId is required');
  if (newPassword.length < 8) throw new Error('Password must be at least 8 characters');

  const admin = supabaseAdmin();
  const { error } = await admin.auth.admin.updateUserById(userId, { password: newPassword });
  if (error) throw error;
  // no return
}

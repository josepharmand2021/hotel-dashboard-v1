// src/lib/supabase/acl-server.ts
'use server';

import { supabaseServer } from './server';

export type RoleCode = 'viewer' | 'admin' | 'superadmin';

/** Ensure there's a logged-in user (throws 401-style error if not). */
async function requireUser() {
  const sb = await supabaseServer();
  const { data, error } = await sb.auth.getUser();
  if (error) throw error;
  if (!data?.user) throw new Error('Unauthorized');
  return data.user;
}

/**
 * Gate by roles (OR).
 * - Tries `has_any_role_current(p_codes text[])` first.
 * - Falls back to `has_role_current(p_code)` ONLY if the function truly doesn't exist.
 * - Throws `Forbidden` when roles are not met.
 */
export async function requireRoleServer(roles: RoleCode[] | RoleCode) {
  await requireUser();
  const list = (Array.isArray(roles) ? roles : [roles]).filter(Boolean) as RoleCode[];
  const sb = await supabaseServer();

  // 1) Try has_any_role_current
  const any = await sb.rpc('has_any_role_current', { p_codes: list });
  if (!any.error) {
    if (any.data) return;          // allowed
    throw new Error('Forbidden');  // explicit deny -> do NOT fallback
  }

  // 2) Fallback only if function truly missing
  const msg = String(any.error?.message ?? '');
  const looksMissing =
    /has_any_role_current/i.test(msg) ||
    /function .* does not exist/i.test(msg) ||
    /undefined_function/i.test(msg);

  if (!looksMissing) throw any.error;

  // 3) Loop has_role_current(p_code)
  for (const code of list) {
    const r = await sb.rpc('has_role_current', { p_code: code });
    if (r.error) throw r.error;
    if (r.data) return; // allowed
  }

  throw new Error('Forbidden');
}

/** Shorthands (must be async because of "use server") */
export async function requireSuperAdminServer() {
  await requireRoleServer('superadmin');
}
export async function requireAdminServer() {
  await requireRoleServer('admin');
}
export async function requireWriteServer() {
  await requireRoleServer(['admin', 'superadmin']);
}

/* ------------------------------------------------------------------ */
/*                          ROLE FLAG HELPERS                          */
/* ------------------------------------------------------------------ */

async function hasRole(code: RoleCode): Promise<boolean> {
  const sb = await supabaseServer();

  if (code === 'superadmin') {
    const r1 = await sb.rpc('has_role_current', { p_code: 'superadmin' });
    if (!r1.error) return !!r1.data;
    const r2 = await sb.rpc('is_super_admin');
    if (!r2.error) return !!r2.data;
    return false;
  }

  const r = await sb.rpc('has_role_current', { p_code: code });
  if (r.error) return false;
  return !!r.data;
}

export async function getRoleFlagsServer(): Promise<{
  isSuper: boolean;
  isAdmin: boolean;
  canWrite: boolean;
}> {
  await requireUser();

  const [isSuper, isAdminRole] = await Promise.all([
    hasRole('superadmin'),
    hasRole('admin'),
  ]);

  const isAdmin = isAdminRole || isSuper;
  return { isSuper, isAdmin, canWrite: isAdmin };
}

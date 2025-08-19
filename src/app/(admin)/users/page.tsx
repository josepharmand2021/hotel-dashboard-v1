import { redirect } from 'next/navigation';
import { requireSuperAdminServer } from '@/lib/supabase/acl-server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { supabaseServer } from '@/lib/supabase/server';
import { createUserAndAssign, changeUserRole, deleteAuthUser } from './actions';
import DeleteAuthButton from './DeleteAuthButton';
import { superadminSetUserPassword } from './actions';


// Keep role codes in one place
export type RoleCode = 'viewer' | 'admin' | 'superadmin';

type RowRole = { user_id: string; roles: { code: RoleCode } };

function formatDT(dt?: string | null) {
  if (!dt) return '—';
  try {
    return new Date(dt).toLocaleString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function roleBadgeClass(role: RoleCode) {
  switch (role) {
    case 'superadmin':
      return 'bg-black text-white';
    case 'admin':
      return 'bg-blue-600 text-white';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?: { page?: string; q?: string; role?: RoleCode | 'all' };
}) {
  // gate: superadmin only
  try {
    await requireSuperAdminServer();
  } catch (e: any) {
    if (String(e?.message).toLowerCase().includes('unauthorized')) {
      redirect('/login?next=/users');
    }
    throw e;
  }

  const page = Math.max(1, Number(searchParams?.page ?? 1));
  const perPage = 10;
  const query = (searchParams?.q ?? '').trim();
  const roleFilter = (searchParams?.role ?? 'all') as RoleCode | 'all';

  // 1) list auth users (service role)
  const admin = supabaseAdmin();
  const { data: list, error: listErr } = await admin.auth.admin.listUsers({
    page,
    perPage,
  } as any);
  if (listErr) throw listErr;
  const users = (list?.users ?? []) as any[];

  // 2) fetch current roles for these users
  const ids = users.map((u) => u.id);
  const sb = await supabaseServer();
  const { data: isSuper } = await sb.rpc('is_super_admin'); // boolean


  let roleMap = new Map<string, RoleCode>();
  if (ids.length > 0) {
    const { data: rs } = await sb
      .from('user_roles')
      .select('user_id, roles!inner(code)')
      .in('user_id', ids);

    (rs as RowRole[] | null)?.forEach((r) => roleMap.set(r.user_id, r.roles.code));
  }

  // client-side filtering for current page results
  const filtered = users.filter((u) => {
    const role = roleMap.get(u.id) ?? ('viewer' as RoleCode);
    const matchRole = roleFilter === 'all' ? true : role === roleFilter;
    const matchQ = query ? String(u.email || '').toLowerCase().includes(query.toLowerCase()) : true;
    return matchRole && matchQ;
  });

  function linkWithParams(nextPage: number) {
    const sp = new URLSearchParams();
    sp.set('page', String(nextPage));
    if (query) sp.set('q', query);
    if (roleFilter && roleFilter !== 'all') sp.set('role', roleFilter);
    return `/users?${sp.toString()}`;
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users & Roles</h1>
          <p className="text-sm text-muted-foreground">Create users, assign roles, and manage access.</p>
        </div>
        <div className="text-xs text-muted-foreground hidden sm:block">Page {page}</div>
      </div>

      <div className="mt-6 space-y-6">
        {/* Create user */}
<section className="rounded-2xl border bg-card text-card-foreground shadow-sm">
  <div className="p-4 border-b">
    <h2 className="text-base font-semibold">Create User & Assign Role</h2>
    <p className="text-xs text-muted-foreground mt-1">
      Invite a user or set a password directly.
    </p>
  </div>

  <div className="p-4">
    <form action={createUserAndAssign} className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {/* Email */}
      <div className="md:col-span-2">
        <label className="text-sm font-medium" htmlFor="email">Email</label>
        <input id="email" name="email" type="email"
          className="border rounded-md w-full h-9 px-3 text-sm" required />
      </div>

      {/* Invite + Password (inline, hemat ruang) */}
      <div className="md:col-span-1 grid grid-cols-1 gap-2">
        <label className="flex items-center gap-2 text-sm whitespace-nowrap">
          <input type="checkbox" name="sendInvite" defaultChecked />
          Send invite email
        </label>
        <input name="password" type="password" placeholder="Set password (invite OFF)"
          className="border rounded-md w-full h-9 px-3 text-sm" />
      </div>

      {/* Full name */}
      <div className="md:col-span-2">
        <label className="text-sm font-medium" htmlFor="fullName">Full name (optional)</label>
        <input id="fullName" name="fullName" placeholder="Jane Cooper"
          className="border rounded-md w-full h-9 px-3 text-sm" />
      </div>

      {/* Role + submit kanan */}
      <div className="md:col-span-1 flex items-end justify-between gap-3">
        <div className="flex-1">
          <label className="text-sm font-medium" htmlFor="roleCode">Role</label>
          <select id="roleCode" name="roleCode" defaultValue="viewer"
            className="border rounded-md w-full h-9 px-3 text-sm">
            <option value="viewer">viewer</option>
            <option value="admin">admin</option>
            <option value="superadmin">superadmin</option>
          </select>
        </div>

        <button className="bg-black text-white h-9 px-4 rounded-md text-sm">
          Create
        </button>
      </div>
    </form>
  </div>
</section>

{/* Users */}
<section className="rounded-2xl border bg-card text-card-foreground shadow-sm mt-6">
  <div className="p-4 border-b flex items-center justify-between gap-3">
    <div>
      <h3 className="text-base font-semibold">Users</h3>
      <p className="text-xs text-muted-foreground">{filtered.length} shown · Page {page}</p>
    </div>

    {/* Filters (inline, compact) */}
    <form className="flex items-center gap-2" method="GET" action="/users">
      <input type="hidden" name="page" value={1} />
      <input
        name="q"
        placeholder="Search email…"
        defaultValue={query}
        className="border rounded-md h-9 px-3 text-sm w-[220px]"
      />
      <select
        name="role"
        defaultValue={roleFilter ?? 'all'}
        className="border rounded-md h-9 px-3 text-sm"
      >
        <option value="all">All roles</option>
        <option value="viewer">viewer</option>
        <option value="admin">admin</option>
        <option value="superadmin">superadmin</option>
      </select>
      <button className="h-9 px-3 rounded-md border text-sm">Apply</button>
      <a
        href="/users"
        className="h-9 px-3 rounded-md border text-sm"
      >
        Clear
      </a>
    </form>
  </div>

  {/* Table */}
  <div className="overflow-auto">
    <table className="min-w-[880px] w-full table-fixed text-sm">
      <thead className="sticky top-0 bg-card">
        <tr className="text-left border-b">
          <th className="py-2 px-3 w-[44%]">User</th>
          <th className="py-2 px-3 w-[18%]">Role</th>
          <th className="py-2 px-3 w-[22%]">Meta</th>
          <th className="py-2 px-3 w-[16%] text-right">Actions</th>
        </tr>
      </thead>

      <tbody className="[&_tr+tr]:border-t">
  {users.map((u) => {
    const currentRole = roleMap.get(u.id) ?? ('viewer' as RoleCode);
    const created = u.created_at ? new Date(u.created_at).toLocaleString() : '—';
    const last = (u as any).last_sign_in_at ? new Date((u as any).last_sign_in_at).toLocaleString() : '—';

    return (
      <tr key={u.id} className="align-top">
        {/* Email */}
        <td className="py-3 px-3">
          <div className="font-medium truncate">{u.email}</div>
          <div className="text-[11px] text-muted-foreground truncate">ID: {u.id}</div>
        </td>

        {/* Role (badge) */}
        <td className="py-3 px-3">
          <span
            className={[
              'inline-flex items-center rounded-full px-2.5 h-6 text-xs capitalize',
              currentRole === 'superadmin'
                ? 'bg-red-50 text-red-700 border border-red-200'
                : currentRole === 'admin'
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : 'bg-slate-50 text-slate-700 border border-slate-200',
            ].join(' ')}
          >
            {currentRole}
          </span>
        </td>

        {/* Meta */}
        <td className="py-3 px-3">
          <div className="text-xs text-muted-foreground">Created: {created}</div>
          <div className="text-xs text-muted-foreground">Last sign in: {last}</div>
        </td>

        {/* Actions (semua di dalam <td>) */}
        <td className="py-3 px-3">
          <div className="flex items-center justify-end gap-2 flex-wrap">
            {/* Superadmin: set password */}
            {isSuper && (
            <form action={superadminSetUserPassword} className="flex items-center gap-2">

                <input type="hidden" name="userId" value={u.id} />
                <input
                  name="newPassword"
                  type="password"
                  minLength={8}
                  required
                  placeholder="new password"
                  className="border rounded-md h-8 px-2 text-xs w-[140px] min-w-[140px]"
                />
                <button className="h-8 px-2 border rounded-md text-xs" type="submit">Set</button>
              </form>
            )}

            {/* Change role */}
            <form action={changeUserRole} className="flex items-center gap-2">
              <input type="hidden" name="email" value={u.email || ''} />
              <select
                name="roleCode"
                defaultValue={currentRole}
                className="border rounded-md h-8 px-2 text-xs"
              >
                <option value="viewer">viewer</option>
                <option value="admin">admin</option>
                <option value="superadmin">superadmin</option>
              </select>
              <button className="h-8 px-2 border rounded-md text-xs" type="submit">Update</button>
            </form>

            {/* Delete */}
            <form id={`del-${u.id}`} action={deleteAuthUser}>
              <input type="hidden" name="userId" value={u.id} />
              <DeleteAuthButton formId={`del-${u.id}`} />
            </form>
          </div>
        </td>
      </tr>
    );
  })}

  {users.length === 0 && (
    <tr>
      <td colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
        No users.
      </td>
    </tr>
  )}
</tbody>

    </table>
  </div>

  {/* Pagination */}
  <div className="p-3 border-t flex justify-end items-center gap-2">
    <a
      href={`/users?page=${Math.max(1, page - 1)}${query ? `&q=${encodeURIComponent(query)}` : ''}${roleFilter && roleFilter !== 'all' ? `&role=${roleFilter}` : ''}`}
      className={`px-3 py-1 border rounded ${page <= 1 ? 'pointer-events-none opacity-50' : ''}`}
    >
      Prev
    </a>
    <span className="text-sm">Page {page}</span>
    <a
      href={`/users?page=${page + 1}${query ? `&q=${encodeURIComponent(query)}` : ''}${roleFilter && roleFilter !== 'all' ? `&role=${roleFilter}` : ''}`}
      className={`px-3 py-1 border rounded ${users.length < perPage ? 'pointer-events-none opacity-50' : ''}`}
    >
      Next
    </a>
  </div>
</section>

      </div>
    </div>
  );
}

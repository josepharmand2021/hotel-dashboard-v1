// app/(app)/settings/security/page.tsx
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import { requireSuperAdminServer } from '@/lib/supabase/acl-server';
import { superadminUpdateOwnPassword } from './actions';

export default async function SecurityPage() {
  const sb = await supabaseServer();
  const { data: { session } } = await sb.auth.getSession();
  if (!session) redirect('/login?next=/settings/security');

  await requireSuperAdminServer();

  return (
    <div className="mx-auto max-w-lg px-4 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Security</h1>
        <p className="text-sm text-muted-foreground">Superadmin only.</p>
      </div>

      <div className="rounded-2xl border bg-card text-card-foreground shadow-sm">
        <div className="p-4 border-b">
          <h2 className="text-base font-semibold">Change password</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Update your password (no current password required).
          </p>
        </div>
        <div className="p-4">
          <form action={superadminUpdateOwnPassword} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-1">
              <label className="text-sm font-medium" htmlFor="newPassword">New password</label>
              <input id="newPassword" name="newPassword" type="password" minLength={8} required
                     className="mt-1 w-full border rounded-md h-9 px-3 text-sm" />
            </div>
            <div className="md:col-span-1">
              <label className="text-sm font-medium" htmlFor="confirm">Confirm password</label>
              <input id="confirm" name="confirm" type="password" minLength={8} required
                     className="mt-1 w-full border rounded-md h-9 px-3 text-sm" />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button className="bg-black text-white rounded-md h-9 px-4 text-sm">
                Update password
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

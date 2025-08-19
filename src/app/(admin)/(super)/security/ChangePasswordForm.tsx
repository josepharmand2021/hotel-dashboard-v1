'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function ChangePasswordForm() {
  const router = useRouter();
  const [current, setCurrent] = useState('');
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [signoutAll, setSignoutAll] = useState(true);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setOk(null);
    if (!current) return setErr('Current password is required.');
    if (pwd.length < 8) return setErr('New password must be at least 8 characters.');
    if (pwd !== pwd2) return setErr('Password confirmation does not match.');
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const email = user?.email || '';
      if (!email) throw new Error('No email on this account.');

      const { error: reauthErr } = await supabase.auth.signInWithPassword({ email, password: current });
      if (reauthErr) throw new Error('Current password is incorrect.');

      const { error: updErr } = await supabase.auth.updateUser({ password: pwd });
      if (updErr) throw updErr;

      if (signoutAll) {
        await supabase.auth.signOut({ scope: 'global' });
        router.replace('/login?reset=success');
        return;
      }
      setOk('Password updated.');
      setCurrent(''); setPwd(''); setPwd2('');
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3">
      <div>
        <label className="text-sm font-medium" htmlFor="current">Current password</label>
        <input id="current" type="password" className="mt-1 w-full border rounded-md h-9 px-3 text-sm"
               value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="••••••••" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium" htmlFor="pwd">New password</label>
          <input id="pwd" type="password" className="mt-1 w-full border rounded-md h-9 px-3 text-sm"
                 value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="At least 8 characters" />
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="pwd2">Confirm new password</label>
          <input id="pwd2" type="password" className="mt-1 w-full border rounded-md h-9 px-3 text-sm"
                 value={pwd2} onChange={(e) => setPwd2(e.target.value)} placeholder="••••••••" />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={signoutAll} onChange={(e) => setSignoutAll(e.target.checked)} />
        Sign out from all devices after changing password
      </label>

      {err && <div className="text-sm text-red-600">{err}</div>}
      {ok && <div className="text-sm text-green-600">{ok}</div>}

      <div className="flex justify-end">
        <button disabled={loading} className="bg-black text-white rounded-md h-9 px-4 text-sm disabled:opacity-50">
          {loading ? 'Updating…' : 'Update password'}
        </button>
      </div>
    </form>
  );
}

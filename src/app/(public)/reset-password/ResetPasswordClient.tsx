'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

function getHashParams(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const raw = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash;
  const params = new URLSearchParams(raw);
  const out: Record<string, string> = {};
  params.forEach((v, k) => (out[k] = v));
  return out;
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const search = useSearchParams();

  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [loading, setLoading] = useState(false);

  // Establish session from ANY Supabase recovery link format
  useEffect(() => {
    (async () => {
      try {
        setErr(null);

        // 1) Try hash tokens: #access_token & #refresh_token
        const { access_token, refresh_token } = getHashParams();
        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token });
          // clean hash
          window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
        } else {
          // 2) Try PKCE: ?code=...
          const code = search.get('code');
          if (code) {
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) throw error;
            // clean query param
            const url = new URL(window.location.href);
            url.searchParams.delete('code');
            window.history.replaceState({}, document.title, url.toString());
          } else {
            // 3) Try OTP magic-link: ?token_hash=...&type=recovery
            const tokenHash = search.get('token_hash');
            const type = search.get('type');
            if (tokenHash && type === 'recovery') {
              const { error } = await supabase.auth.verifyOtp({
                type: 'recovery',
                token_hash: tokenHash,
              });
              if (error) throw error;
              // clean query params
              const url = new URL(window.location.href);
              url.searchParams.delete('token_hash');
              url.searchParams.delete('type');
              window.history.replaceState({}, document.title, url.toString());
            }
          }
        }

        // final check: must have a session now
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Recovery link invalid or expired.');
        setReady(true);
      } catch (e: any) {
        setErr(e?.message ?? 'Failed to validate recovery link.');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (pwd.length < 8) return setErr('Password minimal 8 karakter.');
    if (pwd !== pwd2) return setErr('Konfirmasi password tidak sama.');

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pwd });
      if (error) throw error;
      router.replace('/login?reset=success');
    } catch (e: any) {
      setErr(e?.message ?? 'Gagal mengubah password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-xl font-semibold mb-2">Reset Password</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Buat password baru untuk akunmu.
      </p>

      {!ready ? (
        <div className="rounded border p-4 text-sm">
          {err ? <span className="text-red-600">{err}</span> : 'Menyiapkan sesi…'}
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label htmlFor="pwd" className="text-sm font-medium">New password</label>
            <input
              id="pwd"
              type="password"
              className="mt-1 w-full border rounded-md h-9 px-3 text-sm"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <div>
            <label htmlFor="pwd2" className="text-sm font-medium">Confirm password</label>
            <input
              id="pwd2"
              type="password"
              className="mt-1 w-full border rounded-md h-9 px-3 text-sm"
              value={pwd2}
              onChange={(e) => setPwd2(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {err && <div className="text-sm text-red-600">{err}</div>}

          <button
            disabled={loading}
            className="bg-black text-white rounded-md h-9 px-4 text-sm disabled:opacity-50"
          >
            {loading ? 'Updating…' : 'Update password'}
          </button>
        </form>
      )}
    </div>
  );
}

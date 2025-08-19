'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const redirectTo =
        typeof window !== 'undefined'
          ? `${window.location.origin}/reset-password`
          : undefined;

      const { error } =await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/reset-password`,
});

      if (error) throw error;
      setSent(true);
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-xl font-semibold mb-2">Forgot Password</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Masukkan email akunmu. Kami akan kirim link untuk reset password.
      </p>

      {sent ? (
        <div className="rounded border p-4 text-sm">
          Cek inbox kamu. Jika tidak ada, cek folder spam/promotions.
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <input
              id="email"
              type="email"
              required
              className="mt-1 w-full border rounded-md h-9 px-3 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          {err && <div className="text-sm text-red-600">{err}</div>}

          <button
            disabled={loading}
            className="bg-black text-white rounded-md h-9 px-4 text-sm disabled:opacity-50"
          >
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      )}
    </div>
  );
}

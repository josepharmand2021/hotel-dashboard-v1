'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Toaster, toast } from 'sonner';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get('next') || '/dashboard/overview';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);

    if (error) {
      toast.error(error.message || 'Sign in failed');
      return;
    }
    toast.success('Signed in');
    router.replace(next);
    router.refresh(); // penting: refresh data server components
  }

  // (opsional) magic link jika SMTP aktif
  async function sendMagicLink() {
    if (!email) return toast.error('Fill your email first');
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo:
          typeof window !== 'undefined' ? `${location.origin}${next}` : undefined,
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message || 'Failed sending magic link');
    toast.success('Magic link sent. Check your inbox.');
  }

  const canSubmit = !!email && !!password && !loading;

  return (
    <div className="min-h-screen flex justify-center items-start pt-24 bg-gradient-to-b from-neutral-50 to-neutral-100">
      <Toaster richColors position="top-center" />
      <div className="w-full max-w-md">
        <div className="rounded-2xl border bg-white shadow-sm p-6">
          <div className="mb-4 text-center">
            <div className="mx-auto mb-2 h-10 w-10 grid place-items-center rounded-full bg-black text-white">
              <LogIn size={18} />
            </div>
            <h1 className="text-xl font-semibold">Sign in</h1>
            <p className="text-sm text-muted-foreground">
              Use your account to access the app
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="email@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="relative">
                <Input
                  type={showPwd ? 'text' : 'password'}
                  placeholder="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  className="absolute inset-y-0 right-0 px-3 grid place-items-center text-muted-foreground"
                  aria-label={showPwd ? 'Hide password' : 'Show password'}
                >
                  {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
                  <div className="flex justify-end">
        <Link href="/forgot-password" className="text-xs text-muted-foreground hover:underline">
          Forgot password?
        </Link>
      </div>

            <Button type="submit" disabled={!canSubmit} className="w-full">
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>

            {/* Aktifkan kalau pakai SMTP */}
            {/* <Button
              type="button"
              variant="outline"
              onClick={sendMagicLink}
              disabled={loading || !email}
              className="w-full"
            >
              Send magic link
            </Button> */}
          </form>

          <div className="mt-6 text-center text-xs text-muted-foreground">
            Protected by middleware: you’ll be redirected after sign in.
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-muted-foreground">
          Tip: you can pass <code>?next=/vendors</code> to return to a specific page.
        </div>
      </div>
    </div>
  );
}

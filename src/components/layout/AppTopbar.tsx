'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase/client';

type Props = {
  isAdmin?: boolean;
  isSuper?: boolean;
};

export default function AppTopbar({ isAdmin = false, isSuper = false }: Props) {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setEmail(user?.email ?? null);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    // window.location.href = '/login';
  };

  return (
    <div className="h-12 border-b flex items-center justify-end gap-3 px-4">
      {/* Badge role kecil (opsional visual) */}
      {isSuper ? (
        <span className="text-[11px] px-2 py-1 rounded bg-purple-100 text-purple-700">Superadmin</span>
      ) : isAdmin ? (
        <span className="text-[11px] px-2 py-1 rounded bg-blue-100 text-blue-700">Admin</span>
      ) : (
        <span className="text-[11px] px-2 py-1 rounded bg-gray-100 text-gray-600">Viewer</span>
      )}

      {email ? (
        <>
          <span className="text-sm text-muted-foreground">{email}</span>
          <Button variant="outline" size="sm" onClick={signOut}>Sign out</Button>
        </>
      ) : (
        <Button asChild size="sm">
          <Link href="/login">Sign in</Link>
        </Button>
      )}
    </div>
  );
}

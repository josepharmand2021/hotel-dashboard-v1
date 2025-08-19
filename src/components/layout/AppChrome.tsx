'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import AppSidebar from '@/components/layout/AppSidebar';
import AppTopbar from '@/components/layout/AppTopbar';

type Props = { children: React.ReactNode };

type Flags = { isSuper: boolean; isAdmin: boolean; canWrite: boolean };

function useRoleFlags() {
  const [flags, setFlags] = useState<Flags>({ isSuper: false, isAdmin: false, canWrite: false });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        const res = await fetch('/api/role-flags', { cache: 'no-store' });
        const json = res.ok ? await res.json() : null;
        if (!abort && json) setFlags(json as Flags);
      } catch {
        // ignore
      } finally {
        if (!abort) setReady(true);
      }
    })();
    return () => { abort = true; };
  }, []);

  return { flags, ready };
}

export default function AppChrome({ children }: Props) {
  const pathname = usePathname() || '';
  const noChrome =
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/auth');

  const { flags, ready } = useRoleFlags();
  const { isAdmin, isSuper } = flags;

  if (noChrome) return <>{children}</>;

  return (
    <div className="min-h-screen flex">
      {/* Sembunyikan sampai flags siap biar tidak flicker */}
      <div style={{ visibility: ready ? 'visible' : 'hidden' }}>
        <AppSidebar isAdmin={isAdmin} isSuper={isSuper} />
      </div>

      <div className="flex-1 flex flex-col">
        <div style={{ visibility: ready ? 'visible' : 'hidden' }}>
          <AppTopbar isAdmin={isAdmin} isSuper={isSuper} />
        </div>
        <main className="p-4">{children}</main>
      </div>
    </div>
  );
}

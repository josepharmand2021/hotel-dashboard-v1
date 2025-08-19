// lib/supabase/acl.tsx
'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from './client';

type AclState = {
  ready: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
};

const AclCtx = createContext<AclState>({ ready: false, isAdmin: false, isSuperAdmin: false });

export function AclProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AclState>({ ready: false, isAdmin: false, isSuperAdmin: false });

  useEffect(() => {
    (async () => {
      // gunakan client supabase di browser
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setState({ ready: true, isAdmin: false, isSuperAdmin: false });
        return;
      }

      // cek role via RPC
      const { data: isAdmin } = await supabase.rpc('has_role_current', { p_code: 'admin' });
      const { data: isSuper } = await supabase.rpc('is_super_admin');

      setState({
        ready: true,
        isAdmin: !!isAdmin,
        isSuperAdmin: !!isSuper,
      });
    })();
  }, []);

  return <AclCtx.Provider value={state}>{children}</AclCtx.Provider>;
}

export function useACL() {
  return useContext(AclCtx);
}

/** Simple gate untuk menyembunyikan UI berdasarkan role */
export function RoleGate({
  admin,
  superadmin,
  children,
}: {
  admin?: boolean;
  superadmin?: boolean;
  children: ReactNode;
}) {
  const { ready, isAdmin, isSuperAdmin } = useACL();
  if (!ready) return null; // atau skeleton kecil

  if (superadmin) return isSuperAdmin ? <>{children}</> : null;
  if (admin) return isAdmin || isSuperAdmin ? <>{children}</> : null;

  return <>{children}</>;
}

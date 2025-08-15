"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./client";

type Acl = { loading: boolean; isAdmin: boolean; isViewer: boolean };
const Ctx = createContext<Acl>({ loading: true, isAdmin: false, isViewer: false });

export function AclProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Acl>({ loading: true, isAdmin: false, isViewer: false });

  async function refreshRoles() {
    const [{ data: admin }, { data: viewer }] = await Promise.all([
      supabase.rpc("has_role", { p_role: "admin" }),
      supabase.rpc("has_role", { p_role: "viewer" }),
    ]);
    setState({ loading: false, isAdmin: !!admin, isViewer: !!viewer });
  }

  useEffect(() => {
    let alive = true;

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!alive) return;
      if (!session) {
        setState({ loading: false, isAdmin: false, isViewer: false });
      } else {
        await refreshRoles();
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!alive) return;
      if (!session) setState({ loading: false, isAdmin: false, isViewer: false });
      else refreshRoles();
    });

    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export const useAcl = () => useContext(Ctx);

export function RoleGate({
  admin = false,
  fallback = null,
  children,
}: {
  admin?: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { loading, isAdmin } = useAcl();
  if (loading) return null;
  if (admin && !isAdmin) return <>{fallback}</>;
  return <>{children}</>;
}

"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AppTopbar() {
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
    // opsional: redirect ke login
    // window.location.href = "/login";
  };

  return (
    <div className="h-12 border-b flex items-center justify-end px-4 gap-3">
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

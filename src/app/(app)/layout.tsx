// app/(app)/layout.tsx
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import AppChrome from '@/components/layout/AppChrome';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sb = await supabaseServer();
  const { data: { session } } = await sb.auth.getSession();
  if (!session) redirect('/login?next=/');
  return <AppChrome>{children}</AppChrome>;
}

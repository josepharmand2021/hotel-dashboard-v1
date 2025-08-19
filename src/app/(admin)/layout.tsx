// app/(admin)/layout.tsx
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import { requireRoleServer } from '@/lib/supabase/acl-server';
import AppChrome from '@/components/layout/AppChrome';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const sb = await supabaseServer();
  const { data: { session } } = await sb.auth.getSession();
  if (!session) redirect('/login?next=/');

  try {
    await requireRoleServer(['admin','superadmin']);
  } catch {
    redirect('/403'); // atau '/dashboard/overview'
  }

  return <AppChrome>{children}</AppChrome>;
}

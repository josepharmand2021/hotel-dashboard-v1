// app/(admin)/settings/(super)/layout.tsx
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import { requireSuperAdminServer } from '@/lib/supabase/acl-server';

export default async function SuperOnly({ children }: { children: React.ReactNode }) {
  const sb = await supabaseServer();
  const { data: { session } } = await sb.auth.getSession();
  if (!session) redirect('/login?next=/settings/security');
  await requireSuperAdminServer();
  return <>{children}</>;
}

// app/(app)/capital-injections/(write)/layout.tsx
import { redirect } from 'next/navigation';
import { requireRoleServer } from '@/lib/supabase/acl-server';

export default async function WriteLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireRoleServer(['admin','superadmin']); // admin+
  } catch {
    redirect('/finance/capital-injections'); // balik ke list
  }
  return <>{children}</>;
}

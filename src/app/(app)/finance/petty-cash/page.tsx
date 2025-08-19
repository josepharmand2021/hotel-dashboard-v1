// app/finance/petty-cash/page.tsx
import { getRoleFlagsServer } from '@/lib/supabase/acl-server';
import PettyCashListClient from './PettyCashListClient';

export default async function PettyCashPage() {
  const { isAdmin } = await getRoleFlagsServer(); // admin-only write
  return <PettyCashListClient isAdmin={isAdmin} />;
}
// app/(admin)/finance/expenses/[id]/page.tsx
import { getRoleFlagsServer } from '@/lib/supabase/acl-server';
import ExpenseDetailPage from './ExpenseDetailPage'; // file client di atas

export default async function Page() {
  const { isAdmin } = await getRoleFlagsServer(); // admin ∪ superadmin
  return <ExpenseDetailPage canWrite={isAdmin} />;
}

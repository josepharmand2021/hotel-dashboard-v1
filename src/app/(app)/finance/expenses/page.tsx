// src/app/finance/expenses/page.tsx
import { getRoleFlagsServer } from '@/lib/supabase/acl-server';
import ExpensesListClient from './ExpensesListClient';

export default async function ExpensesPage() {
  const { isAdmin } = await getRoleFlagsServer(); // admin ∪ superadmin
  return <ExpensesListClient canWrite={isAdmin} />;
}

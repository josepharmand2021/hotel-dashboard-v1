// HAPUS 'use client'
import PlanList from '@/components/finance/capital-injections/PlanList';
import { getRoleFlagsServer } from '@/lib/roles';

export default async function CapitalInjectionsPage() {
  const { canWrite } = await getRoleFlagsServer(); // admin || superadmin
  return <PlanList canWrite={canWrite} />;
}

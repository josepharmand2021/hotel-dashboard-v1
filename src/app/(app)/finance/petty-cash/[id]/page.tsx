// NO 'use client' here
import { getRoleFlagsServer } from '@/lib/supabase/acl-server';
import PettyCashDetailClient from './PettyCashDetailClient';

export default async function Page({ params }: { params: { id: string } }) {
  const { isAdmin } = await getRoleFlagsServer();
  const boxId = Number(params.id);
  return <PettyCashDetailClient boxId={boxId} isAdmin={isAdmin} />;
}

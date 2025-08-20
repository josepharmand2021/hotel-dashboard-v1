// src/app/(app)/finance/petty-cash/[id]/page.tsx
export const runtime = 'nodejs';

// NO 'use client' here
import { getRoleFlagsServer } from '@/lib/supabase/acl-server';
import PettyCashDetailClient from './PettyCashDetailClient';

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { isAdmin } = await getRoleFlagsServer();

  const { id } = await params;            // ⬅️ ambil params via await
  const boxId = Number(id);               // parse ke number (aman)

  return <PettyCashDetailClient boxId={boxId} isAdmin={isAdmin} />;
}

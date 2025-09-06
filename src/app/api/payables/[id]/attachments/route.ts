// src/app/api/payables/[id]/attachments/route.ts
import { NextResponse } from 'next/server';
import getAdmin from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;                 // ⬅️ wajib await
  const payableId = Number(id || 0);
  if (!Number.isFinite(payableId) || payableId <= 0) {
    return NextResponse.json({ error: 'Bad id' }, { status: 400 });
  }

  const db = getAdmin();

  const { data: docs, error } = await db
    .from('documents')
    .select(
      'id, type_code, title, number, issue_date, main_version_id, storage_key_main, mime_main, updated_at'
    )
    .eq('entity_type', 'payable')
    .eq('entity_id', payableId)
    .in('type_code', ['INVOICE', 'FP']);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const versionIds = (docs ?? []).map((d) => d.main_version_id).filter(Boolean) as number[];
  const mapByVersionId = new Map<number, number>();
  if (versionIds.length) {
    const { data: vers } = await db
      .from('document_versions')
      .select('id, version')
      .in('id', versionIds);
    vers?.forEach((v) => mapByVersionId.set(v.id, v.version));
  }

  const shape = (d: any) => ({
    documentId: d.id as number,
    typeCode: d.type_code as 'INVOICE' | 'FP',
    title: d.title as string,
    number: (d.number as string | null) ?? null,
    issueDate: (d.issue_date as string | null) ?? null,
    version: (d.main_version_id ? mapByVersionId.get(d.main_version_id) : null) ?? null,
    storageKey: (d.storage_key_main as string | null) ?? null,
    mime: (d.mime_main as string | null) ?? null,
    updatedAt: d.updated_at as string,
  });

  const invoice = docs?.find((d) => d.type_code === 'INVOICE');
  const fp = docs?.find((d) => d.type_code === 'FP');

  return NextResponse.json({
    invoice: invoice ? shape(invoice) : null,
    fp: fp ? shape(fp) : null,
  });
}

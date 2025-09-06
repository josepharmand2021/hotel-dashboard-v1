import { NextResponse } from 'next/server';
import getAdmin from '@/lib/supabase/admin';
import { supabaseServer } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body = {
  payableId: number;
  typeCode: 'INVOICE' | 'FP';
  filename: string;
  title?: string;
  issueDate?: string; // YYYY-MM-DD
  number?: string;
};

export async function POST(req: Request) {
  try {
    const b = (await req.json()) as Body;
    if (!b?.payableId || !b?.typeCode || !b?.filename) {
      return NextResponse.json({ error: 'Bad payload' }, { status: 400 });
    }

    // Ambil user yang sedang login dari cookies (anon client)
    const sbUser = await supabaseServer();
    const { data: userRes, error: eUser } = await sbUser.auth.getUser();
    if (eUser || !userRes?.user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }
    const userId = userRes.user.id;

    const db: SupabaseClient = getAdmin();

    // Pastikan bucket ada + method tersedia
    const { data: bucketInfo, error: eBucket } = await db.storage.getBucket('docs');
    if (eBucket || !bucketInfo) {
      return NextResponse.json(
        { error: "Bucket 'docs' not found. Create it in Supabase Storage (private)." },
        { status: 400 }
      );
    }
    const storageFrom: any = db.storage.from('docs');
    if (typeof storageFrom.createSignedUploadUrl !== 'function') {
      return NextResponse.json(
        { error: 'Need @supabase/supabase-js >= 2.43.0 for createSignedUploadUrl' },
        { status: 500 }
      );
    }

    // Cek tipe
    const { data: dt, error: eType } = await db
      .from('document_types')
      .select('id, code')
      .eq('code', b.typeCode)
      .single();
    if (eType || !dt) {
      return NextResponse.json({ error: eType?.message || 'type not found' }, { status: 400 });
    }

    // Cari / buat dokumen
    const { data: existing } = await db
      .from('documents')
      .select('id')
      .eq('entity_type', 'payable')
      .eq('entity_id', b.payableId)
      .eq('type_code', b.typeCode)
      .maybeSingle();

    let documentId = existing?.id as number | undefined;

    if (!documentId) {
      const { data: ins, error: eIns } = await db
        .from('documents')
        .insert({
          type_id: dt.id,
          type_code: dt.code,
          title: b.title ?? `${b.typeCode} for PAY-${b.payableId}`,
          entity_type: 'payable',
          entity_id: b.payableId,
          issue_date: b.issueDate ?? null,
          number: b.number ?? null,
          // 🔽 penting: isi created_by
          created_by: userId,
          updated_by: userId,
        })
        .select('id')
        .single();

      if (eIns) {
        // race condition guard
        const { data: ex2, error: e2 } = await db
          .from('documents')
          .select('id')
          .eq('entity_type', 'payable')
          .eq('entity_id', b.payableId)
          .eq('type_code', b.typeCode)
          .single();
        if (e2 || !ex2) return NextResponse.json({ error: eIns.message }, { status: 400 });
        documentId = ex2.id;
      } else {
        documentId = ins!.id;
      }
    }

    // Hitung next version
    const { data: lastVer } = await db
      .from('document_versions')
      .select('version')
      .eq('document_id', documentId!)
      .order('version', { ascending: false })
      .limit(1);
    const nextVersion = lastVer && lastVer[0]?.version ? lastVer[0].version + 1 : 1;

    // Path
    const dateStr = b.issueDate ?? new Date().toISOString().slice(0, 10);
    const y = dateStr.slice(0, 4);
    const m = dateStr.slice(5, 7);
    const safeName = b.filename.toLowerCase().replace(/[^a-z0-9._-]+/g, '-');
    const path = `docs/payable/${b.payableId}/${b.typeCode}/${y}/${m}/PAY-${b.payableId}-${b.typeCode}-v${nextVersion}-${safeName}`;

    const { data: signed, error: eSigned } = await db.storage.from('docs').createSignedUploadUrl(path);
    if (eSigned) return NextResponse.json({ error: eSigned.message }, { status: 400 });

    return NextResponse.json({ documentId, nextVersion, path, signedUrl: signed.signedUrl });
  } catch (err: any) {
    console.error('signed-upload error:', err);
    return NextResponse.json(
      { error: err?.message ?? 'Unexpected error at signed-upload' },
      { status: 500 }
    );
  }
}
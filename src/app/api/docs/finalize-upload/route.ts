// src/app/api/docs/finalize-upload/route.ts
import { NextResponse } from 'next/server';
import getAdmin from '@/lib/supabase/admin';
import { supabaseServer } from '@/lib/supabase/server';
import { createHash } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body = {
  documentId: number;
  version: number;
  path: string;
  mime: string;
  sizeBytes?: number;
  changeNote?: string;
};

export async function POST(req: Request) {
  try {
    const b = (await req.json()) as Body;
    if (!b?.documentId || !b?.version || !b?.path || !b?.mime) {
      return NextResponse.json({ error: 'Bad payload' }, { status: 400 });
    }
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(b.mime)) {
      return NextResponse.json({ error: 'Unsupported mime' }, { status: 400 });
    }

    // Ambil user yang sedang login dari cookies (WAJIB, karena uploaded_by NOT NULL)
    const sbUser = await supabaseServer();
    const { data: userRes, error: eUser } = await sbUser.auth.getUser();
    if (eUser || !userRes?.user?.id) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }
    const userId = userRes.user.id;

    const db: SupabaseClient = getAdmin();

    // 1) Ambil file dari Storage → hitung SHA-256 + size
    const { data: blob, error: dErr } = await db.storage.from('docs').download(b.path);
    if (dErr || !blob) {
      return NextResponse.json(
        { error: dErr?.message ?? 'File not found in storage' },
        { status: 400 }
      );
    }
    const ab = await blob.arrayBuffer();
    const buf = Buffer.from(ab);
    const sizeBytes = b.sizeBytes ?? buf.byteLength;
    const sha256 = createHash('sha256').update(buf).digest('hex');

    // 2) Insert baris versi — isi uploaded_by (NOT NULL) + hash
    const { data: ver, error: eVer } = await db
      .from('document_versions')
      .insert({
        document_id: b.documentId,
        version: b.version,
        storage_key: b.path,
        mime: b.mime,
        size_bytes: sizeBytes,
        change_note: b.changeNote ?? null,
        hash_sha256: sha256,
        uploaded_by: userId, // ⬅️ WAJIB diisi (NOT NULL)
      })
      .select('id')
      .single();
    if (eVer) return NextResponse.json({ error: eVer.message }, { status: 400 });

    // 3) Update pointer main di documents
    const { error: eUpd } = await db
      .from('documents')
      .update({
        main_version_id: ver!.id,
        mime_main: b.mime,
        storage_key_main: b.path,
      })
      .eq('id', b.documentId);
    if (eUpd) return NextResponse.json({ error: eUpd.message }, { status: 400 });

    return NextResponse.json({ ok: true, versionId: ver!.id, sizeBytes, sha256 });
  } catch (err: any) {
    console.error('finalize-upload error:', err);
    return NextResponse.json(
      { error: err?.message ?? 'Unexpected error at finalize-upload' },
      { status: 500 }
    );
  }
}

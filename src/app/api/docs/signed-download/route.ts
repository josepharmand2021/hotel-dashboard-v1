// src/app/api/docs/signed-download/route.ts
import { NextResponse } from 'next/server';
import getAdmin from '@/lib/supabase/admin';
import type { SupabaseClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body = { path: string };

export async function POST(req: Request) {
  try {
    const { path } = (await req.json()) as Body;
    if (!path) return NextResponse.json({ error: 'Bad payload' }, { status: 400 });

    const db: SupabaseClient = getAdmin();
    const { data, error } = await db.storage.from('docs').createSignedUrl(path, 60);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ url: data.signedUrl });
  } catch (err: any) {
    console.error('signed-download error:', err);
    return NextResponse.json(
      { error: err?.message ?? 'Unexpected error at signed-download' },
      { status: 500 }
    );
  }
}

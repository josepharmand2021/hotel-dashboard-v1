export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { listVendors } from '@/features/vendors/api';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') ?? '';
    const limit = Number(searchParams.get('limit') ?? '200');

    const { rows } = await listVendors({ q, page: 1, pageSize: limit });
    return NextResponse.json({ rows }, { status: 200 });
  } catch (e: any) {
    // penting: selalu balik JSON saat error
    return NextResponse.json({ error: e?.message ?? 'Failed to list vendors' }, { status: 400 });
  }
}

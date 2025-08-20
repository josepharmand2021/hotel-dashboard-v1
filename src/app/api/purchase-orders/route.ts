export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { listVendors } from '@/features/vendors/api'; // server module kamu

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') ?? '';
  const limit = Number(searchParams.get('limit') ?? '50');
  try {
    const { rows } = await listVendors({ q, page: 1, pageSize: limit });
    return NextResponse.json({ rows });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to list vendors' }, { status: 400 });
  }
}

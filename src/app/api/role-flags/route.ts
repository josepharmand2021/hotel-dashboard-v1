// app/api/role-flags/route.ts
import { NextResponse } from 'next/server';
import { getRoleFlagsServer } from '@/lib/roles';

export async function GET() {
  try {
    const flags = await getRoleFlagsServer(); // { isSuper, isAdmin, canWrite }
    return NextResponse.json(flags, { status: 200 });
  } catch (e) {
    return NextResponse.json({ canWrite: false }, { status: 200 });
  }
}

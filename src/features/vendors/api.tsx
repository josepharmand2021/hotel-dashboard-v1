'use server';

import { revalidatePath } from 'next/cache';
import { supabaseServer } from '@/lib/supabase/server';
import { requireAdminServer } from '@/lib/supabase/acl-server';

// escape untuk ILIKE
function escapeLike(s: string) {
  return s.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_');
}

type VendorRow = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  npwp: string | null;
  created_at: string;
};

export async function listVendors({
  page = 1,
  pageSize = 10,
  q = '',
}: { page?: number; pageSize?: number; q?: string }) {
  const sb = supabaseServer();

  let query = sb
    .from('vendors')
    .select(
      'id,name,email,phone,address,npwp,created_at',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (q && q.trim()) {
    const term = `%${escapeLike(q.trim())}%`;
    query = query.ilike('name', term);
  }

  const { data, count, error } = await query;
  if (error) throw error;

  return {
    rows: (data ?? []) as VendorRow[],
    total: count ?? 0,
  };
}

export async function createVendor(payload: {
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  npwp?: string | null;
}) {
  // hanya admin yang boleh
  await requireAdminServer();

  const sb = supabaseServer();
  const { error } = await sb.from('vendors').insert(payload);
  if (error) {
    // map error RLS biar jelas di UI
    if ((error as any).code === '42501') {
      throw new Error('Forbidden: Anda tidak punya izin untuk membuat vendor.');
    }
    throw error;
  }
  revalidatePath('/vendors');
}

export async function getVendor(id: number) {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from('vendors')
    .select('id,name,email,phone,address,npwp,created_at')
    .eq('id', id)
    .single();

  if (error) throw error; // 404 / RLS error akan masuk sini
  return data as VendorRow;
}

export async function updateVendor(
  id: number,
  payload: Partial<Pick<VendorRow, 'name' | 'email' | 'phone' | 'address' | 'npwp'>>
) {
  // hanya admin yang boleh
  await requireAdminServer();

  const sb = supabaseServer();
  const { error } = await sb.from('vendors').update(payload).eq('id', id);
  if (error) {
    if ((error as any).code === '42501') {
      throw new Error('Forbidden: Anda tidak punya izin untuk mengubah vendor.');
    }
    throw error;
  }
  revalidatePath(`/vendors/${id}`);
  revalidatePath(`/vendors/${id}/edit`);
  revalidatePath('/vendors');
}

export async function deleteVendor(id: number) {
  // hanya admin yang boleh
  await requireAdminServer();

  const sb = supabaseServer();
  const { error } = await sb.from('vendors').delete().eq('id', id);
  if (error) {
    if ((error as any).code === '42501') {
      throw new Error('Forbidden: Anda tidak punya izin untuk menghapus vendor.');
    }
    throw error;
  }
  revalidatePath('/vendors');
}

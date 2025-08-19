'use server';

import { revalidatePath } from 'next/cache';
import { supabaseServer } from '@/lib/supabase/server';
import { requireAdminServer } from '@/lib/supabase/acl-server';

export async function listVendors({
  page = 1,
  pageSize = 10,
  q = '',
}: { page?: number; pageSize?: number; q?: string }) {
  const sb = await supabaseServer(); // ← WAJIB await

  let query = sb
    .from('vendors')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (q) query = query.ilike('name', `%${q}%`);

  const { data, count, error } = await query;
  if (error) throw error;

  return { rows: data ?? [], total: count ?? 0 };
}

export async function createVendor(payload: {
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  npwp?: string | null;
}) {
  const sb = await supabaseServer(); // ← WAJIB await
  const { error } = await sb.from('vendors').insert(payload);
  if (error) throw error;
  revalidatePath('/vendors');
}

export async function getVendor(id: number) {
  const sb = await supabaseServer(); // ← WAJIB await
  const { data, error } = await sb
    .from('vendors')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function updateVendor(id: number, payload: any) {
  const sb = await supabaseServer(); // ← WAJIB await
  const { error } = await sb.from('vendors').update(payload).eq('id', id);
  if (error) throw error;

  revalidatePath(`/vendors/${id}`);
  revalidatePath(`/vendors/${id}/edit`);
  revalidatePath('/vendors');
}

export async function deleteVendor(id: number) {
  // hanya admin/superadmin yang boleh hapus
  await requireAdminServer();

  const sb = await supabaseServer(); // ← WAJIB await
  const { error } = await sb.from('vendors').delete().eq('id', id);
  if (error) throw error;

  revalidatePath('/vendors');
}

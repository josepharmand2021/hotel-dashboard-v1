'use server';

import { revalidatePath } from 'next/cache';
import { supabaseServer } from '@/lib/supabase/server';

export type POStatus = 'draft' | 'partial' | 'received' | 'cancelled';

export async function listPurchaseOrders({
  page = 1,
  pageSize = 10,
  q = '',
  vendorId,
  status,
  dateFrom,
  dateTo,
}: {
  page?: number;
  pageSize?: number;
  q?: string;
  vendorId?: number;
  status?: POStatus | '';
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string;   // YYYY-MM-DD
}) {
  const sb = supabaseServer();

  // Pakai view yang sudah ada vendor_name
  let query = sb
    .from('view_purchase_orders')
    .select('*', { count: 'exact' })
    .order('po_date', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (q) query = query.or(`po_number.ilike.%${q}%,vendor_name.ilike.%${q}%`);
  if (vendorId) query = query.eq('vendor_id', vendorId);
  if (status) query = query.eq('status', status);
  if (dateFrom) query = query.gte('po_date', dateFrom);
  if (dateTo) query = query.lte('po_date', dateTo);

  const { data, count, error } = await query;
  if (error) throw error;
  return { rows: data ?? [], total: count ?? 0 };
}

export async function deletePurchaseOrder(id: number) {
  const sb = supabaseServer();
  const { error } = await sb.from('purchase_orders').delete().eq('id', id);
  if (error) throw error;
  revalidatePath('/purchase-orders');
}

'use server';

import { revalidatePath } from 'next/cache';
import { supabaseServer } from '@/lib/supabase/server';

export type NewPOItem = {
  description: string;
  qty: number;
  unit?: string | null;
  unit_price: number;
};

export type NewPO = {
  po_number: string;
  vendor_id: number;
  po_date?: string | null;
  delivery_date?: string | null;
  is_tax_included: boolean;
  tax_percent: number;
  note?: string | null;

  term_code?: 'CBD'|'COD'|'NET'|''|null;
  term_days?: number | null;
  due_date_override?: string | null;

  items: NewPOItem[];
};

export async function createPurchaseOrder(input: NewPO) {
  const sb = supabaseServer();

  // 1) Insert header
  const { data: poIns, error: poErr } = await sb
    .from('purchase_orders')
    .insert({
      po_number: input.po_number,
      vendor_id: input.vendor_id,
      po_date: input.po_date ?? null,
      delivery_date: input.delivery_date ?? null,
      is_tax_included: input.is_tax_included,
      tax_percent: input.tax_percent,
      note: input.note ?? null,
      status: 'draft',

      term_code: input.term_code ? input.term_code : null,
      term_days: input.term_code === 'NET' ? (input.term_days ?? 0) : null,
      due_date_override: input.due_date_override ?? null,
    })
    .select('id')
    .single();

  if (poErr) throw poErr;
  const poId = poIns.id as number;

  // 2) Insert items
  const items = (input.items || [])
    .filter(it => it.description && Number(it.qty) > 0)
    .map(it => ({
      purchase_order_id: poId,
      description: it.description,
      qty: Number(it.qty),
      unit: it.unit || null,
      unit_price: Number(it.unit_price),
    }));

  if (items.length) {
    const { error: itemsErr } = await sb.from('po_items').insert(items);
    if (itemsErr) throw itemsErr;
  }

  revalidatePath('/purchase-orders');
  return { id: poId };
}

// Pakai VIEW baru v_po_with_terms
export async function listPurchaseOrders({
  page = 1, pageSize = 10, q = ''
}: { page?: number; pageSize?: number; q?: string }) {
  const sb = supabaseServer();

  let query = sb
    .from('v_po_with_terms')
    .select('*', { count: 'exact' })
    .order('po_date', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (q) query = query.or(`po_number.ilike.%${q}%,vendor_name.ilike.%${q}%`);

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

export async function getPurchaseOrder(id: number) {
  const sb = supabaseServer();

  const { data, error } = await sb
    .from('purchase_orders')
    .select(`
      id,
      po_number,
      po_date,
      delivery_date,
      is_tax_included,
      tax_percent,
      status,
      note,
      vendor:vendors(id, name, payment_type, term_days),
      term_code,
      term_days,
      due_date_override,
      po_items(
        id, description, qty, unit, unit_price
      )
    `)
    .eq('id', id)
    .single();
  if (error) throw error;

  // Ambil agregat & due date dari view
  const { data: agg, error: e2 } = await sb
    .from('v_po_with_terms')
    .select('*')
    .eq('id', id)
    .single();
  if (e2) throw e2;

  const items = (data?.po_items ?? []).map((it: any) => ({
    ...it,
    qty: Number(it.qty) || 0,
    unit_price: Number(it.unit_price) || 0,
    amount: (Number(it.qty) || 0) * (Number(it.unit_price) || 0),
  }));

  return {
    id: data?.id,
    po_number: data?.po_number,
    po_date: data?.po_date,
    delivery_date: data?.delivery_date,
    is_tax_included: !!data?.is_tax_included,
    tax_percent: Number(data?.tax_percent ?? 0),
    status: data?.status,
    note: data?.note ?? '',
    vendor: data?.vendor ?? null,
    term_code: data?.term_code ?? null,
    term_days: data?.term_days ?? null,
    due_date_override: data?.due_date_override ?? null,

    items,
    subtotal: Number(agg?.subtotal ?? 0),
    taxAmount: Number(agg?.tax_amount ?? 0),
    total: Number(agg?.total_amount ?? 0),

    effective_term_code: agg?.effective_term_code ?? null,
    effective_term_days: Number(agg?.effective_term_days ?? 0),
    due_date_effective: agg?.due_date_effective ?? null,
  };
}

export async function updatePurchaseOrderStatus(id: number, status: string) {
  const sb = supabaseServer();
  const { error } = await sb.from('purchase_orders').update({ status }).eq('id', id);
  if (error) throw error;
}

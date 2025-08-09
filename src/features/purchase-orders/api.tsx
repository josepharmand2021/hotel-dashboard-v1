'use server';

import { revalidatePath } from 'next/cache';
import { supabaseServer } from '@/lib/supabase/server';
import { supabase } from '@/lib/supabase/client';


export type NewPOItem = {
  description: string;
  qty: number;
  unit?: string | null;
  unit_price: number;
};

export type NewPO = {
  po_number: string;
  vendor_id: number;
  po_date?: string | null;        // 'YYYY-MM-DD'
  delivery_date?: string | null;  // 'YYYY-MM-DD'
  is_tax_included: boolean;
  tax_percent: number;            // e.g. 11
  note?: string | null;
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
    })
    .select('id')
    .single();

  if (poErr) throw poErr;
  const poId = poIns.id as number;

  // 2) Insert items (skip rows kosong)
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

  // (opsional) revalidate list
  revalidatePath('/purchase-orders');
  return { id: poId };
}

// Pakai VIEW yang sudah menjumlah total dari po_items
export async function listPurchaseOrders({
  page = 1, pageSize = 10, q = ''
}: { page?: number; pageSize?: number; q?: string }) {
  const sb = supabaseServer();

  let query = sb
    .from('view_purchase_orders') // ← pastikan view sudah dibuat
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

  // Header + vendor + items
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
      vendor:vendors(id, name),
      po_items(
        id, description, qty, unit, unit_price
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;

  const items = (data?.po_items ?? []).map((it: any) => ({
    ...it,
    qty: Number(it.qty) || 0,
    unit_price: Number(it.unit_price) || 0,
    amount: (Number(it.qty) || 0) * (Number(it.unit_price) || 0),
  }));

  const subtotal = items.reduce((s: number, it: any) => s + it.amount, 0);
  const taxPct = Number(data?.tax_percent ?? 0);
  const taxAmount = data?.is_tax_included ? 0 : subtotal * (taxPct / 100);
  const total = data?.is_tax_included ? subtotal : subtotal + taxAmount;

  return {
    id: data?.id,
    po_number: data?.po_number,
    po_date: data?.po_date,
    delivery_date: data?.delivery_date,
    is_tax_included: !!data?.is_tax_included,
    tax_percent: taxPct,
    status: data?.status,
    note: data?.note ?? '',
    vendor: data?.vendor ?? null,
    items,
    subtotal,
    taxAmount,
    total,
  };
}

export async function updatePurchaseOrderStatus(id: number, status: string) {
  const { error } = await supabase.from('purchase_orders').update({ status }).eq('id', id);
  if (error) throw error;
}
'use client';
import { supabase } from '@/lib/supabase/client';

/* Helper: relasi bisa object atau array, ambil 1 */
const pickOne = <T,>(v: T | T[] | null | undefined): T | null =>
  Array.isArray(v) ? (v[0] ?? null) : (v ?? null);

/* =========================
   UPDATE STATUS
========================= */
export async function updatePurchaseOrderStatus(id: number, status: string) {
  const { error } = await supabase.from('purchase_orders').update({ status }).eq('id', id);
  if (error) throw error;
}

/* =========================
   LIST POs — pakai view v_po_with_terms
========================= */
export async function listPurchaseOrders({ q = '', page = 1, pageSize = 10 }) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('v_po_with_terms')
    .select(`
      id,
      po_number,
      po_date,
      delivery_date,
      status,
      is_tax_included,
      tax_percent,
      vendor_id,
      vendor_name,
      subtotal,
      tax_amount,
      total_amount,
      effective_term_code,
      effective_term_days,
      due_date_effective
    `, { count: 'exact' })
    .order('po_date', { ascending: false })
    .range(from, to);

  const term = q.trim();
  if (term) {
    query = query.or(`po_number.ilike.%${term}%,vendor_name.ilike.%${term}%`);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  const rows = (data ?? []).map((r: any) => ({
    id: r.id,
    po_number: r.po_number,
    vendor_name: r.vendor_name ?? '',
    po_date: r.po_date,
    delivery_date: r.delivery_date,
    status: r.status,
    is_tax_included: !!r.is_tax_included,
    tax_percent: Number(r.tax_percent ?? 11),
    subtotal: Number(r.subtotal ?? 0),
    tax_amount: Number(r.tax_amount ?? 0),
    total: Number(r.total_amount ?? 0),
    term_code: r.effective_term_code,
    term_days: Number(r.effective_term_days ?? 0),
    due_date: r.due_date_effective,
  }));

  return { rows, total: count ?? 0 };
}


/* =========================
   DELETE PO (hapus items dulu)
========================= */
export async function deletePurchaseOrder(id: number) {
  const { error: itemsErr } = await supabase.from('po_items').delete().eq('purchase_order_id', id);
  if (itemsErr) throw itemsErr;

  const { error: poErr } = await supabase.from('purchase_orders').delete().eq('id', id);
  if (poErr) throw poErr;
}

/* =========================
   GET DETAIL PO + ITEMS + totals/due dari view
========================= */
export async function getPurchaseOrder(id: number) {
  // header + vendor + items
  const { data, error } = await supabase
    .from('purchase_orders')
    .select(`
      id,
      po_number,
      po_date,
      delivery_date,
      is_tax_included,
      tax_percent,
      note,
      status,
      vendor_id,
      term_code,
      term_days,
      due_date_override,
      vendor: vendors!purchase_orders_vendor_id_fkey (
        id, name, address, phone, npwp,
        payment_type, term_days, payment_term_label
      ),
      po_items:po_items ( id, description, qty, unit, unit_price )
    `)
    .eq('id', id)
    .single();
  if (error) throw error;

  // totals, vendor_name, due_date_effective dari view
  const { data: agg, error: e2 } = await supabase
    .from('v_po_with_terms')
    .select('*')
    .eq('id', id)
    .single();
  if (e2) throw e2;

  const vendor = pickOne<any>(data.vendor);

  return {
    id: data.id,
    po_number: data.po_number ?? '',
    po_date: data.po_date ?? '',
    delivery_date: data.delivery_date ?? '',
    is_tax_included: !!data.is_tax_included,
    tax_percent: Number(data.tax_percent ?? 11),
    note: data.note ?? '',
    status: data.status ?? 'draft',

    vendor_id: vendor?.id ?? data.vendor_id ?? null,
    vendor: vendor ? {
      id: vendor.id,
      name: vendor.name,
      address: vendor.address,
      payment_type: vendor.payment_type,
      term_days: vendor.term_days,
      payment_term_label: vendor.payment_term_label,
    } : null,

    term_code: data.term_code ?? null,          // override di PO (nullable)
    term_days: data.term_days ?? null,          // override di PO (nullable)
    due_date_override: data.due_date_override,  // override di PO (nullable)

    items: (data.po_items ?? []).map((it: any) => ({
      id: it.id,
      description: it.description ?? '',
      qty: Number(it.qty ?? 0),
      unit: it.unit ?? '',
      unit_price: Number(it.unit_price ?? 0),
    })),

    // dari view:
    vendor_name: agg?.vendor_name ?? vendor?.name ?? '',
    subtotal: Number(agg?.subtotal ?? 0),
    taxAmount: Number(agg?.tax_amount ?? 0),
    total: Number(agg?.total_amount ?? 0),
    effective_term_code: agg?.effective_term_code ?? null,
    effective_term_days: Number(agg?.effective_term_days ?? 0),
    due_date_effective: agg?.due_date_effective ?? null,
  };
}

/* =========================
   UPDATE PO (header + upsert items + delete removed)
   + term_code, term_days, due_date_override
========================= */
export async function updatePurchaseOrder(
  id: number,
  values: {
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

    items: Array<{ id?: number; description: string; qty: number; unit?: string | null; unit_price: number }>;
  }
) {
  // 1) header
  const { error: hdrErr } = await supabase
    .from('purchase_orders')
    .update({
      po_number: values.po_number,
      vendor_id: values.vendor_id,
      po_date: values.po_date || null,
      delivery_date: values.delivery_date || null,
      is_tax_included: values.is_tax_included,
      tax_percent: values.tax_percent,
      note: values.note || null,

      term_code: values.term_code ? values.term_code : null,
      term_days: (values.term_code === 'NET') ? (values.term_days ?? 0) : null,
      due_date_override: values.due_date_override || null,
    })
    .eq('id', id);
  if (hdrErr) throw hdrErr;

  // 2) existing item ids
  const { data: existing, error: exErr } = await supabase
    .from('po_items')
    .select('id')
    .eq('purchase_order_id', id);
  if (exErr) throw exErr;
  const existingIds = new Set((existing ?? []).map((r: any) => r.id));

  // 3) upsert
  const payload = values.items.map((it) => ({
    id: it.id ?? undefined,
    purchase_order_id: id,
    description: it.description,
    qty: it.qty,
    unit: it.unit || null,
    unit_price: it.unit_price,
  }));
  const { error: upErr } = await supabase.from('po_items').upsert(payload, { onConflict: 'id' });
  if (upErr) throw upErr;

  // 4) delete removed
  const newIds = new Set(payload.filter((p) => !!p.id).map((p: any) => p.id));
  const toDelete = [...existingIds].filter((eid) => !newIds.has(eid));
  if (toDelete.length) {
    const { error: delErr } = await supabase.from('po_items').delete().in('id', toDelete);
    if (delErr) throw delErr;
  }
}

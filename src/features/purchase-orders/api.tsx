'use server';

import { revalidatePath } from 'next/cache';
import { supabaseServer } from '@/lib/supabase/server';

type POItem = { id?: number; description: string; qty: number; unit?: string|null; unit_price: number };

// ---------- helpers ----------
const asNum = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
const daysDiff = (a: Date, b: Date) => Math.floor((Number(a) - Number(b)) / 86400000);

export async function createPurchaseOrder(input: {
  po_number: string; vendor_id: number;
  po_date?: string|null; delivery_date?: string|null;
  is_tax_included: boolean; tax_percent: number;
  note?: string|null;
  term_code?: 'CBD'|'COD'|'NET'|''|null;
  term_days?: number|null;
  due_date_override?: string|null;
  items: POItem[];
}) {
  const sb = supabaseServer();

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
  revalidatePath(`/purchase-orders/${poId}`);
  return { id: poId };
}

export async function updatePurchaseOrder(
  id: number,
  values: {
    po_number: string; vendor_id: number;
    po_date?: string|null; delivery_date?: string|null;
    is_tax_included: boolean; tax_percent: number; note?: string|null;
    term_code?: 'CBD'|'COD'|'NET'|''|null; term_days?: number|null; due_date_override?: string|null;
    items: POItem[];
  }
) {
  const sb = supabaseServer();

  // header
  const { error: hdrErr } = await sb
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
      term_days: values.term_code === 'NET' ? (values.term_days ?? 0) : null,
      due_date_override: values.due_date_override || null,
    })
    .eq('id', id);
  if (hdrErr) throw hdrErr;

  // existing item ids
  const { data: existing, error: exErr } = await sb.from('po_items').select('id').eq('purchase_order_id', id);
  if (exErr) throw exErr;
  const existingIds = new Set((existing ?? []).map((r: any) => r.id));

  // upsert items
  const payload = values.items.map((it) => ({
    id: it.id ?? undefined,
    purchase_order_id: id,
    description: it.description,
    qty: Number(it.qty),
    unit: it.unit || null,
    unit_price: Number(it.unit_price),
  }));
  const { error: upErr } = await sb.from('po_items').upsert(payload, { onConflict: 'id' });
  if (upErr) throw upErr;

  // delete removed
  const newIds = new Set(payload.filter((p) => !!p.id).map((p: any) => p.id));
  const toDelete = [...existingIds].filter((eid) => !newIds.has(eid));
  if (toDelete.length) {
    const { error: delErr } = await sb.from('po_items').delete().in('id', toDelete);
    if (delErr) throw delErr;
  }

  revalidatePath('/purchase-orders');
  revalidatePath(`/purchase-orders/${id}`);
}

export async function deletePurchaseOrder(id: number) {
  const sb = supabaseServer();
  // hapus items dulu biar FK aman
  const { error: itemsErr } = await sb.from('po_items').delete().eq('purchase_order_id', id);
  if (itemsErr) throw itemsErr;
  const { error: poErr } = await sb.from('purchase_orders').delete().eq('id', id);
  if (poErr) throw poErr;

  revalidatePath('/purchase-orders');
  revalidatePath(`/purchase-orders/${id}`);
}

export async function getPurchaseOrder(id: number) {
  const sb = supabaseServer();

  // Header + items + vendor
  const { data, error } = await sb
    .from('purchase_orders')
    .select(`
      id, po_number, po_date, delivery_date, is_tax_included, tax_percent, note, status,
      vendor: vendors!purchase_orders_vendor_id_fkey (
        id, name, address, phone, npwp, payment_type, term_days, payment_term_label
      ),
      term_code, term_days, due_date_override,
      po_items ( id, description, qty, unit, unit_price )
    `)
    .eq('id', id)
    .single();
  if (error) throw error;

  // Aggregat terms & totals
  const { data: terms, error: e2 } = await sb
    .from('v_po_with_terms')
    .select('*')
    .eq('id', id)
    .single();
  if (e2) throw e2;

  // Finance (paid, outstanding)
  const { data: fin, error: e3 } = await sb
    .from('v_po_finance')
    .select('total, paid, outstanding')
    .eq('id', id)
    .single();
  if (e3) throw e3;

  const vendor = Array.isArray(data.vendor) ? data.vendor[0] : data.vendor;
  const items = (data.po_items ?? []).map((it: any) => ({
    id: it.id,
    description: it.description ?? '',
    qty: Number(it.qty ?? 0),
    unit: it.unit ?? '',
    unit_price: Number(it.unit_price ?? 0),
    amount: (Number(it.qty) || 0) * (Number(it.unit_price) || 0),
  }));

  const subtotal   = Number(terms?.subtotal ?? 0);
  const taxAmount  = Number(terms?.tax_amount ?? 0);
  // ✅ prefer terms.total_amount first, then finance.total
  const total      = Number(terms?.total_amount ?? fin?.total ?? 0);
  const paid       = Number(fin?.paid ?? 0);
  // ✅ compute outstanding if finance.outstanding is null
  const outstanding = Number(
    fin?.outstanding ?? Math.max(total - paid, 0)
  );

  // unified payment_status & overdue
  const due = (terms?.due_date_effective as string | null) ?? null;
  let is_overdue = false, days_overdue = 0;
  if (outstanding > 0 && due) {
    const today = startOfDay(new Date());
    const dueD = startOfDay(new Date(`${due}T00:00:00`));
    if (dueD < today) {
      is_overdue = true;
      days_overdue = Math.max(1, daysDiff(today, dueD));
    }
  }

  let payment_status: 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERDUE';
  if (paid >= total - 0.5) payment_status = 'PAID';
  else if (is_overdue)    payment_status = 'OVERDUE';
  else if (paid > 0)      payment_status = 'PARTIAL';
  else                    payment_status = 'UNPAID';

  return {
    id: data.id,
    po_number: data.po_number ?? '',
    po_date: data.po_date ?? '',
    delivery_date: data.delivery_date ?? '',
    is_tax_included: !!data.is_tax_included,
    tax_percent: Number(data.tax_percent ?? 11),
    note: data.note ?? '',
    status: data.status ?? 'draft',
    vendor: vendor ? {
      id: vendor.id, name: vendor.name, address: vendor.address,
      payment_type: vendor.payment_type, term_days: vendor.term_days,
      payment_term_label: vendor.payment_term_label,
    } : null,
    term_code: data.term_code ?? null,
    term_days: data.term_days ?? null,
    due_date_override: data.due_date_override ?? null,
    items,

    // terms/totals
    subtotal,
    taxAmount,
    total,
    effective_term_code: terms?.effective_term_code ?? null,
    effective_term_days: Number(terms?.effective_term_days ?? 0),
    due_date_effective: terms?.due_date_effective ?? null,

    // finance (unified)
    paid,
    outstanding,
    payment_status,   // PAID | OVERDUE | PARTIAL | UNPAID
    is_overdue,
    days_overdue,
  };
}

export async function listPurchaseOrdersServer({
  page = 1, pageSize = 10, q = ''
}: { page?: number; pageSize?: number; q?: string }) {
  const sb = supabaseServer();

  // base from terms view (includes vendor_name, due_date_effective, totals)
  let q1 = sb.from('v_po_with_terms')
    .select('*', { count: 'exact' })
    .order('po_date', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (q) q1 = q1.or(`po_number.ilike.%${q}%,vendor_name.ilike.%${q}%`);
  const { data: rows, count, error } = await q1;
  if (error) throw error;

  const ids = (rows ?? []).map((r: any) => r.id);
  const financeMap = new Map<number, { total: number; paid: number; outstanding: number }>();
  if (ids.length) {
    const { data: fin } = await sb
      .from('v_po_finance')
      .select('id, total, paid, outstanding')
      .in('id', ids);
    (fin ?? []).forEach((f: any) => financeMap.set(Number(f.id), {
      total: asNum(f.total),
      paid: asNum(f.paid),
      outstanding: (f.outstanding == null ? NaN : asNum(f.outstanding)),
    }));
  }

  const merged = (rows ?? []).map((r: any) => {
    const fin = financeMap.get(Number(r.id));
    const totalFromTerms = asNum(r.total_amount);
    const total = Number.isFinite(fin?.total) ? (fin!.total || totalFromTerms) : totalFromTerms;
    const paid  = Number.isFinite(fin?.paid) ? fin!.paid : 0;
    const outstanding =
      Number.isFinite(fin?.outstanding) && !Number.isNaN(fin!.outstanding)
        ? fin!.outstanding
        : Math.max(total - paid, 0);

    const due: string | null = (r.due_date_effective ?? null) && String(r.due_date_effective).slice(0,10);
    let is_overdue = false, days_overdue = 0;
    if (outstanding > 0 && due) {
      const today = startOfDay(new Date());
      const dueD = startOfDay(new Date(`${due}T00:00:00`));
      if (dueD < today) {
        is_overdue = true;
        days_overdue = Math.max(1, daysDiff(today, dueD));
      }
    }

    let payment_status: 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERDUE';
    if (paid >= total - 0.5) payment_status = 'PAID';
    else if (is_overdue)    payment_status = 'OVERDUE';
    else if (paid > 0)      payment_status = 'PARTIAL';
    else                    payment_status = 'UNPAID';

    return {
      ...r,
      // unify fields used on FE
      total,
      paid,
      outstanding,
      payment_status,
      is_overdue,
      days_overdue,
      // convenience alias if FE expects "due_date"
      due_date: r.due_date_effective ? String(r.due_date_effective).slice(0,10) : null,
    };
  });

  return { rows: merged, total: count ?? 0 };
}

export async function updatePurchaseOrderStatus(id: number, status: string) {
  const sb = supabaseServer();
  const { error } = await sb.from('purchase_orders').update({ status }).eq('id', id);
  if (error) throw error;
  revalidatePath('/purchase-orders');
  revalidatePath(`/purchase-orders/${id}`);
}

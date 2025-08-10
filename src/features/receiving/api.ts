import { supabase } from '@/lib/supabase/client';

// helper aman baca nama vendor dari relasi supabase
function getVendorNameSafe(v: any): string {
  if (!v) return '';
  return Array.isArray(v) ? (v[0]?.name ?? '') : (v.name ?? '');
}

export type GRNHeader = {
  id: number;
  grn_number: string;
  date_received: string; // ISO
  purchase_order_id: number | null;
  vendor_id: number;
  vendor_name?: string | null;
  ref_no?: string | null;
  note?: string | null;
  status: 'draft' | 'posted' | 'void' | string;
  created_at?: string;
};

export type GRNItem = {
  id: number;
  grn_id: number;
  po_item_id: number | null;
  description?: string | null;
  uom?: string | null;
  qty_input: number;
  qty_matched: number;
  qty_overage: number;
  qty_received: number;
};

// PO item view: kolom di DB = unit (bukan uom)
export type POItemView = {
  id: number;               // po_item_id
  description: string | null;
  unit: string | null;      // kolom asli
  uom?: string | null;      // alias utk kompatibilitas (unit)
  qty_order: number;
  qty_matched: number;
  qty_remaining: number;
};

export type GrnListRow = {
  id: number;
  grn_number: string;
  date_received: string;
  purchase_order_id: number | null;
  po_number: string | null; // <-- dari view v_grn_list
  vendor_id: number | null;
  vendor_name: string | null;
  ref_no: string | null;
  status: string;
  po_qty: number;
  received_qty: number;
  overage_qty: number;
};

/** PO helper: ambil header + item + sisa */
export async function getPOWithItems(purchase_order_id: number) {
  // items
  const { data: items, error } = await supabase
    .from('po_items')
    .select('id, description, unit, qty')
    .eq('purchase_order_id', purchase_order_id)
    .order('id');
  if (error) throw error;

  const { data: fulfill, error: e2 } = await supabase
    .from('v_po_item_fulfillment')
    .select('po_item_id, qty_matched, qty_remaining')
    .eq('purchase_order_id', purchase_order_id);
  if (e2) throw e2;

  const byId = new Map((fulfill ?? []).map((r: any) => [r.po_item_id, r]));
  const lines: POItemView[] = (items ?? []).map((it: any) => {
    const f = byId.get(it.id) || { qty_matched: 0, qty_remaining: it.qty };
    const unit = it.unit ?? null;
    return {
      id: it.id,
      description: it.description,
      unit,
      uom: unit, // alias
      qty_order: Number(it.qty),
      qty_matched: Number(f.qty_matched),
      qty_remaining: Number(f.qty_remaining),
    };
  });

  // header (autofill vendor di form)
  const { data: po, error: e3 } = await supabase
    .from('purchase_orders')
    .select('id, po_number, po_date, vendor_id, note, vendors(name)')
    .eq('id', purchase_order_id)
    .single();
  if (e3) throw e3;

  const header = po
    ? {
        id: po.id,
        po_number: po.po_number as string,
        po_date: po.po_date as string | null,
        vendor_id: po.vendor_id as number,
        vendor_name: getVendorNameSafe((po as any).vendors),
        note: (po as any).note as string | null,
      }
    : null;

  return { header, lines };
}

export async function getGRN(id: number) {
  const { data: header, error } = await supabase.from('grns').select('*').eq('id', id).single();
  if (error) throw error;
  const { data: items, error: e2 } = await supabase.from('grn_items').select('*').eq('grn_id', id).order('id');
  if (e2) throw e2;
  return { header: header as GRNHeader, items: (items ?? []) as GRNItem[] };
}

/** Create/Update GRN dari PO */
export async function upsertGRNFromPO(input: {
  id?: number;
  grn_number: string;
  date_received: string;
  purchase_order_id: number;
  vendor_id: number;
  vendor_name?: string | null;
  ref_no?: string | null;
  note?: string | null;
  items: Array<{ po_item_id: number; uom?: string | null; qty_input: number; description?: string | null }>;
}) {
  if (!input.items?.length) throw new Error('Minimal 1 item');

  if (input.id) {
    const { error } = await supabase.from('grns').update({
      grn_number: input.grn_number,
      date_received: input.date_received,
      purchase_order_id: input.purchase_order_id,
      vendor_id: input.vendor_id,
      vendor_name: input.vendor_name ?? null,
      ref_no: input.ref_no ?? null,
      note: input.note ?? null,
    }).eq('id', input.id);
    if (error) throw error;

    const { error: d1 } = await supabase.from('grn_items').delete().eq('grn_id', input.id);
    if (d1) throw d1;

    const payload = input.items.map(it => ({
      grn_id: input.id!, po_item_id: it.po_item_id,
      description: it.description ?? null, uom: it.uom ?? null,
      qty_input: Number(it.qty_input || 0),
    }));
    const { error: i1 } = await supabase.from('grn_items').insert(payload);
    if (i1) throw i1;
    return input.id;
  } else {
    const { data: ins, error } = await supabase.from('grns').insert({
      grn_number: input.grn_number,
      date_received: input.date_received,
      purchase_order_id: input.purchase_order_id,
      vendor_id: input.vendor_id,
      vendor_name: input.vendor_name ?? null,
      ref_no: input.ref_no ?? null,
      note: input.note ?? null,
    }).select('id').single();
    if (error) throw error;
    const grn_id = (ins as any).id as number;

    const payload = input.items.map(it => ({
      grn_id, po_item_id: it.po_item_id,
      description: it.description ?? null, uom: it.uom ?? null,
      qty_input: Number(it.qty_input || 0),
    }));
    const { error: i1 } = await supabase.from('grn_items').insert(payload);
    if (i1) throw i1;
    return grn_id;
  }
}

/** Create/Update GRN Non-PO (po_item_id = null) */
export async function upsertGRNNonPO(input: {
  id?: number;
  grn_number: string;
  date_received: string;
  vendor_id: number;
  vendor_name?: string | null;
  ref_no?: string | null;
  note?: string | null;
  items: Array<{ description: string; uom?: string | null; qty_input: number }>;
}) {
  if (!input.items?.length) throw new Error('Minimal 1 item');

  if (input.id) {
    const { error } = await supabase.from('grns').update({
      grn_number: input.grn_number,
      date_received: input.date_received,
      purchase_order_id: null,
      vendor_id: input.vendor_id,
      vendor_name: input.vendor_name ?? null,
      ref_no: input.ref_no ?? null,
      note: input.note ?? null,
    }).eq('id', input.id);
    if (error) throw error;

    const { error: d1 } = await supabase.from('grn_items').delete().eq('grn_id', input.id);
    if (d1) throw d1;

    const payload = input.items.map(it => ({
      grn_id: input.id!, po_item_id: null,
      description: it.description ?? null, uom: it.uom ?? null,
      qty_input: Number(it.qty_input || 0),
    }));
    const { error: i1 } = await supabase.from('grn_items').insert(payload);
    if (i1) throw i1;
    return input.id;
  } else {
    const { data: ins, error } = await supabase.from('grns').insert({
      grn_number: input.grn_number,
      date_received: input.date_received,
      purchase_order_id: null,
      vendor_id: input.vendor_id,
      vendor_name: input.vendor_name ?? null,
      ref_no: input.ref_no ?? null,
      note: input.note ?? null,
    }).select('id').single();
    if (error) throw error;
    const grn_id = (ins as any).id as number;

    const payload = input.items.map(it => ({
      grn_id, po_item_id: null,
      description: it.description ?? null, uom: it.uom ?? null,
      qty_input: Number(it.qty_input || 0),
    }));
    const { error: i1 } = await supabase.from('grn_items').insert(payload);
    if (i1) throw i1;
    return grn_id;
  }
}

export async function deleteGRN(id: number) {
  const { error } = await supabase.from('grns').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// v_grn_list sekarang sudah include po_number
export async function listGRN({ q = '', page = 1, pageSize = 50 } = {}) {
  let query = supabase
    .from('v_grn_list')
    .select(
      'id, grn_number, date_received, purchase_order_id, po_number, vendor_id, vendor_name, ref_no, status, po_qty, received_qty, overage_qty',
      { count: 'exact' }
    )
    .order('date_received', { ascending: false })
    .order('id', { ascending: false });

  if (q.trim()) {
    query = query.or(
      `grn_number.ilike.%${q}%,ref_no.ilike.%${q}%,vendor_name.ilike.%${q}%`
    );
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query.range(from, to);
  if (error) throw error;

  return { rows: (data ?? []) as GrnListRow[], total: count ?? 0 };
}

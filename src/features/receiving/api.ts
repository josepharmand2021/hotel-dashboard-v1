import { supabase } from '@/lib/supabase/client';

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

export type POItemView = {
  id: number;               // po_item_id
  description: string | null;
  uom: string | null;
  qty_order: number;
  qty_matched: number;
  qty_remaining: number;
};

/** PO helper: ambil item + sisa */
export async function getPOWithItems(purchase_order_id: number) {
  const { data: items, error } = await supabase
    .from('po_items')
    .select('id, description, uom, qty')
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
    return {
      id: it.id,
      description: it.description,
      uom: it.uom,
      qty_order: Number(it.qty),
      qty_matched: Number(f.qty_matched),
      qty_remaining: Number(f.qty_remaining),
    };
  });

  return { lines };
}

/** List GRN (ringkas + total overage) */
export async function listGRN(opts?: { q?: string; page?: number; pageSize?: number }) {
  const page = Math.max(1, opts?.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, opts?.pageSize ?? 20));
  const from = (page - 1) * pageSize, to = from + pageSize - 1;

  let q = supabase.from('grns')
    .select('id, grn_number, date_received, purchase_order_id, vendor_id, vendor_name, status, ref_no', { count: 'exact' })
    .order('date_received', { ascending: false });

  if (opts?.q?.trim()) {
    const s = `%${opts.q.trim()}%`;
    q = q.or(`grn_number.ilike.${s},ref_no.ilike.${s},vendor_name.ilike.${s},note.ilike.${s}`);
  }

  const { data, error, count } = await q.range(from, to);
  if (error) throw error;

  const ids = (data ?? []).map(r => r.id);
  let overage: Record<number, number> = {};
  if (ids.length) {
    const { data: og, error: e2 } = await supabase
      .from('grn_items')
      .select('grn_id, qty_overage')
      .in('grn_id', ids);
    if (e2) throw e2;
    for (const r of og ?? []) {
      overage[r.grn_id] = (overage[r.grn_id] ?? 0) + Number(r.qty_overage || 0);
    }
  }

  return {
    rows: (data ?? []).map((r: any) => ({ ...r, overage_qty: overage[r.id] ?? 0 })),
    total: count ?? 0, page, pageSize
  };
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

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

const asNumber = (v: any, def = 0) => {
  const n = Number(String(v).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : def;
};
const toDate = (v: any): string | null => {
  if (!v) return null;
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};

export async function POST(req: Request) {
  // --- parse JSON body aman ---
  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const {
    po_number,
    vendor_id,
    po_date,
    delivery_date,
    is_tax_included = true,
    tax_percent = 11,
    note,
    items,
  } = body ?? {};

  // --- validasi ringan ---
  if (!po_number) return NextResponse.json({ error: 'PO Number is required' }, { status: 400 });
  if (!vendor_id) return NextResponse.json({ error: 'Vendor is required' }, { status: 400 });
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'Items must not be empty' }, { status: 400 });
  }

  // --- hitung subtotal/total (optional: simpan ke PO.total) ---
  const subtotal = items.reduce(
    (sum: number, it: any) => sum + asNumber(it?.qty) * asNumber(it?.unit_price),
    0
  );
  const total = (is_tax_included ? subtotal : subtotal * (1 + asNumber(tax_percent) / 100));

  const sb = await supabaseServer();

  // 1) insert header
  const { data: hdr, error: e1 } = await sb
    .from('purchase_orders')
    .insert({
      po_number: String(po_number),
      vendor_id: Number(vendor_id),
      po_date: toDate(po_date) ?? new Date().toISOString().slice(0, 10),
      delivery_date: toDate(delivery_date),
      is_tax_included: !!is_tax_included,
      tax_percent: asNumber(tax_percent, 11),
      note: note ? String(note) : null,
      total, // kalau tidak mau menyimpan, boleh dihapus
      status: 'draft',
    })
    .select('id')
    .single();

  if (e1) {
    return NextResponse.json({ error: e1.message }, { status: 400 });
  }

  // 2) insert items
  const rows = items.map((it: any) => ({
    purchase_order_id: hdr.id,
    description: String(it?.description || ''),
    qty: asNumber(it?.qty, 0),
    unit: it?.unit ? String(it.unit) : null,
    unit_price: asNumber(it?.unit_price, 0),
  }));

  const { error: e2 } = await sb.from('po_items').insert(rows);
  if (e2) {
    // kalau gagal insert items, hapus header biar nggak orphan
    await sb.from('purchase_orders').delete().eq('id', hdr.id);
    return NextResponse.json({ error: e2.message }, { status: 400 });
  }

  return NextResponse.json({ id: hdr.id }, { status: 201 });
}

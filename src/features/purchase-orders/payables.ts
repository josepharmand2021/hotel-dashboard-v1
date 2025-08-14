'use client';
import { supabase } from '@/lib/supabase/client';

export type PayablePO = {
  id: number;
  po_number: string;
  vendor_name: string;
  total: number;
  paid: number;
  remaining: number;
  due_date: string | null;
};

export async function listPOsForPayment(q: string = '', limit = 20): Promise<PayablePO[]> {
  // 1) Ambil header + total dari view
  let headQ = supabase
    .from('v_po_with_terms')
    .select('id, po_number, vendor_name, total_amount, due_date_effective')
    .order('po_date', { ascending: false })
    .limit(limit);

  if (q && q.trim()) {
    const term = `%${q.trim()}%`;
    headQ = headQ.or(`po_number.ilike.${term},vendor_name.ilike.${term}`);
  }

  const { data: heads, error: e1 } = await headQ;
  if (e1) throw e1;

  if (!heads || heads.length === 0) return [];

  const ids = heads.map((h: any) => h.id);

  // 2) Ambil total paid dari allocations
  const { data: allocs, error: e2 } = await supabase
    .from('po_expense_allocations')
    .select('purchase_order_id, amount')
    .in('purchase_order_id', ids);
  if (e2) throw e2;

  const paidMap = new Map<number, number>();
  for (const a of allocs || []) {
    paidMap.set(a.purchase_order_id, (paidMap.get(a.purchase_order_id) || 0) + Number(a.amount || 0));
  }

  // 3) Gabungkan + filter remaining > 0
  const rows: PayablePO[] = (heads || []).map((h: any) => {
    const total = Number(h.total_amount || 0);
    const paid = Number(paidMap.get(h.id) || 0);
    const remaining = Math.max(0, total - paid);
    return {
      id: h.id,
      po_number: String(h.po_number || ''),
      vendor_name: String(h.vendor_name || ''),
      total,
      paid,
      remaining,
      due_date: h.due_date_effective ?? null,
    };
  });

  return rows.filter(r => r.remaining > 0);
}

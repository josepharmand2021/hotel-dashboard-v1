'use client';
import { supabase } from '@/lib/supabase/client';

export type AllocationRow = {
  id: number;
  purchase_order_id: number;
  po_number: string;
  vendor_id: number;
  vendor_name: string;
  amount: number;
  created_at: string;
};

/** Ambil daftar alokasi pembayaran (expense → PO) untuk 1 expense */
export async function listAllocationsForExpense(expenseId: number): Promise<AllocationRow[]> {
  const { data, error } = await supabase
    .from('po_expense_allocations')
    .select(`
      id, amount, created_at, purchase_order_id,
      purchase_orders!po_expense_allocations_purchase_order_id_fkey (
        id, po_number, vendor_id,
        vendors:vendors!purchase_orders_vendor_id_fkey ( id, name )
      )
    `)
    .eq('expense_id', expenseId)
    .order('id', { ascending: true });

  if (error) throw error;

  return (data ?? []).map((r: any) => {
    const po = Array.isArray(r.purchase_orders) ? r.purchase_orders[0] : r.purchase_orders;
    const v = po?.vendors ? (Array.isArray(po.vendors) ? po.vendors[0] : po.vendors) : null;

    return {
      id: Number(r.id),
      purchase_order_id: Number(po?.id ?? r.purchase_order_id),
      po_number: String(po?.po_number ?? ''),
      vendor_id: Number(v?.id ?? po?.vendor_id ?? 0),
      vendor_name: String(v?.name ?? '—'),
      amount: Number(r.amount ?? 0),
      created_at: String(r.created_at ?? ''),
    };
  });
}

/** Link/alokasikan sejumlah amount dari expense ke PO tertentu (pakai RPC) */
export async function allocateExpenseToPO(expenseId: number, poId: number, amount: number) {
  const { data, error } = await supabase.rpc('allocate_expense_to_po', {
    p_expense_id: expenseId,
    p_po_id: poId,
    p_amount: amount,
  });
  if (error) throw error;
  return data as number; // allocation_id
}

/** Hapus satu baris alokasi (kalau perlu) */
export async function removeAllocation(allocationId: number) {
  const { error } = await supabase
    .from('po_expense_allocations')
    .delete()
    .eq('id', allocationId);
  if (error) throw error;
}

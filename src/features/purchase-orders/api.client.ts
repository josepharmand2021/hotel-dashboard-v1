'use client';

import { supabase } from '@/lib/supabase/client';

/* ========== Types ========== */
export type ExpenseStatus = 'draft' | 'posted' | 'void';
export type ExpenseSource = 'PT' | 'RAB' | 'PETTY';
export type PaymentStatus = 'UNBILLED'|'UNPAID'|'PARTIAL'|'PAID'|'OVERDUE';

const pickOne = <T,>(v: T | T[] | null | undefined): T | null =>
  Array.isArray(v) ? (v[0] ?? null) : (v ?? null);

/* ========== PO row shapes ========== */
export type POListRow = {
  id: number;
  po_number: string;
  vendor_name: string;
  po_date: string | null;
  delivery_date: string | null;
  due_date: string | null;        // dari v_po_with_terms.due_date_effective
  total: number | null;           // dari v_po_with_terms.total_amount
  is_tax_included: boolean;
  tax_percent: number | null;
  status: 'draft' | 'sent' | 'delivered' | 'cancelled' | string;
  term_code?: 'CBD' | 'COD' | 'NET' | null;
  term_days?: number | null;

  // hasil merge v_po_finance
  amount_paid?: number;
  balance_due?: number;
  payment_status?: PaymentStatus; // UNPAID | PARTIAL | PAID | OVERDUE
  is_overdue?: boolean;
  days_overdue?: number;
};

export type POPaymentRow = {
  id: number;
  amount: number;
  created_at: string;
  expenses: {
    id: number;
    expense_date: string;
    status: ExpenseStatus;
    source: ExpenseSource;
    invoice_no: string | null;
    note: string | null;
    amount: number;
    vendor_id: number;
  };
};

/* ========== Helpers pembayaran ========== */
const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

/** Hitung status tunggal: PAID > OVERDUE > PARTIAL > UNPAID */
function derivePayment(total: number, paid: number, due_date_effective: string | null) {
  const t = Number(total || 0);
  const p = Number(paid || 0);
  const balance = Math.max(t - p, 0);

  const today = startOfDay(new Date());
  let status: PaymentStatus = 'UNBILLED';
  let days_overdue = 0;

  if (p >= t - 0.5) {
    status = 'PAID';
  } else {
    const dueIsPast =
      balance > 0 &&
      !!due_date_effective &&
      startOfDay(new Date(`${due_date_effective}T00:00:00`)) < today;

    if (dueIsPast) {
      status = 'OVERDUE';
      days_overdue = Math.max(
        1,
        Math.ceil(
          (Number(today) - Number(startOfDay(new Date(`${due_date_effective}T00:00:00`)))) / 86400000
        )
      );
    } else {
      status = p > 0 ? 'PARTIAL' : 'UNPAID';
    }
  }

  return { paid: p, balance, status, days_overdue };
}

/* ========== PO List (merge v_po_with_terms + v_po_finance) ========== */
export async function listPurchaseOrders({ q = '', page = 1, pageSize = 10 }) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('v_po_with_terms')
    .select(
      `
      id, po_number, po_date, delivery_date, status,
      is_tax_included, tax_percent, vendor_id, vendor_name,
      subtotal, tax_amount, total_amount,
      effective_term_code, effective_term_days, due_date_effective
      `,
      { count: 'exact' }
    )
    .order('po_date', { ascending: false })
    .range(from, to);

  const term = q.trim();
  if (term) query = query.or(`po_number.ilike.%${term}%,vendor_name.ilike.%${term}%`);

  const { data, error, count } = await query;
  if (error) throw error;

// ... tetap sama di atas

const baseRows: POListRow[] = (data ?? []).map((r: any) => ({
  id: Number(r.id),
  po_number: String(r.po_number),
  vendor_name: String(r.vendor_name ?? ''),
  po_date: r.po_date ?? null,
  delivery_date: r.delivery_date ?? null,
  due_date: r.due_date_effective ?? null,
  total: Number(r.total_amount ?? 0),
  is_tax_included: !!r.is_tax_included,
  tax_percent: r.tax_percent == null ? null : Number(r.tax_percent),
  status: r.status as string,
  term_code: r.effective_term_code ?? null,
  term_days: r.effective_term_days == null ? null : Number(r.effective_term_days),

  // DEFAULT: belum ditagih → UNBILLED
  amount_paid: 0,
  balance_due: Number(r.total_amount ?? 0),
  payment_status: 'UNBILLED',
  is_overdue: false,
  days_overdue: 0,
}));

const ids = baseRows.map(r => r.id);
if (ids.length) {
  // 1) angka paid/outstanding
  const { data: fin, error: finErr } = await supabase
    .from('v_po_finance')
    .select('id, paid, outstanding')
    .in('id', ids);
  if (finErr) throw finErr;
  const mapFin = new Map<number, { paid: number; outstanding: number }>();
  (fin ?? []).forEach((r: any) =>
    mapFin.set(Number(r.id), {
      paid: Number(r.paid || 0),
      outstanding: Number(r.outstanding || 0),
    })
  );

  // 2) apakah ada payable aktif (non-void) utk PO ini?
  const { data: pays, error: payErr } = await supabase
    .from('payables')
    .select('po_id')
    .in('po_id', ids)
    .in('status', ['unpaid', 'paid']); // abaikan 'void'
  if (payErr) throw payErr;

  const hasPayable = new Set<number>();
  (pays ?? []).forEach((p: any) => {
    if (p?.po_id != null) hasPayable.add(Number(p.po_id));
  });

  // 3) kalau ADA payable → hitung UNPAID/PARTIAL/OVERDUE/PAID
  baseRows.forEach(r => {
    if (!hasPayable.has(r.id)) {
      // keep defaults: UNBILLED
      return;
    }
    const f = mapFin.get(r.id) || { paid: 0, outstanding: Number(r.total || 0) };
    const calc = derivePayment(Number(r.total || 0), f.paid, r.due_date);
    r.amount_paid   = calc.paid;
    r.balance_due   = calc.balance;
    r.payment_status = calc.status;
    r.is_overdue    = calc.status === 'OVERDUE';
    r.days_overdue  = calc.days_overdue;
  });
}

return { rows: baseRows, total: count ?? 0 };

}

/* ========== Update status header PO ========== */
export async function updatePurchaseOrderStatus(id: number, status: string) {
  const { error } = await supabase.from('purchase_orders').update({ status }).eq('id', id);
  if (error) throw error;
}

/* ========== Delete PO beserta dependensinya ========== */
export async function deletePurchaseOrder(id: number) {
  const { error: allocErr } = await supabase
    .from('po_expense_allocations')
    .delete()
    .eq('purchase_order_id', id);
  if (allocErr) throw allocErr;

  const { error: itemsErr } = await supabase
    .from('po_items')
    .delete()
    .eq('purchase_order_id', id);
  if (itemsErr) throw itemsErr;

  const { error: poErr } = await supabase
    .from('purchase_orders')
    .delete()
    .eq('id', id);
  if (poErr) throw poErr;
}

/* ========== Finance ringkas untuk satu PO ========== */
export async function getPOFinance(poId: number) {
  const { data, error } = await supabase
    .from('v_po_finance')
    .select('id,total,paid')
    .eq('id', poId)
    .maybeSingle();
  if (error) throw error;

  const total = Number(data?.total ?? 0);
  const paid = Number(data?.paid ?? 0);
  const outstanding = Math.max(total - paid, 0);
  return { id: poId, total, paid, outstanding };
}

/* ========== Daftar alokasi expense ke PO ========== */
export async function listPOPayments(poId: number): Promise<POPaymentRow[]> {
  const { data, error } = await supabase
    .from('po_expense_allocations')
    .select(`
      id, amount, created_at,
      expenses:expenses(
        id, expense_date, status, source, invoice_no, note, amount, vendor_id
      )
    `)
    .eq('purchase_order_id', poId)
    .order('id', { ascending: true });
  if (error) throw error;

  return (data ?? []).map((r: any) => {
    const e = pickOne<any>(r.expenses);
    return {
      id: Number(r.id),
      amount: Number(r.amount ?? 0),
      created_at: String(r.created_at ?? ''),
      expenses: {
        id: Number(e?.id ?? 0),
        expense_date: String(e?.expense_date ?? ''),
        status: (e?.status ?? 'draft') as ExpenseStatus,
        source: (e?.source ?? 'PT') as ExpenseSource,
        invoice_no: e?.invoice_no ?? null,
        note: e?.note ?? null,
        amount: Number(e?.amount ?? 0),
        vendor_id: Number(e?.vendor_id ?? 0),
      },
    };
  });
}

/* ========== RPC bayar PO (buat expense + allocation) ========== */
export async function payPO(
  poId: number,
  p: {
    source: ExpenseSource;
    expense_date: string;
    amount: number;
    vendor_id: number;
    category_id: number;
    subcategory_id: number;
    status?: ExpenseStatus;
    shareholder_id?: number | null; // RAB
    cashbox_id?: number | null;     // PETTY
    invoice_no?: string | null;
    note?: string | null;
  }
) {
  const { data, error } = await supabase.rpc('pay_po', {
    p_po_id: poId,
    p_source: p.source,
    p_expense_date: p.expense_date,
    p_amount: p.amount,
    p_vendor_id: p.vendor_id,
    p_category_id: p.category_id,
    p_subcategory_id: p.subcategory_id,
    p_status: p.status ?? 'posted',
    p_shareholder_id: p.source === 'RAB' ? p.shareholder_id ?? null : null,
    p_cashbox_id: p.source === 'PETTY' ? p.cashbox_id ?? null : null,
    p_invoice_no: p.invoice_no ?? null,
    p_note: p.note ?? null,
  });
  if (error) throw error;
  return data as { expense_id: number; allocation_id: number }[];
}

/* ========== RPC alokasikan expense ke PO (alur dari expense) ========== */
export async function allocateExpenseToPO(expenseId: number, poId: number, amount: number) {
  const { data, error } = await supabase.rpc('allocate_expense_to_po', {
    p_expense_id: expenseId,
    p_po_id: poId,
    p_amount: amount,
  });
  if (error) throw error;
  return data as number; // allocation_id
}

/* ========== Pencarian PO untuk modul pembayaran ========== */
export type POForPayment = {
  id: number;
  po_number: string;
  vendor_id: number;
  vendor_name: string;
  total: number;
  paid: number;
  outstanding: number;
};

export async function searchPOsForPayment(q = '', limit = 20): Promise<POForPayment[]> {
  let query = supabase
    .from('v_po_finance')
    .select('id, po_number, vendor_id, vendor_name, total, paid, outstanding')
    .gt('outstanding', 0)
    .order('po_number', { ascending: false })
    .limit(limit);

  const term = q.trim();
  if (term) query = query.or(`po_number.ilike.%${term}%,vendor_name.ilike.%${term}%`);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    id: Number(r.id),
    po_number: String(r.po_number),
    vendor_id: Number(r.vendor_id),
    vendor_name: String(r.vendor_name ?? '—'),
    total: Number(r.total || 0),
    paid: Number(r.paid || 0),
    outstanding: Number(r.outstanding || 0),
  }));
}

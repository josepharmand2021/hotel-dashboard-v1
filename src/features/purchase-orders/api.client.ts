'use client';
import { supabase } from '@/lib/supabase/client';

/** Ambil 1 dari object/array/null */
const pickOne = <T,>(v: T | T[] | null | undefined): T | null =>
  Array.isArray(v) ? (v[0] ?? null) : (v ?? null);

/* ===== Types ===== */
export type ExpenseStatus = 'draft'|'posted'|'void';
export type ExpenseSource = 'PT'|'RAB'|'PETTY';
export type PaymentStatus = 'UNPAID'|'PARTIAL'|'PAID'|'OVERDUE';

// Simple pickers — change table names if needed
export type ExpenseCategory = { id: number; name: string };
export type ExpenseSubcategory = { id: number; name: string; category_id: number };

export async function listExpenseCategories(): Promise<ExpenseCategory[]> {
  const { data, error } = await supabase
    .from('expense_categories')    // <- rename if your table name differs
    .select('id, name')
    .order('name');
  if (error) throw error;
  return (data ?? []).map((r: any) => ({ id: Number(r.id), name: String(r.name) }));
}

export async function listExpenseSubcategories(categoryId: number): Promise<ExpenseSubcategory[]> {
  const { data, error } = await supabase
    .from('expense_subcategories') // <- rename if needed
    .select('id, name, category_id')
    .eq('category_id', categoryId)
    .order('name');
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: Number(r.id),
    name: String(r.name),
    category_id: Number(r.category_id),
  }));
}

export type POListRow = {
  id: number;
  po_number: string;
  vendor_name: string;
  po_date: string | null;
  delivery_date: string | null;
  /** due_date dari v_po_with_terms (effective) */
  due_date: string | null;
  /** total_amount dari v_po_with_terms */
  total: number | null;
  is_tax_included: boolean;
  tax_percent: number | null;
  status: 'draft'|'sent'|'delivered'|'cancelled'|string;
  term_code?: 'CBD'|'COD'|'NET'|null;
  term_days?: number | null;

  /** ==== hasil merge dengan v_po_finance ==== */
  amount_paid?: number;           // paid
  balance_due?: number;           // outstanding
  payment_status?: PaymentStatus; // UNPAID | PARTIAL | PAID | OVERDUE
  is_overdue?: boolean;           // derived from payment_status === 'OVERDUE'
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

/* ===== Helpers pembayaran ===== */
const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };

/** Hitung status tunggal: PAID > OVERDUE > PARTIAL > UNPAID */
function derivePayment(
  total: number,
  paid: number,
  due_date_effective: string | null
) {
  const t = Number(total || 0);
  const p = Number(paid || 0);
  const balance = Math.max(t - p, 0);

  const today = startOfDay(new Date());
  let status: PaymentStatus = 'UNPAID';
  let days_overdue = 0;

  if (p >= t - 0.5) {
    status = 'PAID';
  } else {
    const dueIsPast = Boolean(
      balance > 0 &&
      due_date_effective &&
      startOfDay(new Date(`${due_date_effective}T00:00:00`)) < today
    );
    if (dueIsPast) {
      status = 'OVERDUE';
      days_overdue = Math.max(
        1,
        Math.ceil(
          (Number(today) - Number(startOfDay(new Date(`${due_date_effective}T00:00:00`)))) /
          86400000
        )
      );
    } else {
      status = p > 0 ? 'PARTIAL' : 'UNPAID';
    }
  }

  return { paid: p, balance, status, days_overdue };
}

/* =========================
   PO List: ambil dari v_po_with_terms lalu MERGE v_po_finance
========================= */
export async function listPurchaseOrders({ q = '', page = 1, pageSize = 10 }) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('v_po_with_terms')
    .select(
      `
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
    `,
      { count: 'exact' }
    )
    .order('po_date', { ascending: false })
    .range(from, to);

  const term = q.trim();
  if (term) query = query.or(`po_number.ilike.%${term}%,vendor_name.ilike.%${term}%`);

  const { data, error, count } = await query;
  if (error) throw error;

  const baseRows = (data ?? []).map((r: any) => ({
    id: r.id as number,
    po_number: r.po_number as string,
    vendor_name: r.vendor_name ?? '',
    po_date: r.po_date as string | null,
    delivery_date: r.delivery_date as string | null,
    due_date: (r.due_date_effective ?? null) as string | null,
    total: Number(r.total_amount ?? 0),
    is_tax_included: !!r.is_tax_included,
    tax_percent: r.tax_percent == null ? null : Number(r.tax_percent),
    status: r.status as string,
    term_code: r.effective_term_code ?? null,
    term_days: r.effective_term_days == null ? null : Number(r.effective_term_days),
  })) as POListRow[];

  // Ambil angka Paid/Outstanding dari v_po_finance untuk ID yang tampil pada halaman ini
  const ids = baseRows.map(r => r.id);
  if (ids.length) {
    const { data: fin, error: finErr } = await supabase
      .from('v_po_finance')
      .select('id, paid, outstanding')
      .in('id', ids);
    if (finErr) throw finErr;

    const mapFin = new Map<number, { paid: number; outstanding: number }>();
    (fin ?? []).forEach((r: any) =>
      mapFin.set(Number(r.id), { paid: Number(r.paid || 0), outstanding: Number(r.outstanding || 0) })
    );

    baseRows.forEach(r => {
      const f = mapFin.get(r.id) || { paid: 0, outstanding: Number(r.total || 0) };
      const calc = derivePayment(Number(r.total || 0), f.paid, r.due_date);

      r.amount_paid   = calc.paid;
      r.balance_due   = calc.balance;
      r.payment_status = calc.status;               // satu status utama
      r.is_overdue    = calc.status === 'OVERDUE';  // derived
      r.days_overdue  = calc.days_overdue;
    });
  }

  return { rows: baseRows, total: count ?? 0 };
}

/* =========================
   Update Status (client)
========================= */
export async function updatePurchaseOrderStatus(id: number, status: string) {
  const { error } = await supabase.from('purchase_orders').update({ status }).eq('id', id);
  if (error) throw error;
}

/* =========================
   Delete PO (hapus allocations ➜ items ➜ header)
========================= */
export async function deletePurchaseOrder(id: number) {
  // 1) hapus alokasi pembayaran yang refer ke PO ini
  const { error: allocErr } = await supabase
    .from('po_expense_allocations')
    .delete()
    .eq('purchase_order_id', id);
  if (allocErr) throw allocErr;

  // 2) hapus item
  const { error: itemsErr } = await supabase.from('po_items').delete().eq('purchase_order_id', id);
  if (itemsErr) throw itemsErr;

  // 3) hapus header
  const { error: poErr } = await supabase.from('purchase_orders').delete().eq('id', id);
  if (poErr) throw poErr;
}

/* =========================
   Finance: paid/outstanding dari view v_po_finance
   (opsional) kirimkan due_date_effective agar bisa derive OVERDUE
========================= */
export async function getPOFinance(poId: number, due_date_effective?: string) {
  const { data, error } = await supabase
    .from('v_po_finance')
    .select('*')
    .eq('id', poId)
    .single();
  if (error) throw error;

  const total = Number(data.total || 0);
  const paid = Number(data.paid || 0);
  const calc = derivePayment(total, paid, due_date_effective ?? null);

  return {
    id: Number(data.id),
    po_number: String(data.po_number ?? ''),
    total,
    paid: calc.paid,
    outstanding: calc.balance,
    payment_status: calc.status as PaymentStatus,
    days_overdue: calc.days_overdue,
  };
}

/* =========================
   List payment allocations utk 1 PO
========================= */
export async function listPOPayments(poId: number): Promise<POPaymentRow[]> {
  const { data, error } = await supabase
    .from('po_expense_allocations')
    .select(
      `
      id, amount, created_at,
      expenses:expenses(
        id, expense_date, status, source, invoice_no, note, amount, vendor_id
      )
    `
    )
    .eq('purchase_order_id', poId)
    .order('id', { ascending: true });
  if (error) throw error;

  const rows: POPaymentRow[] = (data ?? []).map((r: any) => {
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

  return rows;
}

/* =========================
   Bayar PO (alur via PO) : RPC pay_po
========================= */
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
    cashbox_id?: number | null; // PETTY
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

/* =========================
   Alur via Expense: alokasikan expense ke PO
========================= */
export async function allocateExpenseToPO(expenseId: number, poId: number, amount: number) {
  const { data, error } = await supabase.rpc('allocate_expense_to_po', {
    p_expense_id: expenseId,
    p_po_id: poId,
    p_amount: amount,
  });
  if (error) throw error;
  return data as number; // allocation_id
}

export type POForPayment = {
  id: number; po_number: string;
  vendor_id: number; vendor_name: string;
  total: number; paid: number; outstanding: number;
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
    id: r.id,
    po_number: r.po_number,
    vendor_id: r.vendor_id,
    vendor_name: r.vendor_name ?? '—',
    total: Number(r.total || 0),
    paid: Number(r.paid || 0),
    outstanding: Number(r.outstanding || 0),
  }));
}


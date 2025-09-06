// src/features/expenses/api.ts
import { supabase } from '@/lib/supabase/client';
import { getDefaultPTBankId } from '@/features/bank-accounts/api';
import type { ExpenseListItem, ExpenseListFilters, ExpenseDetail } from './types';

export type Category = { id: number; name: string };
export type Subcategory = { id: number; name: string; category_id: number };
export type Shareholder = { id: number; name: string };
export type Vendor = { id: number; name: string };

/* ========= helpers ========= */

function monthToRange(month: string): { from: string; to: string } {
  const y = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7));
  const from = `${y}-${String(m).padStart(2, '0')}-01`;
  const nextY = m === 12 ? y + 1 : y;
  const nextM = m === 12 ? 1 : m + 1;
  const to = `${nextY}-${String(nextM).padStart(2, '0')}-01`;
  return { from, to };
}

/* ========= lookups ========= */

export async function listCategories(): Promise<Category[]> {
  const { data, error } = await supabase.from('categories').select('id,name').order('name');
  if (error) throw error;
  return data || [];
}

export async function listSubcategories(categoryId?: number): Promise<Subcategory[]> {
  let q = supabase.from('subcategories').select('id,name,category_id').order('name');
  if (categoryId) q = q.eq('category_id', categoryId);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function listActiveShareholders(): Promise<Shareholder[]> {
  const { data, error } = await supabase
    .from('shareholders')
    .select('id,name')
    .eq('active', true)
    .order('name');
  if (error) throw error;
  return data || [];
}

export async function listVendors(): Promise<Vendor[]> {
  const { data, error } = await supabase.from('vendors').select('id,name').order('name', { ascending: true });
  if (error) throw error;
  return data || [];
}

/* ========= commands ========= */

type BaseExpensePayload = {
  source: 'RAB' | 'PT' | 'PETTY';
  shareholder_id?: number | null;  // RAB
  cashbox_id?: number | null;      // PETTY
  expense_date: string;
  amount: number;
  category_id: number;
  subcategory_id: number;
  vendor_id: number;
  invoice_no?: string | null;
  note?: string | null;
  status?: 'draft' | 'posted' | 'void';
};

function normalizeForInsert(p: BaseExpensePayload) {
  if (p.source === 'RAB' && !p.shareholder_id) throw new Error('Shareholder wajib diisi untuk sumber RAB');
  if (p.source === 'PETTY' && !p.cashbox_id) throw new Error('Cashbox wajib diisi untuk sumber PETTY');

  return {
    source: p.source,
    shareholder_id: p.source === 'RAB' ? (p.shareholder_id ?? null) : null,
    cashbox_id:     p.source === 'PETTY' ? (p.cashbox_id ?? null) : null,
    expense_date: p.expense_date,
    amount: Math.round(p.amount),
    category_id: p.category_id,
    subcategory_id: p.subcategory_id,
    vendor_id: p.vendor_id,
    invoice_no: p.invoice_no ?? null,
    note: p.note ?? null,
    status: p.status ?? 'posted',
  };
}

export async function createExpense(payload: BaseExpensePayload): Promise<{ id: number }> {
  const body: any = normalizeForInsert(payload);
  if (body.source === 'PT' && body.status === 'posted') {
    body.account_id = await getDefaultPTBankId();
  }

  // insert expense
  const { data, error } = await supabase
    .from('expenses')
    .insert(body)
    .select('id, payable_id, invoice_no, vendor_id')
    .single();
  if (error) throw error;
  const expenseId = Number(data.id);

  // 1) coba autolink ke payable berdasarkan invoice_no + vendor_id
  await linkExpenseToPayable(expenseId);

  // 2) ambil payable_id terbaru lalu recalc status payable
  const { data: exp2 } = await supabase
    .from('expenses')
    .select('payable_id')
    .eq('id', expenseId)
    .maybeSingle();

  if (exp2?.payable_id) {
    await recalcPayableStatusClient(Number(exp2.payable_id));
  }

  return { id: expenseId };
}

export async function updateExpense(id: number, payload: BaseExpensePayload) {
  const body: any = normalizeForInsert(payload);
  if (body.source === 'PT' && body.status === 'posted') {
    body.account_id = await getDefaultPTBankId();
  }

  // update expense
  const { error } = await supabase.from('expenses').update(body).eq('id', id);
  if (error) throw error;

  // 1) coba autolink (kalau invoice/vendor barusan berubah)
  await linkExpenseToPayable(id);

  // 2) ambil payable_id terbaru lalu recalc status payable
  const { data: exp2 } = await supabase
    .from('expenses')
    .select('payable_id')
    .eq('id', id)
    .maybeSingle();

  if (exp2?.payable_id) {
    await recalcPayableStatusClient(Number(exp2.payable_id));
  }
}

export async function setExpenseStatus(id: number, status: 'draft'|'posted'|'void') {
  const patch: any = { status };
  if (status === 'posted') {
    const { data: row, error: e0 } = await supabase.from('expenses').select('source, account_id').eq('id', id).single();
    if (e0) throw e0;
    if (row?.source === 'PT' && !row?.account_id) patch.account_id = await getDefaultPTBankId();
  }

  const { error } = await supabase.from('expenses').update(patch).eq('id', id);
  if (error) throw error;

  // 1) pastikan sudah ter-link
  await linkExpenseToPayable(id);

  // 2) recalc status payable kalau ada
  const { data: exp2 } = await supabase
    .from('expenses')
    .select('payable_id')
    .eq('id', id)
    .maybeSingle();

  if (exp2?.payable_id) {
    await recalcPayableStatusClient(Number(exp2.payable_id));
  }
}

export async function deleteExpense(id: number) {
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) throw error;
}

export async function listExpenses(filters: ExpenseListFilters) {
  const {
    month, date_from, date_to, source = 'all', status = 'all',
    category_id, subcategory_id, shareholder_id, q,
    page = 1, pageSize = 20, orderBy = 'expense_date', orderDir = 'desc',
  } = filters;

  let query = supabase
    .from('expenses')
    .select(`
      id, expense_date, period_month, source, status, amount,
      category_id, subcategory_id, account_id, cashbox_id, payable_id,
      shareholder_id, vendor_id, vendor_name, invoice_no, note,
      created_at, updated_at,
      categories:categories(name),
      subcategories:subcategories(name),
      shareholders:shareholders(name),
      vendors:vendors(name),
      payables:payables!expenses_payable_id_fkey(
        id,
        po_id,
        purchase_orders:purchase_orders(id, po_number)
      )
    `, { count: 'exact', head: false });

  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const from = `${month}-01`;
    const [y, m] = month.split('-').map(Number);
    const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
    query = query.gte('expense_date', from).lt('expense_date', next);
  } else {
    if (date_from) query = query.gte('expense_date', date_from);
    if (date_to)   query = query.lte('expense_date', date_to);
  }

  if (source && source !== 'all') query = query.eq('source', source);
  if (status && status !== 'all') query = query.eq('status', status);
  if (category_id) query = query.eq('category_id', category_id);
  if (subcategory_id) query = query.eq('subcategory_id', subcategory_id);
  if (shareholder_id) query = query.eq('shareholder_id', shareholder_id);

  if (q && q.trim()) {
    const term = `%${q.trim()}%`;
    query = query.or(`vendor_name.ilike.${term},invoice_no.ilike.${term},note.ilike.${term}`);
  }

  query = query.order(orderBy, { ascending: orderDir === 'asc' })
               .range((page - 1) * pageSize, (page * pageSize) - 1);

  const { data, error, count } = await query;
  if (error) throw error;

  const rows: ExpenseListItem[] = (data || []).map((r: any) => {
    const po = r?.payables?.purchase_orders ?? null;
    const po_ref = po?.id ? { id: Number(po.id), po_number: String(po.po_number ?? '') } : null;

    return {
      id: r.id,
      expense_date: r.expense_date,
      period_month: r.period_month,
      source: r.source,
      status: r.status,
      amount: r.amount,

      category_id: r.category_id,
      subcategory_id: r.subcategory_id,
      category_name: r.categories?.name ?? '',
      subcategory_name: r.subcategories?.name ?? '',

      shareholder_id: r.shareholder_id ?? null,
      shareholder_name: r.shareholders?.name ?? null,

      vendor_id: r.vendor_id ?? null,
      vendor_name: r.vendor_name ?? r.vendors?.name ?? null,

      invoice_no: r.invoice_no ?? null,
      note: r.note ?? null,

      created_at: r.created_at,
      updated_at: r.updated_at,

      // KUNCI: bawa payable_id
      payable_id: r.payable_id ?? r?.payables?.id ?? null,

      // kompat lama (kalau UI lain masih pakai)
      po_ref,
      po_refs: po_ref ? [po_ref] : [],
    };
  });

  return { rows, count: count ?? 0 };
}

export async function getBudgetProgress(args: {
  period_month: string;
  category_id: number;
  subcategory_id: number;
}) {
  const { data, error } = await supabase
    .from('v_budget_progress_monthly')
    .select('*')
    .eq('period_month', args.period_month)
    .eq('category_id', args.category_id)
    .eq('subcategory_id', args.subcategory_id)
    .maybeSingle();

  if (error) throw error;
  return (data as any) ?? null;
}

export async function getExpense(id: number): Promise<ExpenseDetail> {
  const { data, error } = await supabase
    .from('expenses')
    .select(`
      id, source, expense_date, period_month, amount, status,
      category_id, subcategory_id,
      vendor_id, vendor_name, account_id, shareholder_id, cashbox_id,
      invoice_no, note, created_at, updated_at, payable_id,
      categories:categories(name),
      subcategories:subcategories(name),
      shareholders:shareholders(name),
      vendors:vendors(name),
      petty_cash_boxes:petty_cash_boxes(name),
      payables:payables!expenses_payable_id_fkey(
        id,
        po_id,
        purchase_orders:purchase_orders(id, po_number)
      )
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Expense tidak ditemukan');

  const po = (data as any)?.payables?.purchase_orders ?? null;
  const po_ref = po?.id ? { id: Number(po.id), po_number: String(po.po_number ?? '') } : null;

  return {
    id: data.id,
    source: data.source,
    expense_date: data.expense_date,
    period_month: data.period_month,
    amount: data.amount,

    category_id: data.category_id,
    subcategory_id: data.subcategory_id,

    vendor_id: data.vendor_id ?? null,
    account_id: data.account_id ?? null,
    shareholder_id: data.shareholder_id ?? null,
    cashbox_id: data.cashbox_id ?? null,

    invoice_no: data.invoice_no ?? null,
    note: data.note ?? null,
    status: data.status,

    created_at: data.created_at,
    updated_at: data.updated_at,

    categories: (data as any).categories ?? null,
    subcategories: (data as any).subcategories ?? null,
    shareholders: (data as any).shareholders ?? null,
    vendors: (data as any).vendors ?? null,
    petty_cash_boxes: (data as any).petty_cash_boxes ?? null,

    payable_id: data.payable_id ?? (data as any).payables?.id ?? null,
    po_ref,
  };
}

async function recalcPayableStatusClient(payableId: number) {
  // 1) ambil amount invoice
  const { data: p, error: ep } = await supabase
    .from('payables')
    .select('id, amount, status') // ganti 'amount' ke 'gross_amount' kalau kolommu pakai nama itu
    .eq('id', payableId)
    .maybeSingle();
  if (ep || !p) return;

  // 2) total dibayar = sum(expenses.amount) yang status 'posted'
  const { data: ex, error: ee } = await supabase
    .from('expenses')
    .select('amount, status')
    .eq('payable_id', payableId);
  if (ee) return;

  const paid = (ex ?? [])
    .filter(e => e.status === 'posted')
    .reduce((s, e: any) => s + Number(e.amount || 0), 0);

  const newStatus = paid >= Number(p.amount || 0) ? 'paid' : 'unpaid';

  if (newStatus !== p.status) {
    await supabase.from('payables').update({ status: newStatus }).eq('id', payableId);
  }
}
async function linkExpenseToPayable(expenseId: number) {
  const { data: exp } = await supabase
    .from('expenses')
    .select('invoice_no,vendor_id')
    .eq('id', expenseId)
    .maybeSingle();
  if (!exp?.invoice_no || !exp?.vendor_id) return;

  // coba exact match dulu
  let { data: pay } = await supabase
    .from('payables')
    .select('id')
    .eq('vendor_id', exp.vendor_id)
    .eq('invoice_no', exp.invoice_no)
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();

  // fallback: case-insensitive (tanpa wildcard = equal ignore case)
  if (!pay?.id) {
    const res = await supabase
      .from('payables')
      .select('id')
      .eq('vendor_id', exp.vendor_id)
      .ilike('invoice_no', exp.invoice_no) // tanpa % → equal, case-insensitive
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();
    pay = res.data ?? null;
  }

  if (!pay?.id) return;

  await supabase.from('expenses').update({ payable_id: pay.id }).eq('id', expenseId);
}

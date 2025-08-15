// src/features/expenses/api.ts
import { supabase } from '@/lib/supabase/client';
import { getDefaultPTBankId } from '@/features/bank-accounts/api';
import type { ExpenseListItem, ExpenseListFilters, ExpenseDetail } from './types';

export type Category = { id: number; name: string };
export type Subcategory = { id: number; name: string; category_id: number };
export type Shareholder = { id: number; name: string };
export type Vendor = { id: number; name: string };

/* ========= helpers ========= */

const pickOne = <T,>(v: T | T[] | null | undefined): T | null =>
  Array.isArray(v) ? (v[0] ?? null) : (v ?? null);

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

  // Auto-assign bank PT saat POSTED & source PT
  if (body.source === 'PT' && body.status === 'posted') {
    body.account_id = await getDefaultPTBankId();
  }

  // minta balik kolom id
  const { data, error } = await supabase
    .from('expenses')
    .insert(body)
    .select('id')     // <— penting
    .single();

  if (error) throw error;
  return { id: Number(data.id) };
}

export async function updateExpense(id: number, payload: BaseExpensePayload) {
  const body: any = normalizeForInsert(payload);
  if (body.source === 'PT' && body.status === 'posted') {
    body.account_id = await getDefaultPTBankId();
  }
  const { error } = await supabase.from('expenses').update(body).eq('id', id);
  if (error) throw error;
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
}

export async function deleteExpense(id: number) {
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) throw error;
}

/* ========= queries ========= */

function monthToRange(month: string): { from: string; to: string } {
  const y = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7));
  const from = `${y}-${String(m).padStart(2, '0')}-01`;
  const nextY = m === 12 ? y + 1 : y;
  const nextM = m === 12 ? 1 : m + 1;
  const to = `${nextY}-${String(nextM).padStart(2, '0')}-01`;
  return { from, to };
}

export async function listExpenses(filters: ExpenseListFilters) {
  const {
    month, date_from, date_to, source = 'all', status = 'all',
    category_id, subcategory_id, shareholder_id, q,
    page = 1, pageSize = 20, orderBy = 'expense_date', orderDir = 'desc',
  } = filters;

  const { data, error } = await supabase.rpc('list_expenses_rpc', {
    p_month: month ?? null,
    p_date_from: date_from ?? null,
    p_date_to: date_to ?? null,
    p_source: source ?? null,
    p_status: status ?? null,
    p_category_id: category_id ?? null,
    p_subcategory_id: subcategory_id ?? null,
    p_shareholder_id: shareholder_id ?? null,
    p_q: q ?? null,
    p_page: page,
    p_page_size: pageSize,
    p_order_by: orderBy,
    p_order_dir: orderDir,
  });

  if (error) throw error;

  const rows: ExpenseListItem[] = (data ?? []).map((r: any) => ({
    id: r.id,
    expense_date: r.expense_date,
    period_month: r.period_month,
    source: r.source,
    status: r.status,
    amount: r.amount,
    category_id: r.category_id,
    subcategory_id: r.subcategory_id,
    category_name: r.category_name ?? '',
    subcategory_name: r.subcategory_name ?? '',
    shareholder_id: r.shareholder_id ?? null,
    shareholder_name: r.shareholder_name ?? null,
    vendor_id: r.vendor_id ?? null,
    vendor_name: r.vendor_name ?? null,
    invoice_no: r.invoice_no ?? null,
    note: r.note ?? null,
    created_at: r.created_at,
    updated_at: r.updated_at,
    po_refs: Array.isArray(r.po_refs) ? r.po_refs : [],   // <-- dari RPC
  }));

  const total = Number((data?.[0]?.total_count) ?? 0);
  return { rows, count: total };
}


export async function getExpense(id: number): Promise<ExpenseDetail> {
  const { data, error } = await supabase
    .from('expenses')
    .select(`
      id, source, expense_date, period_month, amount,
      category_id, subcategory_id, vendor_id, account_id,
      shareholder_id, cashbox_id,
      invoice_no, note, status, created_at, updated_at,
      categories:categories(name),
      subcategories:subcategories(name),
      shareholders:shareholders(name),
      vendors:vendors(name),
      petty_cash_boxes:petty_cash_boxes(name)
    `)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as unknown as ExpenseDetail;
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

// src/features/expenses/api.ts
import { supabase } from '@/lib/supabase/client';
import type { ExpenseListItem, ExpenseListFilters, ExpenseDetail } from './types';

export type Category = { id: number; name: string };
export type Subcategory = { id: number; name: string; category_id: number };
export type Shareholder = { id: number; name: string };
export type Vendor = { id: number; name: string };

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
  const { data, error } = await supabase
    .from('vendors')
    .select('id,name')
    .order('name', { ascending: true });
  if (error) throw error;
  return data || [];
}

// src/features/expenses/api.ts
export async function createExpense(payload: {
  source: 'RAB' | 'PT' | 'PETTY';
  shareholder_id?: number | null;  // RAB saja
  cashbox_id?: number | null;      // PETTY saja  ✅
  expense_date: string;
  amount: number;
  category_id: number;
  subcategory_id: number;
  vendor_id: number;
  invoice_no?: string | null;
  note?: string | null;
  status?: 'draft' | 'posted';
}) {
  const body = {
    source: payload.source,
    // shareholder hanya untuk RAB
    shareholder_id:
      payload.source === 'RAB' ? (payload.shareholder_id ?? null) : null,
    // cashbox hanya untuk PETTY  ✅
    cashbox_id:
      payload.source === 'PETTY' ? (payload.cashbox_id ?? null) : null,

    expense_date: payload.expense_date,
    amount: Math.round(payload.amount),
    category_id: payload.category_id,
    subcategory_id: payload.subcategory_id,
    vendor_id: payload.vendor_id,
    invoice_no: payload.invoice_no ?? null,
    note: payload.note ?? null,
    status: payload.status ?? 'posted',
  } as const;

  const { error } = await supabase.from('expenses').insert(body);
  if (error) throw error;
}



function monthToRange(month: string): { from: string; to: string } {
  // 'YYYY-MM' -> [YYYY-MM-01, first day of next month)
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

  let query = supabase
    .from('expenses')
    .select(`
      id, expense_date, period_month, source, status, amount,
      category_id, subcategory_id,
      shareholder_id, vendor_id, vendor_name, invoice_no, note,
      created_at, updated_at,
      categories:categories(name),
      subcategories:subcategories(name),
      shareholders:shareholders(name),
      vendors:vendors(name)
    `, { count: 'exact', head: false });

  // date filters
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const { from, to } = monthToRange(month);
    query = query.gte('expense_date', from).lt('expense_date', to);
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
    // NB: kalau kolom vendor_name dihapus, ubah logic ini untuk cari di vendors.name
    query = query.or(`vendor_name.ilike.${term},invoice_no.ilike.${term},note.ilike.${term}`);
  }

  query = query.order(orderBy, { ascending: orderDir === 'asc' });

  const fromIdx = (page - 1) * pageSize;
  const toIdx = fromIdx + pageSize - 1;
  query = query.range(fromIdx, toIdx);

  const { data, error, count } = await query;
  if (error) throw error;

  const rows: ExpenseListItem[] = (data || []).map((r: any) => ({
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
  }));

  return { rows, count: count ?? 0 };
}

export async function getBudgetProgress(args: {
  period_month: string; // 'YYYY-MM-01'
  category_id: number;
  subcategory_id: number;
}): Promise<{
  period_month: string;
  category_id: number;
  subcategory_id: number;
  budget_amount: number;
  realised_monthly: number;
  realised_cumulative: number;
  remaining: number;
  realisation_pct: number | null;
} | null> {
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
      id, source, expense_date, period_month, amount,
      category_id, subcategory_id, vendor_id,
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


export async function setExpenseStatus(id: number, status: 'draft'|'posted'|'void') {
  const { error } = await supabase.from('expenses').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function deleteExpense(id: number) {
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) throw error;
}

// src/features/expenses/api.ts
export async function updateExpense(
  id: number,
  payload: {
    source: 'RAB'|'PT'|'PETTY';
    shareholder_id?: number | null;
    cashbox_id?: number | null;          // ✅ NEW
    expense_date: string;
    amount: number;
    category_id: number;
    subcategory_id: number;
    vendor_id: number;
    invoice_no?: string | null;
    note?: string | null;
    status?: 'draft'|'posted'|'void';
  }
) {
  const { error } = await supabase
    .from('expenses')
    .update({
      source: payload.source,
      shareholder_id: payload.source==='RAB' ? (payload.shareholder_id ?? null) : null,
      cashbox_id:   payload.source==='PETTY' ? (payload.cashbox_id ?? null) : null, // ✅ NEW
      expense_date: payload.expense_date,
      amount: Math.round(payload.amount),
      category_id: payload.category_id,
      subcategory_id: payload.subcategory_id,
      vendor_id: payload.vendor_id,
      invoice_no: payload.invoice_no ?? null,
      note: payload.note ?? null,
      status: payload.status ?? 'posted',
    })
    .eq('id', id);

  if (error) throw error;
}

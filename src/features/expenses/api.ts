import { supabase } from '@/lib/supabase/client';
import type { Expense } from './types';

export async function listExpenses(params?: {
  from?: string; to?: string;
  status?: 'draft'|'posted'|'void'|'all';
  source?: 'RAB'|'PT'|'PETTY'|'all';
  shareholderId?: number; accountId?: number; cashboxId?: number;
}) {
  let q = supabase.from('v_expenses_list').select('*');

  if (params?.from) q = q.gte('expense_date', params.from);
  if (params?.to) q = q.lte('expense_date', params.to);
  if (params?.status && params.status !== 'all') q = q.eq('status', params.status);
  if (params?.source && params.source !== 'all') q = q.eq('source', params.source);
  if (params?.shareholderId) q = q.eq('shareholder_id', params.shareholderId);
  if (params?.accountId) q = q.eq('account_id', params.accountId);
  if (params?.cashboxId) q = q.eq('cashbox_id', params.cashboxId);

  const { data, error } = await q.order('expense_date', { ascending: false });
  if (error) throw error;
  return (data || []) as (Expense & {
    shareholder_name?: string|null;
    account_name?: string|null;
    cashbox_name?: string|null;
  })[];
}

export async function createExpense(payload: {
  source: 'RAB'|'PT'|'PETTY';
  shareholder_id?: number | null;
  account_id?: number | null;
  cashbox_id?: number | null;
  expense_date: string;
  amount: number;
  category?: string | null;
  vendor?: string | null;
  invoice_no?: string | null;
  note?: string | null;
  status?: 'draft'|'posted'|'void';
}) {
  const { data, error } = await supabase
    .from('expenses')
    .insert({
      source: payload.source,
      shareholder_id: payload.source==='RAB'   ? (payload.shareholder_id ?? null) : null,
      account_id:     payload.source==='PT'    ? (payload.account_id     ?? null) : null,
      cashbox_id:     payload.source==='PETTY' ? (payload.cashbox_id     ?? null) : null,
      expense_date: payload.expense_date,
      amount: Math.round(payload.amount),
      category: payload.category ?? null,
      vendor: payload.vendor ?? null,
      invoice_no: payload.invoice_no ?? null,
      note: payload.note ?? null,
      status: payload.status ?? 'posted',
    })
    .select('id')
    .single();
  if (error) throw error;
  return data as { id: number };
}

export async function updateExpense(id: number, payload: Partial<{
  source: 'RAB'|'PT'|'PETTY';
  shareholder_id: number | null;
  account_id: number | null;
  cashbox_id: number | null;
  expense_date: string;
  amount: number;
  category: string | null;
  vendor: string | null;
  invoice_no: string | null;
  note: string | null;
}>) {
  const { error } = await supabase
    .from('expenses')
    .update({
      ...payload,
      amount: payload.amount != null ? Math.round(payload.amount) : undefined,
    })
    .eq('id', id);
  if (error) throw error;
}

export async function setExpenseStatus(id: number, status: 'draft'|'posted'|'void') {
  const { error } = await supabase.from('expenses').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function deleteExpense(id: number) {
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) throw error;
}

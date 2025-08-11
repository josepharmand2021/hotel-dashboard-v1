import { supabase } from '@/lib/supabase/client';
import type { RabMonthSummary, RabMonthGridRow, RabBalanceByShareholder } from './types';

export async function listAllocationMonths() {
  const { data, error } = await supabase.from('v_rab_allocation_months').select('*').order('period_month', { ascending: false });
  if (error) throw error; return (data || []) as RabMonthSummary[];
}

export async function listMonthGrid(periodMonth: string) { // 'YYYY-MM'
  const iso = periodMonth.endsWith('-01') ? periodMonth : `${periodMonth}-01`;
  const { data, error } = await supabase
    .from('v_rab_month_grid')
    .select('*')
    .eq('period_month', iso)
    .order('shareholder_name', { ascending: true });
  if (error) throw error; return (data || []) as RabMonthGridRow[];
}

export async function upsertAllocationsForMonth(periodMonth: string, rows: { shareholder_id: number; amount: number; note?: string | null }[]) {
  const iso = periodMonth.endsWith('-01') ? periodMonth : `${periodMonth}-01`;
  const payload = rows.map(r => ({ shareholder_id: r.shareholder_id, alloc_date: iso, amount: Math.max(0, Math.round(r.amount)), note: r.note ?? null }));
  const { error } = await supabase.from('rab_allocations').upsert(payload, { onConflict: 'shareholder_id,alloc_date' });
  if (error) throw error;
}

export async function listBalancesByShareholder() {
  const { data, error } = await supabase.from('v_rab_balances_by_shareholder').select('*').order('shareholder_name');
  if (error) throw error; return (data || []) as RabBalanceByShareholder[];
}

export async function listActiveShareholders() {
  const { data, error } = await supabase
    .from('shareholders')
    .select('id, name, ownership_percent')
    .eq('active', true)
    .order('name', { ascending: true });
  if (error) throw error; return (data || []) as { id: number; name: string; ownership_percent: number }[];
}

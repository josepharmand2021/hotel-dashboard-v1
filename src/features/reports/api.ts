// src/features/reports/api.ts
import { supabase } from '@/lib/supabase/client';

// ---------- Budget vs Realisation ----------
export type BVRow = {
  period_month: string;           // 'YYYY-MM-01'
  category_id: number;
  subcategory_id: number;
  budget_amount: number;
  realised_monthly: number;
  realised_cumulative: number;
  remaining: number;
  realisation_pct: number | null;
  categories?: { name: string } | null;
  subcategories?: { name: string } | null;
};

export async function getBudgetVsRealisation(args: {
  month?: string;               // 'YYYY-MM'
  category_id?: number;
  subcategory_id?: number;
}) {
  let q = supabase
    .from('v_budget_vs_realisation_monthly')
    .select('*, categories:categories(name), subcategories:subcategories(name)')
    .order('category_id', { ascending: true })
    .order('subcategory_id', { ascending: true });

  if (args.month && /^\d{4}-\d{2}$/.test(args.month)) {
    q = q.eq('period_month', `${args.month}-01`);
  }
  if (args.category_id) q = q.eq('category_id', args.category_id);
  if (args.subcategory_id) q = q.eq('subcategory_id', args.subcategory_id);

  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as BVRow[];
}

// ---------- Drilldown: daftar expenses pembentuk angka ----------
export async function listExpensesByMonthCategory(args: {
  month: string;                 // 'YYYY-MM'
  category_id: number;
  subcategory_id: number;
}) {
  const y = Number(args.month.slice(0, 4));
  const m = Number(args.month.slice(5));
  const from = `${y}-${String(m).padStart(2,'0')}-01`;
  const nextY = m === 12 ? y + 1 : y;
  const nextM = m === 12 ? 1 : m + 1;
  const to = `${nextY}-${String(nextM).padStart(2,'0')}-01`;

  const { data, error } = await supabase
    .from('expenses')
    .select(`
      id, expense_date, amount, invoice_no, note,
      shareholders:shareholders(name),
      vendors:vendors(name)
    `)
    .eq('status', 'posted')
    .eq('category_id', args.category_id)
    .eq('subcategory_id', args.subcategory_id)
    .gte('expense_date', from)
    .lt('expense_date', to)
    .order('expense_date', { ascending: true });

  if (error) throw error;
  return (data || []) as Array<{
    id: number;
    expense_date: string;
    amount: number;
    invoice_no: string | null;
    note: string | null;
    shareholders: { name: string } | null;
    vendors: { name: string } | null;
  }>;
}

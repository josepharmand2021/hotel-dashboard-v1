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
  // 1) ambil rows dari view TANPA nested join
  let q = supabase
    .from('v_budget_vs_realisation_monthly')
    .select('*')
    .order('category_id', { ascending: true })
    .order('subcategory_id', { ascending: true });

  if (args.month && /^\d{4}-\d{2}$/.test(args.month)) {
    q = q.eq('period_month', `${args.month}-01`);
  }
  if (args.category_id) q = q.eq('category_id', args.category_id);
  if (args.subcategory_id) q = q.eq('subcategory_id', args.subcategory_id);

  const { data, error } = await q;
  if (error) throw error;
  const rows = (data || []) as Omit<BVRow, 'categories'|'subcategories'>[];

  // 2) ambil kamus kategori & subkategori
  const [{ data: cats }, { data: subs }] = await Promise.all([
    supabase.from('categories').select('id, name'),
    supabase.from('subcategories').select('id, name, category_id'),
  ]);

  const catMap = new Map<number, string>(
    (cats ?? []).map((c: any) => [Number(c.id), String(c.name ?? '')]),
  );
  const subMap = new Map<number, string>(
    (subs ?? []).map((s: any) => [Number(s.id), String(s.name ?? '')]),
  );

  // 3) tempelkan nama ke setiap row
  return rows.map(r => ({
    ...r,
    categories: r.category_id
      ? { name: catMap.get(Number(r.category_id)) ?? '' }
      : null,
    subcategories: r.subcategory_id
      ? { name: subMap.get(Number(r.subcategory_id)) ?? '' }
      : null,
  })) as BVRow[];
}
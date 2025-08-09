// /features/budget-lines/api.ts
// Client-safe helpers for Budget Lines
import { supabase } from '@/lib/supabase/client';

export type BudgetLine = {
  id: number;
  category_id: number;
  subcategory_id: number;
  description?: string | null;
  amount: number;
  created_at?: string | null;
  category_name?: string;
  subcategory_name?: string;
};

/** List budget lines */
export async function listBudgetLines(opts?: {
  q?: string;                // search by description
  category_id?: number;
  subcategory_id?: number;
  page?: number;              // 1-based
  pageSize?: number;          // default 10
  orderBy?: 'created_at' | 'amount' | 'description';
  orderDir?: 'asc' | 'desc';
}) {
  const page = Math.max(1, opts?.page ?? 1);
  const pageSize = Math.min(100, Math.max(5, opts?.pageSize ?? 10));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const orderBy = opts?.orderBy ?? 'created_at';
  const orderDir = opts?.orderDir ?? 'desc';

  let q = supabase
    .from('budget_lines')
    .select(
      `
      id,
      category_id,
      subcategory_id,
      description,
      amount,
      created_at,
      category:categories(id,name),
      subcategory:subcategories(id,name)
    `,
      { count: 'exact' }
    )
    .order(orderBy, { ascending: orderDir === 'asc', nullsFirst: false });

  if (opts?.q?.trim()) {
    q = q.ilike('description', `%${opts.q.trim()}%`);
  }
  if (opts?.category_id) {
    q = q.eq('category_id', opts.category_id);
  }
  if (opts?.subcategory_id) {
    q = q.eq('subcategory_id', opts.subcategory_id);
  }

  const { data, error, count } = await q.range(from, to);
  if (error) throw error;

  const rows: BudgetLine[] = (data ?? []).map((r: any) => ({
    id: r.id,
    category_id: r.category_id,
    subcategory_id: r.subcategory_id,
    description: r.description,
    amount: Number(r.amount),
    created_at: r.created_at,
    category_name: r.category?.name ?? null,
    subcategory_name: r.subcategory?.name ?? null,
  }));

  return {
    rows,
    total: count ?? 0,
    page,
    pageSize,
  };
}

/** Create */
export async function createBudgetLine(input: {
  category_id: number;
  subcategory_id: number;
  description?: string | null;
  amount: number;
}) {
  const { data, error } = await supabase
    .from('budget_lines')
    .insert(input)
    .select(
      `
      id,
      category_id,
      subcategory_id,
      description,
      amount,
      created_at,
      category:categories(id,name),
      subcategory:subcategories(id,name)
    `
    )
    .single();
  if (error) throw error;

  const r = data as any;
  return {
    id: r.id,
    category_id: r.category_id,
    subcategory_id: r.subcategory_id,
    description: r.description,
    amount: Number(r.amount),
    created_at: r.created_at,
    category_name: r.category?.name ?? null,
    subcategory_name: r.subcategory?.name ?? null,
  } as BudgetLine;
}

/** Update */
export async function updateBudgetLine(
  id: number,
  input: {
    category_id: number;
    subcategory_id: number;
    description?: string | null;
    amount: number;
  }
) {
  const { data, error } = await supabase
    .from('budget_lines')
    .update(input)
    .eq('id', id)
    .select(
      `
      id,
      category_id,
      subcategory_id,
      description,
      amount,
      created_at,
      category:categories(id,name),
      subcategory:subcategories(id,name)
    `
    )
    .single();
  if (error) throw error;

  const r = data as any;
  return {
    id: r.id,
    category_id: r.category_id,
    subcategory_id: r.subcategory_id,
    description: r.description,
    amount: Number(r.amount),
    created_at: r.created_at,
    category_name: r.category?.name ?? null,
    subcategory_name: r.subcategory?.name ?? null,
  } as BudgetLine;
}

/** Delete */
export async function deleteBudgetLine(id: number) {
  const { error } = await supabase.from('budget_lines').delete().eq('id', id);
  if (error) throw error;
  return true;
}

export async function getBudgetLineById(id: number) {
  const { data, error } = await supabase
    .from('budget_lines')
    .select(`
      id, category_id, subcategory_id, description, amount, created_at,
      category:categories(id,name),
      subcategory:subcategories(id,name)
    `)
    .eq('id', id)
    .single();
  if (error) throw error;
  const r: any = data;
  return {
    id: r.id,
    category_id: r.category_id,
    subcategory_id: r.subcategory_id,
    description: r.description,
    amount: Number(r.amount),
    created_at: r.created_at,
    category_name: r.category?.name ?? null,
    subcategory_name: r.subcategory?.name ?? null,
  } as BudgetLine;
}

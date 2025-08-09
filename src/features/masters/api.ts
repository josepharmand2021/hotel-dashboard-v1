// /features/masters/api.ts
// Client-safe helpers for Masters (Categories & Subcategories)
import { supabase } from '@/lib/supabase/client';

/** ========== TYPES ========== */
export type Category = {
  id: number;
  name: string;
  created_at?: string | null;
};

export type Subcategory = {
  id: number;
  name: string;
  category_id: number;
  created_at?: string | null;
  /** denormalized for UI */
  category_name?: string;
};

/** ========== CATEGORIES ========== */
export async function listCategories(opts?: {
  q?: string;
  page?: number;       // 1-based
  pageSize?: number;   // default 10
  orderBy?: 'name' | 'created_at';
  orderDir?: 'asc' | 'desc';
}) {
  const page = Math.max(1, opts?.page ?? 1);
  const pageSize = Math.min(100, Math.max(5, opts?.pageSize ?? 10));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const orderBy = opts?.orderBy ?? 'name';
  const orderDir = opts?.orderDir ?? 'asc';

  let q = supabase
    .from('categories')
    .select('id,name,created_at', { count: 'exact' })
    .order(orderBy, { ascending: orderDir === 'asc', nullsFirst: false });

  if (opts?.q?.trim()) {
    q = q.ilike('name', `%${opts.q.trim()}%`);
  }

  const { data, error, count } = await q.range(from, to);
  if (error) throw error;

  return {
    rows: (data ?? []) as Category[],
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function listCategoriesBasic() {
  const { data, error } = await supabase
    .from('categories')
    .select('id,name')
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Pick<Category, 'id' | 'name'>[];
}

export async function createCategory(name: string) {
  const { data, error } = await supabase
    .from('categories')
    .insert({ name })
    .select('id,name,created_at')
    .single();
  if (error) throw error;
  return data as Category;
}

export async function updateCategory(id: number, name: string) {
  const { data, error } = await supabase
    .from('categories')
    .update({ name })
    .eq('id', id)
    .select('id,name,created_at')
    .single();
  if (error) throw error;
  return data as Category;
}

export async function deleteCategory(id: number) {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw error;
  return true;
}

/** ========== SUBCATEGORIES ========== */
export async function listSubcategories(opts?: {
  q?: string;
  category_id?: number; // optional filter
  page?: number;        // 1-based
  pageSize?: number;    // default 10
  orderBy?: 'name' | 'created_at';
  orderDir?: 'asc' | 'desc';
}) {
  const page = Math.max(1, opts?.page ?? 1);
  const pageSize = Math.min(100, Math.max(5, opts?.pageSize ?? 10));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const orderBy = opts?.orderBy ?? 'name';
  const orderDir = opts?.orderDir ?? 'asc';

  let q = supabase
    .from('subcategories')
    .select(
      `
      id,
      name,
      category_id,
      created_at,
      category:categories(id,name)
    `,
      { count: 'exact' }
    )
    .order(orderBy, { ascending: orderDir === 'asc', nullsFirst: false });

  if (opts?.q?.trim()) {
    q = q.ilike('name', `%${opts.q.trim()}%`);
  }
  if (opts?.category_id) {
    q = q.eq('category_id', opts.category_id);
  }

  const { data, error, count } = await q.range(from, to);
  if (error) throw error;

  // denormalize category_name for easy use in tables
  const rows: Subcategory[] = (data ?? []).map((r: any) => ({
    id: r.id,
    name: r.name,
    category_id: r.category_id,
    created_at: r.created_at,
    category_name: r.category?.name ?? null,
  }));

  return {
    rows,
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function createSubcategory(input: { name: string; category_id: number }) {
  const { data, error } = await supabase
    .from('subcategories')
    .insert(input)
    .select('id,name,category_id,created_at,category:categories(id,name)')
    .single();
  if (error) throw error;

  const row = data as any;
  const out: Subcategory = {
    id: row.id,
    name: row.name,
    category_id: row.category_id,
    created_at: row.created_at,
    category_name: row.category?.name ?? null,
  };
  return out;
}

export async function updateSubcategory(
  id: number,
  input: { name: string; category_id: number }
) {
  const { data, error } = await supabase
    .from('subcategories')
    .update(input)
    .eq('id', id)
    .select('id,name,category_id,created_at,category:categories(id,name)')
    .single();
  if (error) throw error;

  const row = data as any;
  const out: Subcategory = {
    id: row.id,
    name: row.name,
    category_id: row.category_id,
    created_at: row.created_at,
    category_name: row.category?.name ?? null,
  };
  return out;
}

export async function deleteSubcategory(id: number) {
  const { error } = await supabase.from('subcategories').delete().eq('id', id);
  if (error) throw error;
  return true;
}

export async function listSubcategoriesBasic(category_id?: number) {
  let q = supabase.from('subcategories').select('id,name,category_id').order('name');
  if (category_id) q = q.eq('category_id', category_id);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r: any) => ({ id: r.id, name: r.name })) as { id: number; name: string }[];
}

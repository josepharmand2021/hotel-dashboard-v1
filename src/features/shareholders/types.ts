// =============================================================
// Shareholders Frontend (Next.js App Router + Supabase + shadcn)
// Files below are organized by path headers. Copy into your repo.
// Assumptions:
// - Supabase client exported from `@/lib/supabase` as `supabase`
// - shadcn/ui installed (button, input, badge, card, table, dropdown, form, toast)
// - sonner for toasts
// - Using TypeScript and App Router
// =============================================================

// ========================================
// FILE: features/shareholders/types.ts
// ========================================
export type Shareholder = {
  id: number;
  name: string;
  ownership_percent: number; // numeric(5,2) in DB
  email: string | null;
  phone: string | null;
  note: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type PercentCheck = {
  total_active_percent: number; // from view v_shareholders_percent_check
  gap_to_100: number;
};

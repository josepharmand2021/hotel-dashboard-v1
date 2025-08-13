// src/features/expenses/types.ts

// (Legacy) Kalau masih dipakai di tempat lain, biarkan.
// Rekomendasi: pakai ExpenseDetail & ExpenseListItem.
export type Expense = {
  id: number;
  source: 'RAB'|'PT'|'PETTY';
  shareholder_id: number | null;
  account_id: number | null;
  cashbox_id: number | null;
  expense_date: string;   // YYYY-MM-DD
  amount: number;
  category: string | null;
  vendor: string | null;
  invoice_no: string | null;
  note: string | null;
  status: 'draft'|'posted'|'void';
  created_at: string;
  updated_at: string;
};

// Tambah/replace tipe detail supaya memuat cashbox juga
export type ExpenseDetail = {
  id: number;
  source: 'RAB' | 'PT' | 'PETTY';
  expense_date: string;      // YYYY-MM-DD
  period_month?: string;     // opsional kalau kamu simpan
  amount: number;

  category_id: number;
  subcategory_id: number;
  vendor_id: number;

  shareholder_id: number | null;
  cashbox_id: number | null;            // ✅ NEW

  invoice_no: string | null;
  note: string | null;
  status: 'draft' | 'posted' | 'void';
  created_at: string;
  updated_at: string;

  // joins (opsional, buat tampil nama di UI)
  categories?: { name: string } | null;
  subcategories?: { name: string } | null;
  shareholders?: { name: string } | null;
  vendors?: { name: string } | null;
  petty_cash_boxes?: { name: string } | null;  // ✅ NEW
};

export type ExpenseListItem = {
  id: number;
  expense_date: string;        // 'YYYY-MM-DD'
  period_month: string;        // 'YYYY-MM-01'
  source: 'RAB'|'PT'|'PETTY';
  status: 'draft'|'posted'|'void';
  amount: number;

  category_id: number;
  subcategory_id: number;
  category_name: string;
  subcategory_name: string;

  shareholder_id: number | null;
  shareholder_name: string | null;

  vendor_id: number | null;
  vendor_name: string | null;
  invoice_no: string | null;
  note: string | null;

  created_at: string;
  updated_at: string;
};

export type ExpenseListFilters = {
  month?: string;               // 'YYYY-MM'
  date_from?: string;           // 'YYYY-MM-DD'
  date_to?: string;             // 'YYYY-MM-DD'
  source?: 'RAB'|'PT'|'PETTY'|'all';
  status?: 'posted'|'draft'|'void'|'all';
  category_id?: number;
  subcategory_id?: number;
  shareholder_id?: number;
  q?: string;                   // search vendor/invoice/note
  page?: number;                // 1-based
  pageSize?: number;            // default 20
  orderBy?: 'expense_date'|'created_at'|'amount';
  orderDir?: 'asc'|'desc';
};


export type ExpenseInput = {
  source: "PT" | "RAB" | "PETTY";
  shareholder_id?: number | null;
  expense_date: string;
  amount: number;
  vendor_id: number;
  vendor_name?: string | null;
  invoice_no?: string | null;
  note?: string | null;
  category_id: number;
  subcategory_id: number;
  status: "draft" | "posted" | "void";
  cashbox_id?: number | null;
  account_id?: number | null; // PT bank (optional; auto-assign)
};
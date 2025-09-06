// src/features/expenses/types.ts

export type ExpenseListFilters = {
  month?: string;
  date_from?: string;
  date_to?: string;
  source?: 'RAB' | 'PT' | 'PETTY' | 'all';
  status?: 'posted' | 'draft' | 'void' | 'all';
  category_id?: number;
  subcategory_id?: number;
  shareholder_id?: number;
  q?: string;
  page?: number;
  pageSize?: number;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
};

export type ExpenseListItem = {
  id: number;
  expense_date: string;
  period_month: string;
  source: 'RAB' | 'PT' | 'PETTY' | string;
  status: 'posted' | 'draft' | 'void' | string;
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

  /** jika expense ini adalah pembayaran invoice (origin='from_payable') */
  payable_id?: number | null;

  /** referensi PO yang datang via payable (jika ada) */
  po_ref?: { id: number; po_number: string } | null;

  /**
   * (legacy/kompatibilitas) daftar PO terkait.
   * Flow baru hanya akan mengisi 0 atau 1 item melalui payable.
   * Disarankan pindah ke `po_ref`.
   */
  po_refs?: { id: number; po_number: string }[];
};

export type ExpenseDetail = {
  id: number;
  source: 'RAB' | 'PT' | 'PETTY' | string;
  expense_date: string;
  period_month: string;
  amount: number;

  category_id: number;
  subcategory_id: number;

  vendor_id: number | null;
  account_id: number | null;
  shareholder_id: number | null;
  cashbox_id: number | null;

  invoice_no: string | null;
  note: string | null;
  status: 'posted' | 'draft' | 'void' | string;

  created_at: string;
  updated_at: string;

  categories?: { name: string } | null;
  subcategories?: { name: string } | null;
  shareholders?: { name: string } | null;
  vendors?: { name: string } | null;
  petty_cash_boxes?: { name: string } | null;

  /** jika dari payable, id payable-nya */
  payable_id?: number | null;

  /** PO referensi dari payable (jika ada) */
  po_ref?: { id: number; po_number: string } | null;
};

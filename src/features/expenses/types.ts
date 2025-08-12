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
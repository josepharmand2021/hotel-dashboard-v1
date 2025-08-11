export type RabAllocation = {
  id: number;
  shareholder_id: number;
  alloc_date: string; // 'YYYY-MM-01'
  amount: number;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type RabMonthSummary = {
  period_month: string; // 'YYYY-MM-01'
  rows: number;
  total_allocated: number;
};

export type RabMonthGridRow = {
  period_month: string;
  shareholder_id: number;
  shareholder_name: string;
  ownership_percent: number;
  allocated_this_month: number;
  allocated_cumulative: number;
};

export type RabBalanceByShareholder = {
  shareholder_id: number;
  shareholder_name: string;
  allocated_total: number;
  used_total: number; // 0 for now
  remaining: number;  // equals allocated_total for now
};
export type CapitalInjection = {
  id: number;
  period: string; // 'YYYY-MM'
  target_total: number; // bigint
  note: string | null;
  status: 'draft' | 'active' | 'closed' | string;
  created_at: string;
  updated_at: string;
};

export type PlanSummary = {
  id: number;
  period: string;
  target_total: number;
  status: string;
  posted_total: number;
  progress_percent: number; // 0-100 integer
  created_at: string;
};

export type ShareholderProgress = {
  capital_injection_id: number;
  shareholder_id: number;
  shareholder_name: string;
  ownership_percent: number;
  obligation: number;
  paid: number;
  remaining: number;
};

export type Contribution = {
  id: number;
  capital_injection_id: number;
  shareholder_id: number;
  amount: number;
  transfer_date: string; // ISO
  note: string | null;
  status: 'draft' | 'posted' | 'void' | string;
  created_at: string;
  updated_at: string;
};
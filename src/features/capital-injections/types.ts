// capital-injections/types.ts
// Capital Injections – Types (FIFO flow)

// --- Core domain ---
export type PeriodSummary = {
  id: number;
  period: string;              // e.g. "2025-08"
  target_total: number;
  total_paid: number;
  
  outstanding: number;
  status: "draft" | "active" | "closed" | string; // <== baru

};

export type ObligationRow = {
  obligation_id: number;
  capital_injection_id: number;
  period: string;
  shareholder_id: number;
  shareholder_name: string;
  obligation_amount: number;
  paid: number;
  outstanding: number;
};

export type Shareholder = {
  id: number;
  name: string;
};

export type BankAccount = {
  id: number;
  name: string;
};

export type ContributionRow = {
  id: number;
  shareholder_id: number;
  transfer_date: string; // YYYY-MM-DD
  amount: number;
  bank_account_id: number | null;
  deposit_tx_ref: string | null;
  note: string | null;
    status?: string;                // default: 'posted'

  // optional denormalized fields
  shareholder_name?: string;
  bank_account_name?: string | null;
};

export type Allocation = {
  obligation_id: number;
  capital_injection_id: number;
  period?: string | null;
  allocated: number;
};

export type AllocationSummary = {
  contribution: ContributionRow;
  allocations: Allocation[];
  creditLeft: number;
};

// --- DTOs ---
export type CreateContributionInput = {
  shareholder_id: number;
  amount: number;
  transfer_date: string; // YYYY-MM-DD
  bank_account_id?: number | null;
  deposit_tx_ref?: string | null;
  note?: string | null;
};

export type OverallPlanSummary = {
  grand_target: number;
  grand_paid: number;
  grand_outstanding: number;
  draft_count: number;
  active_count: number;
  closed_count: number;
  total_periods: number;
};

export type CapitalInjection = {
  id: number;
  period: string;                   // "YYYY-MM"
  target_total: number;
  status: 'draft' | 'active' | 'closed' | string;
  note: string | null;
};

export type ShareholderProgress = {
  shareholder_id: number;
  shareholder_name: string;
  ownership_percent: number;        // bisa 0 kalau tidak ada di DB
  obligation: number;
  paid: number;
  remaining: number;
};


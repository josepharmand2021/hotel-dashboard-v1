// src/features/capital-injections/api.ts
'use client';

import { supabase } from '@/lib/supabase/client';
import type {
  PeriodSummary,
  ObligationRow,
  Shareholder,
  BankAccount,
  ContributionRow,
  Allocation,
  AllocationSummary,
  CreateContributionInput,
  OverallPlanSummary,
  // (opsional jika sudah kamu tambahkan di types.ts)
  CapitalInjection,
  ShareholderProgress,
} from './types';

/* ===================== OVERALL ===================== */
export async function getOverallPlanSummary(): Promise<OverallPlanSummary> {
  const { data, error } = await supabase
    .from('v_ci_overall_summary')
    .select('*')
    .single();
  if (error) throw error;
  return data as OverallPlanSummary;
}

/* ===================== PLANS ===================== */
export async function listPlans(): Promise<PeriodSummary[]> {
  const { data, error } = await supabase
    .from('v_ci_plan_summary')
    .select('id, period, target_total, status, total_paid, outstanding')
    .order('id', { ascending: false });
  if (error) throw error;
  return (data || []) as PeriodSummary[];
}

export async function getPlanSummaryById(id: number): Promise<PeriodSummary> {
  const { data, error } = await supabase
    .from('v_ci_plan_summary')
    .select('id, period, target_total, status, total_paid, outstanding')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as PeriodSummary;
}

export async function activatePlan(id: number) {
  const { error } = await supabase
    .from('capital_injections')
    .update({ status: 'active' })
    .eq('id', id);
  if (error) throw error;
}

export async function createPlan(payload: {
  period: string;
  target_total: number;
  note?: string | null;
}) {
  const { data, error } = await supabase
    .from('capital_injections')
    .insert({
      period: payload.period,
      target_total: payload.target_total,
      note: payload.note ?? null,
      status: 'draft',
    })
    .select('id')
    .single();
  if (error) throw error;

  const planId = data.id;
  const { error: e2 } = await supabase.rpc('ci_generate_snapshot', {
    p_plan_id: planId,
  });
  if (e2) throw e2;

  return { id: planId };
}

/* ===================== OBLIGATIONS ===================== */
export async function listObligationsByPeriodId(
  planId: number,
): Promise<ObligationRow[]> {
  const { data, error } = await supabase
    .from('ci_obligations')
    .select(
      `
      id, capital_injection_id, obligation_amount,
      shareholders(id,name),
      capital_injections(period),
      ci_consumptions(amount)
    `,
    )
    .eq('capital_injection_id', planId)
    .order('shareholder_id', { ascending: true });
  if (error) throw error;

  const rows = (data || []) as any[];
  return rows.map((r) => {
    const paid = (r.ci_consumptions || []).reduce(
      (s: number, x: any) => s + Number(x.amount),
      0,
    );
    return {
      obligation_id: r.id,
      capital_injection_id: r.capital_injection_id,
      period: r.capital_injections?.period ?? '',
      shareholder_id: r.shareholders?.id,
      shareholder_name: r.shareholders?.name ?? '',
      obligation_amount: Number(r.obligation_amount),
      paid: Number(paid),
      outstanding: Number(r.obligation_amount) - Number(paid),
    } as ObligationRow;
  });
}

/* ===================== REF DATA ===================== */
export async function listShareholders(): Promise<Shareholder[]> {
  const { data, error } = await supabase
    .from('shareholders')
    .select('id, name')
    .order('name');
  if (error) throw error;
  return (data || []) as Shareholder[];
}

export async function listBankAccounts(): Promise<BankAccount[]> {
  const { data, error } = await supabase
    .from('bank_accounts')
    .select('id, name')
    .eq('is_active', true)
    .order('is_default', { ascending: false })
    .order('name', { ascending: true });
  if (error) throw error;
  return (data || []) as BankAccount[];
}

/* ===================== CONTRIBUTIONS (create + FIFO allocate) ===================== */
export async function createContributionAndAllocate(
  input: CreateContributionInput,
): Promise<AllocationSummary> {
  const { data: cc, error: e1 } = await supabase
    .from('capital_contributions')
    .insert({
      shareholder_id: input.shareholder_id,
      amount: Math.round(input.amount),
      transfer_date: input.transfer_date,
      bank_account_id: input.bank_account_id ?? null,
      deposit_tx_ref: input.deposit_tx_ref ?? null,
      note: input.note ?? null,
    })
    .select('*')
    .single();
  if (e1) throw e1;

  const { data: allocs, error: e2 } = await supabase.rpc(
    'fifo_allocate_contribution',
    { p_contribution_id: cc.id },
  );
  if (e2) throw e2;

  const obligationIds = (allocs || []).map((a: any) => a.obligation_id);
  const periods: Record<number, string> = {};
  if (obligationIds.length) {
    const { data: rows, error: e3 } = await supabase
      .from('ci_obligations')
      .select('id, capital_injections(period)')
      .in('id', obligationIds);
    if (e3) throw e3;
    (rows || []).forEach((r: any) => {
      periods[r.id] = r.capital_injections?.period ?? null;
    });
  }

  const allocations: Allocation[] = (allocs || []).map((a: any) => ({
    obligation_id: a.obligation_id,
    capital_injection_id: a.capital_injection_id,
    period: periods[a.obligation_id] ?? null,
    allocated: Number(a.allocated),
  }));

  const allocatedTotal = allocations.reduce((s, a) => s + a.allocated, 0);
  const creditLeft = Number(cc.amount) - allocatedTotal;

  const contribution: ContributionRow = {
    id: cc.id,
    shareholder_id: cc.shareholder_id,
    transfer_date: cc.transfer_date,
    amount: Number(cc.amount),
    bank_account_id: cc.bank_account_id,
    deposit_tx_ref: cc.deposit_tx_ref,
    note: cc.note,
  };

  return { contribution, allocations, creditLeft };
}

/* ===================== CONTRIBUTIONS (list & paging) ===================== */
/**
 * Daftar kontribusi.
 * - Jika `planId` diberikan → hanya kontribusi yang TERALOKASI ke plan tsb (via ci_consumptions)
 * - Jika tidak → semua kontribusi.
 */
export async function listContributions(
  planId?: number,
): Promise<ContributionRow[]> {
  if (typeof planId === 'number') {
    // kontribusi yang dipakai di plan ini
    const { data: cons, error: e1 } = await supabase
      .from('ci_consumptions')
      .select('contribution_id')
      .eq('capital_injection_id', planId);
    if (e1) throw e1;

    const ids = Array.from(
      new Set((cons || []).map((x: any) => x.contribution_id)),
    ).filter(Boolean);
    if (ids.length === 0) return [];

    const { data, error } = await supabase
      .from('capital_contributions')
      .select(
        `
        id, shareholder_id, shareholders(name),
        transfer_date, amount,
        bank_account_id, bank_accounts(name),
        deposit_tx_ref, note
      `,
      )
      .in('id', ids)
      .order('transfer_date', { ascending: false })
      .order('id', { ascending: false });
    if (error) throw error;

    return (data || []).map((r: any) => ({
      id: r.id,
      shareholder_id: r.shareholder_id,
      shareholder_name: r.shareholders?.name ?? '',
      transfer_date: r.transfer_date,
      amount: Number(r.amount),
      bank_account_id: r.bank_account_id,
      bank_account_name: r.bank_accounts?.name ?? null,
      deposit_tx_ref: r.deposit_tx_ref,
      note: r.note,
      status: 'posted', // agar cocok dengan UI yang memfilter 'posted'
    })) as ContributionRow[];
  }

  // semua kontribusi
  const { data, error } = await supabase
    .from('capital_contributions')
    .select(
      `
      id, shareholder_id, shareholders(name),
      transfer_date, amount,
      bank_account_id, bank_accounts(name),
      deposit_tx_ref, note
      `,
    )
    .order('transfer_date', { ascending: false })
    .order('id', { ascending: false });
  if (error) throw error;

  return (data || []).map((r: any) => ({
    id: r.id,
    shareholder_id: r.shareholder_id,
    shareholder_name: r.shareholders?.name ?? '',
    transfer_date: r.transfer_date,
    amount: Number(r.amount),
    bank_account_id: r.bank_account_id,
    bank_account_name: r.bank_accounts?.name ?? null,
    deposit_tx_ref: r.deposit_tx_ref,
    note: r.note,
  })) as ContributionRow[];
}

export type ContributionListParams = {
  page?: number;
  pageSize?: number;
  shareholderId?: number | null;
  bankAccountId?: number | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  search?: string | null;
};
export type ContributionListResult = {
  rows: ContributionRow[];
  total: number;
  page: number;
  pageSize: number;
};
export async function listContributionsPaged(
  params: ContributionListParams,
): Promise<ContributionListResult> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.max(1, params.pageSize ?? 10);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('capital_contributions')
    .select(
      `
      id, shareholder_id, shareholders(name),
      transfer_date, amount,
      bank_account_id, bank_accounts(name),
      deposit_tx_ref, note
      `,
      { count: 'exact' },
    );

  if (params.shareholderId) query = query.eq('shareholder_id', params.shareholderId);
  if (params.bankAccountId) query = query.eq('bank_account_id', params.bankAccountId);
  if (params.dateFrom) query = query.gte('transfer_date', params.dateFrom);
  if (params.dateTo) query = query.lte('transfer_date', params.dateTo);
  if (params.search?.trim()) {
    const s = `%${params.search.trim()}%`;
    query = query.or(
      `note.ilike.${s},deposit_tx_ref.ilike.${s},shareholders.name.ilike.${s}`,
    );
  }

  query = query
    .order('transfer_date', { ascending: false })
    .order('id', { ascending: false });

  const { data, error, count } = await query.range(from, to);
  if (error) throw error;

  const rows: ContributionRow[] = (data || []).map((r: any) => ({
    id: r.id,
    shareholder_id: r.shareholder_id,
    shareholder_name: r.shareholders?.name ?? '',
    transfer_date: r.transfer_date,
    amount: Number(r.amount),
    bank_account_id: r.bank_account_id,
    bank_account_name: r.bank_accounts?.name ?? null,
    deposit_tx_ref: r.deposit_tx_ref,
    note: r.note,
  }));

  return { rows, total: count ?? 0, page, pageSize };
}

/* ===================== COMPAT LAYER (nama fungsi yg dipakai UI kamu) ===================== */

/** Ambil 1 plan langsung dari tabel utama (bukan view) */
export async function getPlan(id: number): Promise<CapitalInjection> {
  const { data, error } = await supabase
    .from('capital_injections')
    .select('id, period, target_total, status, note')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as CapitalInjection;
}

/** Update field plan (period/target_total/note/status – opsional) */
export async function updatePlan(
  id: number,
  payload: Partial<Pick<CapitalInjection, 'period' | 'target_total' | 'note' | 'status'>>,
) {
  const { error } = await supabase
    .from('capital_injections')
    .update({
      ...(payload.period ? { period: payload.period } : {}),
      ...(typeof payload.target_total === 'number'
        ? { target_total: payload.target_total }
        : {}),
      ...(payload.note !== undefined ? { note: payload.note } : {}),
      ...(payload.status ? { status: payload.status } : {}),
    })
    .eq('id', id);
  if (error) throw error;

  // (opsional) regenerate snapshot jika perlu:
  // if (payload.period !== undefined || payload.target_total !== undefined) {
  //   const { error: e2 } = await supabase.rpc('ci_generate_snapshot', { p_plan_id: id });
  //   if (e2) throw e2;
  // }
}

/** Progress per shareholder untuk 1 plan */
export async function listShareholderProgress(
  planId: number,
): Promise<ShareholderProgress[]> {
  const { data, error } = await supabase
    .from('ci_obligations')
    .select(
      `
      id, capital_injection_id, obligation_amount,
      shareholders(id, name, ownership_percent),
      ci_consumptions(amount)
    `,
    )
    .eq('capital_injection_id', planId)
    .order('shareholder_id', { ascending: true });
  if (error) throw error;

  const rows = (data || []) as any[];
  return rows.map((r) => {
    const paid = (r.ci_consumptions || []).reduce(
      (s: number, x: any) => s + Number(x.amount),
      0,
    );
    const obligation = Number(r.obligation_amount) || 0;
    return {
      shareholder_id: Number(r.shareholders?.id),
      shareholder_name: r.shareholders?.name ?? '',
      ownership_percent: Number(r.shareholders?.ownership_percent ?? 0),
      obligation,
      paid,
      remaining: Math.max(0, obligation - paid),
    } as ShareholderProgress;
  });
}

/** Alias: tambah kontribusi + alokasi FIFO */
export async function addContribution(args: {
  planId: number; // tidak dipakai langsung saat insert; alokasi terjadi via RPC FIFO
  shareholderId: number;
  amount: number;
  transferDate: string;
  note?: string;
}) {
  return createContributionAndAllocate({
    shareholder_id: args.shareholderId,
    amount: Math.round(args.amount),
    transfer_date: args.transferDate,
    note: args.note ?? null,
  });
}

/** Hapus 1 kontribusi (hati-hati jika ada constraint/foreign key) */
export async function deleteContribution(contributionId: number) {
  const { error } = await supabase
    .from('capital_contributions')
    .delete()
    .eq('id', contributionId);
  if (error) throw error;
}

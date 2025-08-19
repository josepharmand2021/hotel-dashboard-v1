import { supabase } from '@/lib/supabase/client';
import type { CapitalInjection, PlanSummary, ShareholderProgress, Contribution } from './types';
import { getDefaultPTBankId } from "@/features/bank-accounts/api";

/* ===================== PLANS ===================== */

export async function listPlans() {
  const { data, error } = await supabase
    .from('v_ci_plan_summary')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as PlanSummary[];
}

export async function createPlan(payload: { period: string; target_total: number; note?: string | null }) {
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
  return data as { id: number };
}

export async function getPlan(id: number) {
  const { data, error } = await supabase
    .from('capital_injections')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as CapitalInjection;
}

export async function updatePlan(
  id: number,
  payload: { period: string; target_total: number; note?: string | null; status?: string }
) {
  const { error } = await supabase
    .from('capital_injections')
    .update({
      period: payload.period,
      target_total: payload.target_total,
      note: payload.note ?? null,
      status: payload.status ?? undefined,
    })
    .eq('id', id);
  if (error) throw error;
}

export async function getPlanSummaryById(id: number) {
  const { data, error } = await supabase
    .from('v_ci_plan_summary')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as PlanSummary;
}

export async function setPlanStatus(id: number, status: 'draft' | 'active' | 'closed') {
  const { error } = await supabase.from('capital_injections').update({ status }).eq('id', id);
  if (error) throw error;
}

/** Activate plan + auto-snapshot jika belum ada snapshot */
export async function activatePlan(id: number) {
  // RPC yang disarankan (lihat SQL yang aku kasih kemarin)
  const { error } = await supabase.rpc('activate_capital_injection', { p_plan_id: id });
  if (error) {
    // fallback minimal: set status active (anggap snapshot akan dibuat manual)
    const { error: e2 } = await supabase.from('capital_injections').update({ status: 'active' }).eq('id', id);
    if (e2) throw e2;
  }
}

/* ===================== SNAPSHOT OBLIGATIONS ===================== */

/** Generate/Regenerate snapshot obligations dari % ownership */
export async function snapshotObligations(planId: number, _replace = true) {
  const { error } = await supabase.rpc('ci_generate_snapshot', { p_plan_id: planId });
  if (error) throw error;
}

/* ===================== PROGRESS & OBLIGATIONS ===================== */

export async function listShareholderProgress(planId: number) {
  const { data, error } = await supabase
    .from('v_ci_shareholder_progress')
    .select('*')
    .eq('capital_injection_id', planId)
    .order('shareholder_name', { ascending: true });
  if (error) throw error;
  return (data || []) as ShareholderProgress[];
}

export async function listObligations(planId: number) {
  // gunakan tabel yang sesuai skema kamu: ci_obligations
  const { data, error } = await supabase
    .from('ci_obligations')
    .select('id, capital_injection_id, shareholder_id, ownership_percent_snapshot, obligation_amount, shareholders(name)')
    .eq('capital_injection_id', planId)
    .order('shareholder_id', { ascending: true });
  if (error) throw error;
  return (data || []) as any[];
}

export async function updateObligation(id: number, newAmount: number, reason?: string) {
  // jika ada RPC audit, pakai; kalau tidak ada, fallback update langsung
  const { error } = await supabase.rpc('update_ci_obligation', {
    p_obligation_id: id,
    p_amount: newAmount,
    p_reason: reason ?? null,
  });
  if (error) {
    const { error: e2 } = await supabase.from('ci_obligations').update({ obligation_amount: newAmount }).eq('id', id);
    if (e2) throw e2;
  }
}

/* ===================== CONTRIBUTIONS ===================== */

export async function listContributions(planId: number) {
  const { data, error } = await supabase
    .from('capital_contributions')
    .select(
      `
      id, capital_injection_id, shareholder_id, amount, transfer_date, note, status,
      bank_account_id, created_at, updated_at,
      shareholders(name),
      bank_accounts(name)
    `
    )
    .eq('capital_injection_id', planId)
    .order('transfer_date', { ascending: false })
    .order('id', { ascending: false })
    .returns<
      Array<
        Contribution & {
          shareholders: { name: string } | null;
          bank_accounts: { name: string } | null;
        }
      >
    >();
  if (error) throw error;
  return data;
}

export async function addContribution(payload: {
  planId: number;
  shareholderId: number;
  amount: number;
  transferDate: string;
  bankAccountId?: number; // optional dari UI
  note?: string | null;
  status?: 'draft' | 'posted';
}) {
  // target status dari UI, default 'posted'
  let status: 'draft' | 'posted' = payload.status ?? 'posted';
  // bank id dari UI bila ada
  let bankId: number | null = payload.bankAccountId ?? null;

  // jika mau posted tapi bank belum ada, coba pakai default PT bank
  if (status === 'posted' && !bankId) {
    try {
      bankId = await getDefaultPTBankId();
    } catch {
      // tidak ada default bank → simpan sebagai draft agar tidak error DB
      status = 'draft';
    }
  }

  const { data, error } = await supabase
    .from('capital_contributions')
    .insert({
      capital_injection_id: payload.planId,
      shareholder_id: payload.shareholderId,
      amount: Math.round(payload.amount),
      transfer_date: payload.transferDate,
      bank_account_id: bankId,          // bisa null bila draft
      note: payload.note ?? null,
      status,                           // posted bila punya bank, draft kalau tidak
    })
    .select('id')
    .single();

  if (error) throw error;
  return data as { id: number };
}



export async function setContributionStatus(
  id: number,
  status: 'draft' | 'posted' | 'void',
  _reason?: string
) {
  if (status === 'posted') {
    // pastikan bank_account_id terisi saat posting
    let bankId: number;
    try {
      bankId = await getDefaultPTBankId();
    } catch {
      throw new Error(
        'Tidak ada rekening PT default. Set di Settings → Finance → Bank Accounts terlebih dahulu.'
      );
    }

    const { error } = await supabase
      .from('capital_contributions')
      .update({ status: 'posted', bank_account_id: bankId })
      .eq('id', id);

    if (error) throw error;
    return;
  }

  // selain 'posted', cukup update status saja
  const { error } = await supabase
    .from('capital_contributions')
    .update({ status })
    .eq('id', id);

  if (error) throw error;
}


export async function updateContribution(id: number, payload: {
  amount: number; transferDate: string; note?: string | null; status?: 'draft'|'posted'|'void'; bankAccountId?: number;
}) {
  const { error } = await supabase
    .from('capital_contributions')
    .update({
      amount: Math.round(payload.amount),
      transfer_date: payload.transferDate,
      note: payload.note ?? null,
      status: payload.status ?? undefined,
      bank_account_id: payload.bankAccountId ?? undefined,
    })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteContribution(id: number) {
  const { error } = await supabase.from('capital_contributions').delete().eq('id', id);
  if (error) throw error;
}

export type ContributionInput = {
  capital_injection_id: number;
  shareholder_id: number;
  amount: number;
  transfer_date: string; // ISO
  note?: string;
  status: "draft" | "posted";
};

export async function createContribution(input: ContributionInput) {
  const payload: any = { ...input };
  if (input.status === "posted") {
    payload.bank_account_id = await getDefaultPTBankId();
  }
  const { error } = await supabase.from("capital_contributions").insert(payload);
  if (error) throw error;
}

export async function postContribution(id: number) {
  const bankId = await getDefaultPTBankId();
  const { error } = await supabase
    .from("capital_contributions")
    .update({ status: "posted", bank_account_id: bankId })
    .eq("id", id);
  if (error) throw error;
}


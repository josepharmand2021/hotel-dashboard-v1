import { supabase } from '@/lib/supabase/client';
import type { CapitalInjection, PlanSummary, ShareholderProgress, Contribution } from './types';

/** PLANS */
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

export async function updatePlan(id: number, payload: { period: string; target_total: number; note?: string | null; status?: string }) {
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

export async function setPlanStatus(id: number, status: 'draft'|'active'|'closed') {
  const { error } = await supabase
    .from('capital_injections')
    .update({ status })
    .eq('id', id);
  if (error) throw error;
}

export async function activatePlan(id: number) {
  // Prefer RPC if ada
  const rpc = await supabase.rpc('activate_ci_plan', { plan_id: id });
  if (rpc.error) {
    // fallback: set status active (diasumsikan trigger snapshot sudah ada di DB)
    const { error } = await supabase.from('capital_injections').update({ status: 'active' }).eq('id', id);
    if (error) throw error;
  }
}

/** PROGRESS & OBLIGATIONS */
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
  const { data, error } = await supabase
    .from('capital_injection_obligations')
    .select('id, capital_injection_id, shareholder_id, ownership_percent_snapshot, obligation_amount, shareholders(name)')
    .eq('capital_injection_id', planId)
    .order('id', { ascending: true });
  if (error) throw error;
  return (data || []) as any[];
}

export async function updateObligation(id: number, newAmount: number, reason?: string) {
  // Prefer RPC audit kalau ada
  const rpc = await supabase.rpc('update_ci_obligation', { p_obligation_id: id, p_amount: newAmount, p_reason: reason ?? null });
  if (rpc.error) {
    const { error } = await supabase
      .from('capital_injection_obligations')
      .update({ obligation_amount: newAmount })
      .eq('id', id);
    if (error) throw error;
  }
}

/** CONTRIBUTIONS */
export async function listContributions(planId: number) {
  const { data, error } = await supabase
    .from('capital_contributions')
    .select(`
      id, capital_injection_id, shareholder_id, amount, transfer_date, note, status,
      bank_account_id, created_at, updated_at,
      shareholders(name),
      bank_accounts(name)
    `)
    .eq('capital_injection_id', planId)
    .order('transfer_date', { ascending: false })
    .order('id', { ascending: false })
    .returns<Array<
      Contribution & {
        shareholders: { name: string } | null;
        bank_accounts: { name: string } | null;
      }
    >>(); // <-- ini menghindari cast manual

  if (error) throw error;
  return data;

export async function addContribution(payload: {
  planId: number;
  shareholderId: number;
  amount: number;
  transferDate: string;
  bankAccountId: number;               // NEW (wajib saat posted)
  note?: string | null;
  status?: 'draft'|'posted';
}) {
  const { data, error } = await supabase
    .from('capital_contributions')
    .insert({
      capital_injection_id: payload.planId,
      shareholder_id: payload.shareholderId,
      amount: Math.round(payload.amount),
      transfer_date: payload.transferDate,
      bank_account_id: payload.bankAccountId,
      note: payload.note ?? null,
      status: payload.status ?? 'posted',
    })
    .select('id')
    .single();
  if (error) throw error;
  return data as { id: number };
}

export async function setContributionStatus(id: number, status: 'draft'|'posted'|'void', _reason?: string) {
  // reason opsional; kalau punya kolom void_reason di DB, kamu bisa ikut update-kan di sini
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

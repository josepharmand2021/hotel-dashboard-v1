import { supabase } from "@/lib/supabase/client";
import type { CapitalInjection, PlanSummary, ShareholderProgress, Contribution } from "@/features/capital-injections/types";

// Plans
export async function listPlans() {
  const { data, error } = await supabase
    .from("v_ci_plan_summary")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as PlanSummary[];
}

export async function createPlan(payload: { period: string; target_total: number; note?: string | null }) {
  // NOTE: set status 'draft' so you can Activate to snapshot obligations later
  const { data, error } = await supabase
    .from("capital_injections")
    .insert({ period: payload.period, target_total: payload.target_total, note: payload.note ?? null, status: "draft" })
    .select("id")
    .single();
  if (error) throw error;
  return data as { id: number };
}

export async function getPlan(id: number) {
  const { data, error } = await supabase.from("capital_injections").select("*").eq("id", id).single();
  if (error) throw error; return data as CapitalInjection;
}

export async function getPlanSummaryById(id: number) {
  const { data, error } = await supabase.from("v_ci_plan_summary").select("*").eq("id", id).single();
  if (error) throw error; return data as PlanSummary;
}

export async function updatePlan(id: number, payload: { period: string; target_total: number; note?: string | null; status?: string }) {
  const { error } = await supabase
    .from("capital_injections")
    .update({ period: payload.period, target_total: payload.target_total, note: payload.note ?? null, status: payload.status ?? "draft" })
    .eq("id", id);
  if (error) throw error;
}

// Progress & obligations
export async function listShareholderProgress(planId: number) {
  const { data, error } = await supabase
    .from("v_ci_shareholder_progress")
    .select("capital_injection_id, shareholder_id, shareholder_name, ownership_percent, obligation, paid, remaining")
    .eq("capital_injection_id", planId)
    .order("shareholder_name", { ascending: true });
  if (error) throw error; return (data || []) as ShareholderProgress[];
}

export async function listObligations(planId: number) {
  const { data, error } = await supabase
    .from("ci_obligations")
    .select("id, shareholder_id, obligation_amount, ownership_percent_snapshot, shareholders(name)")
    .eq("capital_injection_id", planId)
    .order("shareholder_id", { ascending: true });
  if (error) throw error; return (data || []) as any[];
}

export async function updateObligation(obligationId: number, amount: number, reason?: string) {
  const { error } = await supabase
    .from("ci_obligations")
    .update({ obligation_amount: Math.round(amount), override_reason: reason ?? null })
    .eq("id", obligationId);
  if (error) throw error;
}

// Contributions
export async function listContributions(planId: number) {
  const { data, error } = await supabase
    .from("capital_contributions")
    .select("id, capital_injection_id, shareholder_id, amount, transfer_date, note, status, created_at, updated_at, shareholders(name)")
    .eq("capital_injection_id", planId)
    .order("transfer_date", { ascending: false });
  if (error) throw error;
  return (data || []) as (Contribution & { shareholders: { name: string } | null })[];
}

export async function addContribution(payload: { planId: number; shareholderId: number; amount: number; transferDate: string; note?: string | null }) {
  const { data, error } = await supabase
    .from("capital_contributions")
    .insert({ capital_injection_id: payload.planId, shareholder_id: payload.shareholderId, amount: payload.amount, transfer_date: payload.transferDate, note: payload.note ?? null, status: "posted" })
    .select("id")
    .single();
  if (error) throw error; return data as { id: number };
}

export async function updateContribution(id: number, payload: { amount: number; transferDate: string; note?: string | null; status?: "draft"|"posted"|"void" }) {
  const { error } = await supabase
    .from("capital_contributions")
    .update({ amount: payload.amount, transfer_date: payload.transferDate, note: payload.note ?? null, status: payload.status ?? "posted" })
    .eq("id", id);
  if (error) throw error;
}

export async function setContributionStatus(id: number, status: "draft" | "posted" | "void", note?: string) {
  const { error } = await supabase
    .from("capital_contributions")
    .update({ status, note: note ?? null })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteContribution(id: number) {
  const { error } = await supabase.from("capital_contributions").delete().eq("id", id);
  if (error) throw error;
}

// Actions
export async function activatePlan(planId: number) {
  const { data, error } = await supabase.rpc("ci_activate_plan", { p_plan_id: planId });
  if (error) throw error; return data;
}

export async function setPlanStatus(id: number, status: "draft" | "active" | "closed") {
  const { error } = await supabase.from("capital_injections").update({ status }).eq("id", id);
  if (error) throw error;
}

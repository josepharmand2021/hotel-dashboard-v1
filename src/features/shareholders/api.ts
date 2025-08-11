import { supabase } from "@/lib/supabase/client";
import type { Shareholder, PercentCheck } from "./types";

export type ListParams = {
  q?: string;
  page?: number; // 1-based
  pageSize?: number; // default 10
  activeOnly?: boolean;
};

export async function listShareholders(params: ListParams) {
  const { q = "", page = 1, pageSize = 10, activeOnly = false } = params || {};
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("shareholders")
    .select("id, name, ownership_percent, email, phone, note, active, created_at, updated_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (q) {
    query = query.ilike("name", `%${q}%`);
  }
  if (activeOnly) {
    query = query.eq("active", true);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { rows: (data || []) as Shareholder[], total: count || 0 };
}

export async function getPercentCheck() {
  const { data, error } = await supabase.from("v_shareholders_percent_check").select("total_active_percent, gap_to_100").single();
  if (error) throw error;
  return data as PercentCheck;
}

export async function getShareholder(id: number) {
  const { data, error } = await supabase
    .from("shareholders")
    .select("id, name, ownership_percent, email, phone, note, active, created_at, updated_at")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as Shareholder;
}

export type UpsertPayload = {
  name: string;
  ownership_percent: number;
  email?: string | null;
  phone?: string | null;
  note?: string | null;
  active?: boolean;
};

export async function createShareholder(payload: UpsertPayload) {
  const { data, error } = await supabase
    .from("shareholders")
    .insert({
      name: payload.name,
      ownership_percent: payload.ownership_percent,
      email: payload.email ?? null,
      phone: payload.phone ?? null,
      note: payload.note ?? null,
      active: payload.active ?? true,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data as { id: number };
}

export async function updateShareholder(id: number, payload: UpsertPayload) {
  const { error } = await supabase
    .from("shareholders")
    .update({
      name: payload.name,
      ownership_percent: payload.ownership_percent,
      email: payload.email ?? null,
      phone: payload.phone ?? null,
      note: payload.note ?? null,
      active: payload.active ?? true,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function toggleShareholderActive(id: number, active: boolean) {
  const { error } = await supabase
    .from("shareholders")
    .update({ active })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteShareholder(id: number) {
  const { error } = await supabase.from("shareholders").delete().eq("id", id);
  if (error) throw error;
}

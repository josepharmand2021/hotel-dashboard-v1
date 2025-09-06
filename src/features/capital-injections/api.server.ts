// src/features/capital-injections/api.server.ts
import "server-only";
import { supabaseServer } from "@/lib/supabase/server";

export type ShareholderCISummary = {
  shareholder_id: number;
  shareholder_name: string;
  obligation_total: number;
  obligation_ytd: number;
  obligation_mtd: number;
  allocated_total: number;
  allocated_ytd: number;
  allocated_mtd: number;
  contributions_total: number;
  contributions_ytd: number;
  contributions_mtd: number;
  credit_balance_total: number;
  outstanding_total: number;
  net_position_total: number;
  last_contribution_date: string | null;
  last_allocation_at: string | null;
  first_uncovered_period: string | null;
};

export async function listShareholderSummary(params?: {
  asOfMonth?: string; // "YYYY-MM"
  statuses?: Array<"draft" | "active" | "closed">;
  shareholderId?: number;
}) {
  const sb = await supabaseServer();

  const { asOfMonth, statuses = ["active", "closed"], shareholderId } = params ?? {};
  const asOfDate = asOfMonth ? `${asOfMonth}-01` : null;

  const { data, error } = await sb.rpc("f_shareholder_ci_summary", {
    p_as_of_date: asOfDate,
    p_statuses: statuses,
    p_shareholder_id: shareholderId ?? null,
  });
  if (error) throw error;
  return (data ?? []) as ShareholderCISummary[];
}

export async function listShareholdersBasic() {
  const sb = await supabaseServer();
  const { data, error } = await sb
    .from("shareholders")
    .select("id,name")
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

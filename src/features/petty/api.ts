// src/features/petty/api.ts
import { supabase } from "@/lib/supabase/client";
import { getDefaultPTBankId } from "@/features/bank-accounts/api";

/* ========= Types ========= */
export type CashBox = { id: number; name: string; created_at?: string };

export type BoxSummary = {
  id: number;
  name: string;
  in_amount: number;
  out_amount: number;
  spent_amount: number;
  balance: number;
  last_activity: string | null;
};

export type LedgerRow = {
  cashbox_id: number;
  event_date: string;
  event_type: "topup" | "settlement" | "adjust_in" | "adjust_out" | "expense";
  expense_id: number | null;
  amount: number;
  signed_amount: number;
  ref_no: string | null;
  note: string | null;
  source: "txn" | "expense";
  running_balance: number;
  shareholder_id?: number | null;
  shareholder_name?: string | null;
};

const r = (n: number) => Math.round(n);

/* ========= Boxes ========= */
export async function listCashBoxes(): Promise<CashBox[]> {
  const { data, error } = await supabase
    .from("petty_cash_boxes")
    .select("id,name,created_at")
    .order("name");
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getBoxesSummary(): Promise<BoxSummary[]> {
  const { data, error } = await supabase
    .from("v_petty_box_summary")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createCashBox(name: string): Promise<{ id: number }> {
  const { data, error } = await supabase
    .from("petty_cash_boxes")
    .insert({ name })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { id: data.id };
}

/* ========= Ledger ========= */
export async function listLedger(
  cashboxId: number,
  from?: string,
  to?: string
): Promise<LedgerRow[]> {
  let q = supabase
    .from("v_petty_cash_ledger")
    .select("*")
    .eq("cashbox_id", cashboxId)
    .order("event_date", { ascending: true });

  if (from) q = q.gte("event_date", from);
  if (to) q = q.lte("event_date", to);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data || []) as LedgerRow[];
}

/* ========= Top Up (tanpa subkategori) ========= */
export async function addTopup(payload: {
  source: "PT" | "RAB";
  cashbox_id: number;
  txn_date: string;       // 'YYYY-MM-DD'
  amount: number;
  shareholder_id?: number | null; // opsional (dipakai kalau kamu nanti simpan ke kolom di txns)
  note?: string | null;
  bank_account_id?: number | null; // opsional: untuk PT; jika kosong -> default
  ref_no?: string | null;
}) {
  const {
    source,
    cashbox_id,
    txn_date,
    amount,
    shareholder_id, // belum dipakai kalau tabel belum punya kolom ini
    note,
    bank_account_id,
    ref_no,
  } = payload;

  if (!txn_date) throw new Error("Tanggal wajib");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Amount harus > 0");

  // ---- RAB -> Petty (tanpa subkategori)
  if (source === "RAB") {
    const { data, error } = await supabase.rpc("rab_to_petty_topup_api", {
      p_shareholder_id: shareholder_id ?? null,
      p_amount: r(amount),
      p_cashbox_id: cashbox_id,
      p_txn_date: txn_date,
      p_note: note ?? null,
    });
    if (error) throw new Error(error.message);

    const topupId =
      Array.isArray(data) ? Number(data[0]?.topup_txn_id) :
      (data && typeof data === "object" && "topup_txn_id" in data) ? Number((data as any).topup_txn_id) :
      Number(data) || null;

    // Simpan ref/note bila ada (bank_account_id tetap NULL untuk RAB)
    if (topupId && (ref_no || note)) {
      const { error: updErr } = await supabase
        .from("petty_cash_txns")
        .update({ ref_no: ref_no ?? null, note: note ?? null, bank_account_id: null })
        .eq("id", topupId);
      if (updErr) throw new Error(updErr.message);
    }
    return { topup_txn_id: topupId ?? null };
  }

  // ---- PT -> Petty (tanpa subkategori)
  const { data, error } = await supabase.rpc("pt_to_petty_topup_api", {
    p_amount: r(amount),
    p_cashbox_id: cashbox_id,
    p_txn_date: txn_date,
    p_note: note ?? null,
  });
  if (error) throw new Error(error.message);

  const topupId =
    Array.isArray(data) ? Number(data[0]?.topup_txn_id) :
    (data && typeof data === "object" && "topup_txn_id" in data) ? Number((data as any).topup_txn_id) :
    Number(data) || null;

  // Isi bank default PT bila tidak dikirim
  const bankId = bank_account_id ?? (await getDefaultPTBankId());

  if (topupId && (bankId || ref_no || note)) {
    const { error: updErr } = await supabase
      .from("petty_cash_txns")
      .update({
        bank_account_id: bankId ?? null,
        ref_no: ref_no ?? null,
        note: note ?? null,
      })
      .eq("id", topupId);
    if (updErr) throw new Error(updErr.message);
  }

  return { topup_txn_id: topupId ?? null };
}

/* ========= Settlement ========= */
export async function addSettlement(payload: {
  cashbox_id: number;
  txn_date: string;
  amount: number;
  bank_account_id?: number | null; // jika kosong -> default
  ref_no?: string | null;
  note?: string | null;
}) {
  const bankId = payload.bank_account_id ?? (await getDefaultPTBankId());

  const { error } = await supabase.from("petty_cash_txns").insert({
    cashbox_id: payload.cashbox_id,
    txn_date: payload.txn_date,
    type: "settlement",
    amount: r(payload.amount),
    bank_account_id: bankId,
    ref_no: payload.ref_no ?? null,
    note: payload.note ?? null,
  });
  if (error) throw new Error(error.message);
}

/* ========= Adjustment ========= */
export async function addAdjust(payload: {
  cashbox_id: number;
  txn_date: string;
  amount: number;
  direction: "in" | "out";
  note?: string | null;
  ref_no?: string | null;
}) {
  const type = payload.direction === "in" ? "adjust_in" : "adjust_out";
  const { error } = await supabase.from("petty_cash_txns").insert({
    cashbox_id: payload.cashbox_id,
    txn_date: payload.txn_date,
    type,
    amount: r(payload.amount),
    bank_account_id: null,
    ref_no: payload.ref_no ?? null,
    note: payload.note ?? null,
  });
  if (error) throw new Error(error.message);
}

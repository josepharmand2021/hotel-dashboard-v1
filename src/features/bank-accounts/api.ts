// use client-safe supabase
import { supabase } from "@/lib/supabase/client";

export type BankAccount = {
  id: number;
  name: string;
  bank_name: string | null;
  account_name: string | null;
  account_number: string | null;
  is_active: boolean;
  is_default: boolean;
  note: string | null;
  created_at?: string;
};

export async function listBankAccounts(): Promise<BankAccount[]> {
  const { data, error } = await supabase
    .from("bank_accounts")
    .select("id,name,bank_name,account_name,account_number,is_active,is_default,note,created_at")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data as BankAccount[];
}

export async function createBankAccount(input: {
  name: string;
  bank_name?: string;
  account_name?: string;
  account_number?: string;
  note?: string;
  is_default?: boolean;
  is_active?: boolean;
}) {
  const { data, error } = await supabase
    .from("bank_accounts")
    .insert([{ ...input, is_active: input.is_active ?? true }])
    .select("id,is_default")
    .single();
  if (error) throw error;

  if (data.is_default) {
    const { error: e2 } = await supabase.rpc("set_default_pt_bank", { p_id: data.id });
    if (e2) throw e2;
  }
  return data.id as number;
}

export async function updateBankAccount(id: number, changes: Partial<BankAccount>) {
  // Jika user men-set default dari edit
  if (changes.is_default) {
    const { error: e2 } = await supabase.rpc("set_default_pt_bank", { p_id: id });
    if (e2) throw e2;
    const { error: e3 } = await supabase.from("bank_accounts").update({ ...changes, is_default: true }).eq("id", id);
    if (e3) throw e3;
    return;
  }
  const { error } = await supabase.from("bank_accounts").update(changes).eq("id", id);
  if (error) throw error;
}

export async function deactivateBankAccount(id: number) {
  const { error } = await supabase.from("bank_accounts").update({ is_active: false, is_default: false }).eq("id", id);
  if (error) throw error;
}

export async function activateBankAccount(id: number) {
  const { error } = await supabase.from("bank_accounts").update({ is_active: true }).eq("id", id);
  if (error) throw error;
}

export async function getDefaultPTBankId(): Promise<number> {
  // cari default
  const { data, error } = await supabase
    .from("bank_accounts")
    .select("id")
    .eq("is_active", true)
    .eq("is_default", true)
    .order("created_at", { ascending: true })
    .limit(1);

  if (error) throw error;
  const defId = data?.[0]?.id;
  if (defId) return defId;

  // fallback: rekening aktif tertua
  const { data: anyActive, error: e2 } = await supabase
    .from("bank_accounts")
    .select("id")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1);

  if (e2) throw e2;
  const fallbackId = anyActive?.[0]?.id;
  if (fallbackId) return fallbackId;

  // tidak ada rekening aktif sama sekali
  throw new Error("Belum ada rekening PT aktif. Set dulu di Settings → Finance → Rekening PT.");
}

/** (Opsional) set suatu rekening jadi default – panggil RPC yang sudah kamu buat */
export async function setDefaultPTBank(id: number) {
  const { error } = await supabase.rpc("set_default_pt_bank", { p_id: id });
  if (error) throw error;
}

/** (Opsional) ambil data rekening default (bukan hanya ID) */
export async function getDefaultPTBank() {
  const { data, error } = await supabase
    .from("bank_accounts")
    .select("id,name,bank_name,account_name,account_number,is_active,is_default")
    .eq("is_active", true)
    .eq("is_default", true)
    .maybeSingle(); // tidak error kalau kosong

  if (error) throw error;
  return data; // bisa null kalau belum ada default
}

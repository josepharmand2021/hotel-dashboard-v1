// src/features/bank-accounts/api.ts
// All functions here are safe to import in Client Components.

import { supabase } from '@/lib/supabase/client';

/* ========= Types ========= */

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

/* ========= Queries ========= */

/** List all bank accounts (default first, then by created_at) */
export async function listBankAccounts(): Promise<BankAccount[]> {
  const { data, error } = await supabase
    .from('bank_accounts')
    .select(
      'id,name,bank_name,account_name,account_number,is_active,is_default,note,created_at'
    )
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []) as BankAccount[];
}

/** Get the current default PT bank (full row). Returns null if none. */
export async function getDefaultPTBank(): Promise<BankAccount | null> {
  const { data, error } = await supabase
    .from('bank_accounts')
    .select(
      'id,name,bank_name,account_name,account_number,is_active,is_default,created_at'
    )
    .eq('is_active', true)
    .eq('is_default', true)
    .maybeSingle();

  if (error) throw error;
  return (data as BankAccount | null) ?? null;
}

/** Get the current default PT bank id. Falls back to oldest active. Throws if none active. */
export async function getDefaultPTBankId(): Promise<number> {
  // Try the default
  const def = await getDefaultPTBank();
  if (def?.id) return def.id;

  // Fallback: oldest active
  const { data: anyActive, error: e2 } = await supabase
    .from('bank_accounts')
    .select('id')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1);

  if (e2) throw e2;
  const fallbackId = anyActive?.[0]?.id as number | undefined;
  if (fallbackId) return fallbackId;

  throw new Error(
    'Belum ada rekening PT aktif. Set dulu di Settings → Finance → Bank Accounts.'
  );
}

/** Safe version: returns null instead of throwing when no active/default exists. */
export async function getDefaultPTBankIdSafe(): Promise<number | null> {
  try {
    return await getDefaultPTBankId();
  } catch {
    return null;
  }
}

/* ========= Mutations ========= */

/**
 * Create a bank account. If `is_default` is true, it will call
 * `set_default_pt_bank(p_id)` to enforce the single-default rule.
 * Returns the new account id.
 */
export async function createBankAccount(input: {
  name: string;
  bank_name?: string;
  account_name?: string;
  account_number?: string;
  note?: string;
  is_default?: boolean;
  is_active?: boolean;
}): Promise<number> {
  const { data, error } = await supabase
    .from('bank_accounts')
    .insert([{ ...input, is_active: input.is_active ?? true }])
    .select('id,is_default')
    .single();

  if (error) throw error;

  // If the new account should be default, let the RPC enforce single-default.
  if (data?.is_default) {
    const { error: e2 } = await supabase.rpc('set_default_pt_bank', {
      p_id: data.id,
    });
    if (e2) throw e2;
  }

  return data!.id as number;
}

/**
 * Update a bank account. If `changes.is_default === true`,
 * we delegate the default toggling to `set_default_pt_bank`
 * and only update the remaining fields here.
 */
export async function updateBankAccount(
  id: number,
  changes: Partial<BankAccount>
): Promise<void> {
  // If setting this account as default, call the RPC to enforce single-default.
  if (changes.is_default) {
    const { error: e2 } = await supabase.rpc('set_default_pt_bank', {
      p_id: id,
    });
    if (e2) throw e2;

    // Update other fields (excluding is_default which RPC already set).
    const { is_default: _omit, ...rest } = changes;
    if (Object.keys(rest).length) {
      const { error: e3 } = await supabase
        .from('bank_accounts')
        .update(rest)
        .eq('id', id);
      if (e3) throw e3;
    }
    return;
  }

  // Normal update
  const { error } = await supabase
    .from('bank_accounts')
    .update(changes)
    .eq('id', id);
  if (error) throw error;
}

/** Activate a bank account (does not change default flag). */
export async function activateBankAccount(id: number): Promise<void> {
  const { error } = await supabase
    .from('bank_accounts')
    .update({ is_active: true })
    .eq('id', id);
  if (error) throw error;
}

/**
 * Deactivate a bank account. Also unsets `is_default`.
 * (If you want to force a new default, call `setDefaultPTBank` afterwards.)
 */
export async function deactivateBankAccount(id: number): Promise<void> {
  const { error } = await supabase
    .from('bank_accounts')
    .update({ is_active: false, is_default: false })
    .eq('id', id);
  if (error) throw error;
}

/** Explicitly set some account as the default (via RPC). */
export async function setDefaultPTBank(id: number): Promise<void> {
  const { error } = await supabase.rpc('set_default_pt_bank', { p_id: id });
  if (error) throw error;
}

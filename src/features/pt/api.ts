import { supabase } from '@/lib/supabase/client';

export async function listPTBalances() {
  const { data, error } = await supabase
    .from('v_pt_balance_by_account')
    .select('*')
  if (error) throw error;
  return (data || []) as {
    account_id:number; account_name:string;
    inflow_ci_total:number; inflow_topup_total:number; outflow_total:number; balance:number;
  }[];
}

export async function listPTInflows(accountId?: number) {
  let q = supabase.from('v_pt_inflows_list').select('*').order('inflow_date', { ascending:false });
  if (accountId) q = q.eq('account_id', accountId);
  const { data, error } = await q;
  if (error) throw error;
  return data as any[];
}

export async function listBankAccounts() {
  const { data, error } = await supabase.from('bank_accounts').select('id,name').order('name');
  if (error) throw error;
  return (data || []) as {id:number; name:string}[];
}

export async function createTopup(payload: {
  account_id:number; topup_date:string; amount:number;
  inflow_type?: 'loan'|'revenue'|'transfer'|'other';
  source_doc?: string | null; counterparty?: string | null; note?: string | null;
}) {
  const { data, error } = await supabase
    .from('pt_topups')
    .insert({
      account_id: payload.account_id,
      topup_date: payload.topup_date,
      amount: Math.round(payload.amount),
      inflow_type: payload.inflow_type ?? 'other',
      source_doc: payload.source_doc ?? null,
      counterparty: payload.counterparty ?? null,
      note: payload.note ?? null,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data as { id:number };
}

'use server';

import { supabaseServer } from '@/lib/supabase/server';

/* ========== Helpers ========== */
function toISODate(v?: string | Date | null): string | null {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}
function toInt(n: number | string): number {
  const v = typeof n === 'string' ? parseFloat(n) : n;
  return Math.round(v || 0);
}
function round0(n: number) { return Math.round(Number(n) || 0); }

/* ========== PO preset (server) ========== */
export async function getPOImportPreset(poId: number) {
  const sb = await supabaseServer();

  const [{ data: fin, error: finErr }, { data: hdr, error: hdrErr }] = await Promise.all([
    sb.from('v_po_finance')
      .select('id,total,paid,outstanding')
      .eq('id', poId)
      .maybeSingle(),
    sb.from('v_po_with_terms')
      .select('subtotal,tax_amount,total_amount,is_tax_included,tax_percent')
      .eq('id', poId)
      .maybeSingle(),
  ]);
  if (finErr || hdrErr || !hdr || !fin) {
    throw new Error(finErr?.message || hdrErr?.message || 'PO not found');
  }

  const grossTarget = Number(fin.outstanding ?? Math.max(Number(fin.total||0) - Number(fin.paid||0), 0));
  const taxPct = Number(hdr.tax_percent ?? 0);
  const taxIncluded = !!hdr.is_tax_included;

  let dpp = 0, ppn = 0, gross = round0(grossTarget);
  if (taxIncluded) {
    dpp = round0(gross / (1 + taxPct / 100));
    ppn = gross - dpp;
  } else {
    dpp = round0(gross);
    ppn = round0(dpp * (taxPct / 100));
    gross = dpp + ppn;
  }

  return {
    dpp, ppn, gross,
    tax_percent: taxPct,
    is_tax_included: taxIncluded,
  };
}

/* ========== LIST ========== */
export async function listPayables(opts?: {
  q?: string;
  status?: 'unpaid'|'paid'|'all';
  withPO?: 'with'|'without'|'all';
  source?: 'all'|'PT'|'RAB'|'Petty';
  from?: string; // 'YYYY-MM-DD'
  to?: string;   // 'YYYY-MM-DD'
  page?: number;
  limit?: number;
  sort?: 'date_desc'|'date_asc'|'due_desc'|'due_asc'|'amount_desc'|'amount_asc';
}) {
  const {
    q, status='all', withPO='all', source='all',
    from, to,
    page=1, limit=20,
    sort='date_desc',
  } = opts ?? {};

  const sb = await supabaseServer();
  let query = sb.from('payables').select('*', { count: 'exact' });

  if (status !== 'all') query = query.eq('status', status);
  if (withPO === 'with')    query = query.not('po_id', 'is', null);
  if (withPO === 'without') query = query.is('po_id', null);
  if (source !== 'all')     query = query.eq('source', source);

  if (from) query = query.gte('invoice_date', from);
  if (to)   query = query.lte('invoice_date', to);

  if (q?.trim()) {
    query = query.or(`invoice_no.ilike.%${q}%,vendor_name.ilike.%${q}%,tax_invoice_no.ilike.%${q}%`);
  }

  switch (sort) {
    case 'date_asc':
      query = query.order('invoice_date', { ascending: true }).order('id', { ascending: true });
      break;
    case 'due_desc':
      query = query.order('due_date', { ascending: false, nullsFirst: true });
      break;
    case 'due_asc':
      query = query.order('due_date', { ascending: true, nullsFirst: true });
      break;
    case 'amount_desc':
      query = query.order('amount', { ascending: false });
      break;
    case 'amount_asc':
      query = query.order('amount', { ascending: true });
      break;
    default:
      query = query.order('invoice_date', { ascending: false }).order('id', { ascending: false });
  }

  const fromRow = (page - 1) * limit;
  const toRow   = page * limit - 1;
  query = query.range(fromRow, toRow);

  const { data, error, count } = await query;
  if (error) throw error;
  return { rows: data ?? [], count: count ?? 0, page, limit };
}

/* ========== CREATE via RPC create_payable ========== */
export type CreatePayableInput = {
  po_id?: number | null;
  vendor_id: number;
  vendor_name?: string | null;
  invoice_no: string;
  invoice_date: string | Date;
  due_date?: string | Date | null;
  term_no?: number | null;
  term_percent?: number | null;
  category_id: number;
  subcategory_id: number;
  amount: number | string;
  note?: string | null;

  source?: 'PT'|'RAB'|'Petty';
  dpp_amount?: number | string | null;
  ppn_amount?: number | string | null;
  tax_invoice_no?: string | null;
  tax_invoice_date?: string | Date | null;
};

export async function createPayable(input: CreatePayableInput) {
  const sb = await supabaseServer();
  try {
    const src = input.source ?? 'PT';

    // Jika PT + ada PO + angka belum lengkap → derive dari PO (server-side guard)
    let dpp = input.dpp_amount != null ? toInt(input.dpp_amount) : null;
    let ppn = input.ppn_amount != null ? toInt(input.ppn_amount) : null;
    let gross = toInt(input.amount);

    if (src === 'PT' && input.po_id) {
      const needDerive = (dpp == null || ppn == null || gross <= 0);
      if (needDerive) {
        const preset = await getPOImportPreset(Number(input.po_id));
        dpp = preset.dpp;
        ppn = preset.ppn;
        gross = preset.gross;
      }
    }

    // Pastikan konsistensi untuk PT: gross = dpp + ppn
    if (src === 'PT' && dpp != null && ppn != null) {
      gross = dpp + ppn;
    }

    const { data, error } = await sb.rpc('create_payable', {
      p_po_id: input.po_id ?? null,
      p_vendor_id: input.vendor_id,
      p_vendor_name: input.vendor_name ?? null,
      p_invoice_no: input.invoice_no,
      p_invoice_date: toISODate(input.invoice_date),
      p_due_date: toISODate(input.due_date ?? null),
      p_term_no: input.term_no ?? null,
      p_term_percent: input.term_percent ?? null,
      p_category_id: input.category_id,
      p_subcategory_id: input.subcategory_id,
      p_amount: gross,                  // ⬅️ selalu konsisten
      p_note: input.note ?? null,

      p_source: src,
      p_dpp_amount: dpp,
      p_ppn_amount: ppn,
      p_tax_invoice_no: input.tax_invoice_no ?? null,
      p_tax_invoice_date: toISODate(input.tax_invoice_date ?? null),
    });
    if (error) throw error;
    return data as number;
  } catch (e:any) {
    const msg = [e?.message,e?.details,e?.hint,e?.code && `(code: ${e.code})`].filter(Boolean).join(' | ');
    console.error('create_payable error:', e);
    throw new Error(msg || 'Create payable failed');
  }
}

/* ========== PAY via RPC pay_payable (tetap) ========== */
export type PayPayableInput = {
  payableId: number;
  expenseDate?: string | Date;
  source?: 'PT' | 'RAB' | 'Petty';
  accountId?: number | null;
  cashboxId?: number | null;
  note?: string | null;
  withholding_code?: 'PPh21' | 'PPh23' | 'PPh4(2)' | 'PPh22' | 'NONE';
  withholding_percent?: number;
  withholding_amount?: number | string;
};

export async function payPayable(input: PayPayableInput) {
  const sb = await supabaseServer();
  const { data, error } = await sb.rpc('pay_payable', {
    p_payable_id: input.payableId,
    p_expense_date: toISODate(input.expenseDate ?? null),
    p_source: input.source ?? 'PT',
    p_account_id: input.accountId ?? null,
    p_cashbox_id: input.cashboxId ?? null,
    p_note: input.note ?? null,
    p_withholding_code: input.withholding_code ?? null,
    p_withholding_percent: input.withholding_percent ?? null,
    p_withholding_amount: input.withholding_amount != null ? toInt(input.withholding_amount) : null,
  });
  if (error) throw error;

  await recalcPayableStatusServer(sb, input.payableId);
  return data as number; // expense_id
}

/* ========== Detail ========== */
export async function getPayableById(id: number) {
  const sb = await supabaseServer();
  const { data, error } = await sb.from('payables').select('*').eq('id', id).single();
  if (error) throw error;
  return data!;
}

async function recalcPayableStatusServer(
  sb: ReturnType<typeof supabaseServer> extends Promise<infer _> ? Awaited<ReturnType<typeof supabaseServer>> : any,
  payableId: number
) {
  const { data: p } = await sb.from('payables').select('id, amount, status').eq('id', payableId).maybeSingle();
  if (!p) return;

  const { data: ex } = await sb.from('expenses').select('amount, status').eq('payable_id', payableId);
  const paid = (ex ?? []).filter(e => e.status === 'posted')
    .reduce((s, e: any) => s + Number(e.amount || 0), 0);
  const newStatus = paid >= Number(p.amount || 0) ? 'paid' : 'unpaid';
  if (newStatus !== p.status) {
    await sb.from('payables').update({ status: newStatus }).eq('id', payableId);
  }
}

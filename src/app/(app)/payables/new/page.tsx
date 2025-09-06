import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import { createPayable } from '../actions';
import PayableForm from './PayableForm';

function parseIDR(x: FormDataEntryValue | null) {
  if (!x) return undefined;
  const s = String(x).replace(/[.,\s]/g, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

export default async function NewPayablePage({
  searchParams,
}: {
  searchParams: Promise<{ poId?: string }>;
}) {
  const sp = await searchParams;

  // Prefill dari PO jika datang dengan ?poId=
  const sb = await supabaseServer();
  let po: any = null;
  if (sp?.poId) {
    const { data } = await sb
      .from('purchase_orders')
      .select(
        `
        id, po_number, vendor_id, total,
        term_days, due_date_override, is_tax_included, tax_percent,
        vendors ( name )
      `,
      )
      .eq('id', Number(sp.poId))
      .single();
    po = data ?? null;
  }

  async function action(fd: FormData) {
    'use server';

    const po_id = fd.get('po_id') ? Number(fd.get('po_id')) : undefined;
    const vendor_id = Number(fd.get('vendor_id'));
    const vendor_name = (fd.get('vendor_name') as string) || undefined;
    const invoice_no = String(fd.get('invoice_no') || '').trim();
    const invoice_date = String(fd.get('invoice_date') || '');
    const due_date = fd.get('due_date') ? String(fd.get('due_date')) : undefined;
    const term_no = fd.get('term_no') ? Number(fd.get('term_no')) : undefined;
    const term_percent = fd.get('term_percent') ? Number(fd.get('term_percent')) : undefined;
    const category_id = Number(fd.get('category_id'));
    const subcategory_id = Number(fd.get('subcategory_id'));
    const note = (fd.get('note') as string) || undefined;

    const source = (fd.get('source') as 'PT' | 'RAB' | 'Petty') || 'PT';
    let amount = parseIDR(fd.get('amount')) ?? 0;

    // field pajak hanya terkirim kalau source=PT (form meng-hide utk non-PT)
    let dpp_amount = parseIDR(fd.get('dpp_amount'));
    let ppn_amount = parseIDR(fd.get('ppn_amount'));
    const tax_invoice_no = (fd.get('tax_invoice_no') as string) || undefined;
    const tax_invoice_date = fd.get('tax_invoice_date') ? String(fd.get('tax_invoice_date')) : undefined;

    // normalisasi biar konsisten
    if (source !== 'PT') {
      dpp_amount = amount;
      ppn_amount = 0;
    } else {
      if ((dpp_amount ?? 0) <= 0 && amount > 0 && (ppn_amount ?? 0) >= 0) {
        if (ppn_amount == null) {
          const dpp = Math.round(amount / 1.11);
          dpp_amount = dpp;
          ppn_amount = amount - dpp;
        } else {
          dpp_amount = amount - ppn_amount;
        }
      } else if (dpp_amount && (ppn_amount == null || ppn_amount < 0)) {
        ppn_amount = Math.round(dpp_amount * 0.11);
      }
    }
    const gross = (dpp_amount ?? 0) + (ppn_amount ?? 0);
    if (gross > 0) amount = gross;

    const id = await createPayable({
      po_id,
      vendor_id,
      vendor_name,
      invoice_no,
      invoice_date,
      due_date,
      term_no,
      term_percent,
      category_id,
      subcategory_id,
      amount,
      note,
      source,
      dpp_amount,
      ppn_amount,
      tax_invoice_no: source === 'PT' ? tax_invoice_no ?? null : null,
      tax_invoice_date: source === 'PT' ? tax_invoice_date ?? null : null,
    });

    redirect(`/payables/${id}`);
  }

  return <PayableForm action={action} po={po} />;
}

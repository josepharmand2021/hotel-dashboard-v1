// src/app/(app)/payables/[id]/page.tsx
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import { getPayableById, payPayable } from '../actions';

// panels & roles
import AttachmentPanelPayable from '@/app/api/docs/components/AttachmentPanelPayable';
import { getRoleFlagsServer } from '@/lib/roles';

// Pastikan page ini berjalan di Node.js runtime (aman untuk supabase server client)
export const runtime = 'nodejs';

function fmtIDR(n: number | string | null | undefined) {
  const v = typeof n === 'string' ? parseFloat(n) : (n ?? 0);
  return new Intl.NumberFormat('id-ID').format(v as number);
}

function StatusBadge({ s }: { s: string }) {
  const cls =
    s === 'paid'
      ? 'bg-green-100 text-green-700'
      : s === 'unpaid'
      ? 'bg-amber-100 text-amber-700'
      : 'bg-gray-100 text-gray-700';
  return <span className={`px-2 py-0.5 rounded text-xs ${cls}`}>{s.toUpperCase()}</span>;
}

// ✅ Next.js 15: params adalah Promise — jangan pakai union type
export default async function Page(props: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await props.params;
  const id = Number(idStr || 0);
  if (!id) notFound();

  // -- Ambil payable utama
  const payable = await getPayableById(id).catch(() => null as any);
  if (!payable) notFound();

  // -- Ambil PO number & nama vendor (opsional)
  const sb = await supabaseServer();
  const [{ data: poRow }, { data: venRow }] = await Promise.all([
    sb.from('purchase_orders').select('id, po_number').eq('id', payable.po_id).maybeSingle(),
    sb.from('vendors').select('id, name').eq('id', payable.vendor_id).maybeSingle(),
  ]);

  // -- Ambil expense hasil pembayaran (kalau ada)
  const { data: exp } = await sb
    .from('expenses')
    .select('id, expense_date, amount, status, account_id, cashbox_id')
    .eq('payable_id', id)
    .order('id', { ascending: false })
    .limit(1);

  // -- Role mapping untuk panel dokumen
  const { isSuper, isAdmin } = await getRoleFlagsServer();
  const role: 'viewer' | 'admin' | 'superadmin' = isSuper ? 'superadmin' : isAdmin ? 'admin' : 'viewer';

  // ====== Actions ======
  async function payAction(fd: FormData) {
    'use server';
    const expenseDate = String(fd.get('expense_date') || new Date().toISOString().slice(0, 10));
    const source = (fd.get('source') ? String(fd.get('source')) : (payable.source || 'PT')) as 'PT' | 'RAB' | 'Petty';
    const accountId = fd.get('account_id') ? Number(fd.get('account_id')) : null;
    const cashboxId = fd.get('cashbox_id') ? Number(fd.get('cashbox_id')) : null;
    const note = String(fd.get('note') || '');
    await payPayable({ payableId: id, expenseDate, source, accountId, cashboxId, note });
    redirect(`/payables/${id}`);
  }

  async function voidAction() {
    'use server';
    const sb2 = await supabaseServer();
    const { error } = await sb2.from('payables').update({ status: 'void' }).eq('id', id);
    if (error) throw error;
    redirect('/payables');
  }

  const poNumber = poRow?.po_number ?? payable.po_id ?? '—';
  const vendorName = payable.vendor_name ?? venRow?.name ?? `#${payable.vendor_id}`;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs text-slate-500">
            <Link href="/payables" className="hover:underline">
              ← Back to list
            </Link>
          </div>
          <h1 className="text-xl font-semibold">
            Invoice <span className="font-mono">{payable.invoice_no}</span>
          </h1>
          <div className="mt-1 text-sm text-slate-600">
            Vendor: <b>{vendorName}</b> • PO: <b>{poNumber}</b>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge s={payable.status} />
          {payable.status === 'unpaid' && (
            <form action={voidAction}>
              <button type="submit" className="px-3 py-1.5 rounded border text-sm">
                Void
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Ringkasan angka */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="border rounded p-3">
          <div className="text-xs text-slate-500">DPP</div>
          <div className="text-lg font-semibold">Rp {fmtIDR(payable.dpp_amount)}</div>
        </div>
        <div className="border rounded p-3">
          <div className="text-xs text-slate-500">PPN</div>
          <div className="text-lg font-semibold">Rp {fmtIDR(payable.ppn_amount)}</div>
        </div>
        <div className="border rounded p-3">
          <div className="text-xs text-slate-500">Gross Amount</div>
          <div className="text-lg font-semibold">Rp {fmtIDR(payable.amount)}</div>
        </div>
      </div>

      {/* Detail metadata */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="border rounded p-3 space-y-1 text-sm">
          <div>
            <span className="text-slate-500">Source:</span> <b>{payable.source ?? 'PT'}</b>
          </div>
          <div>
            <span className="text-slate-500">Invoice Date:</span> {payable.invoice_date}
          </div>
          <div>
            <span className="text-slate-500">Due Date:</span> {payable.due_date ?? '—'}
          </div>
          <div>
            <span className="text-slate-500">Term:</span> {payable.term_no ?? '—'} ({payable.term_percent ?? '—'}%)
          </div>
        </div>
        <div className="border rounded p-3 space-y-1 text-sm">
          <div>
            <span className="text-slate-500">Faktur Pajak:</span> {payable.tax_invoice_no ?? '—'}
          </div>
          <div>
            <span className="text-slate-500">Tanggal FP:</span> {payable.tax_invoice_date ?? '—'}
          </div>
          <div>
            <span className="text-slate-500">PPN creditable:</span> {String(payable.is_ppn_creditable ?? false).toUpperCase()}
          </div>
          <div>
            <span className="text-slate-500">Catatan:</span> {payable.note ?? '—'}
          </div>
        </div>
      </div>

      {/* 🔽 PANEL DOKUMEN (anchor #docs) */}
      <div id="docs" className="border rounded p-4 scroll-mt-24">
        <AttachmentPanelPayable payableId={id} role={role} />
      </div>

      {/* Payment (bila sudah tercatat) */}
      {exp && exp.length > 0 && (
        <div className="border rounded">
          <div className="px-3 py-2 border-b font-medium">Payment</div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 text-left">Expense ID</th>
                <th className="p-2 text-left">Date</th>
                <th className="p-2 text-right">Amount</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Account</th>
                <th className="p-2 text-left">Cashbox</th>
              </tr>
            </thead>
            <tbody>
              {exp.map((e: any) => (
                <tr key={e.id} className="border-t">
                  <td className="p-2">{e.id}</td>
                  <td className="p-2">{e.expense_date}</td>
                  <td className="p-2 text-right">Rp {fmtIDR(e.amount)}</td>
                  <td className="p-2">{e.status}</td>
                  <td className="p-2">{e.account_id ?? '—'}</td>
                  <td className="p-2">{e.cashbox_id ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

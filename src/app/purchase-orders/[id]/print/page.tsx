// src/app/purchase-orders/[id]/print/page.tsx
'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getPurchaseOrder } from '@/features/purchase-orders/api'; // pastikan fungsi ini bisa dipanggil di client

const fmtID = new Intl.NumberFormat('id-ID');

const COMPANY = {
  name: 'PT Inovasi Akomodasi Kreatif',
  address: 'Jl. Sumatera No. 49, Citarum Bandung Wetan, Kota Bandung',
  logo: '/logo.png', // letakkan file di /public/logo.png
};

export default function PurchaseOrderPrintPage() {
  const { id: idParam } = useParams<{ id: string }>();
  const id = Number(idParam);
  const [po, setPo] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const data = await getPurchaseOrder(id);
      setPo(data);
      setTimeout(() => window.print(), 100);
    })();
  }, [id]);

  if (!po) return null;

  const items = (po.items ?? []) as Array<{
    id: number; description: string; qty: number; unit?: string | null; unit_price: number; amount?: number;
  }>;

  const subtotal =
    po.subtotal != null
      ? Number(po.subtotal)
      : items.reduce((s, it) => s + (Number(it.amount ?? it.qty * it.unit_price) || 0), 0);

  const taxPct = Number(po.tax_percent ?? 0);
  const taxAmount = po.is_tax_included ? 0 : subtotal * (taxPct / 100);
  const total = po.total ?? (po.is_tax_included ? subtotal : subtotal + taxAmount);

  const vendor = po.vendor ?? null;
  const paymentTerm =
    vendor?.payment_term_label ??
    (vendor?.payment_type === 'COD'
      ? 'COD (Cash On Delivery)'
      : vendor?.payment_type === 'NET' && vendor?.term_days
      ? `Net ${vendor.term_days} Days`
      : 'CBD (Cash Before Delivery)');

  const notes: string[] = (po.note || '')
    .split(/\r?\n/).map((s: string) => s.trim()).filter(Boolean);

  return (
    <div className="print-page">
      {/* HEADER */}
      <div className="flex items-start justify-between">
        <div className="w-40">
          <Image src={COMPANY.logo} alt="Logo" width={200} height={80} />
        </div>
        <div className="text-center flex-1">
          <h1 className="text-4xl font-extrabold tracking-wide">PURCHASE ORDER</h1>
        </div>
        <div className="w-40" />
      </div>

      {/* BARIS ATAS - kiri: pengiriman & payment, kanan: tanggal/no po (sejajar) */}
      <div className="grid grid-cols-2 gap-10 mt-6">
        {/* kiri */}
        <div>
          <KV label="Tanggal Pengiriman:" value={po.delivery_date || 'Segera'} />
          <KV label="Payment Term:" value={paymentTerm} />
        </div>

        {/* kanan */}
        <div className="flex justify-end gap-16">
          <div className="text-right">
            <div className="font-semibold uppercase">TANGGAL PO:</div>
            <div className="mt-1">{po.po_date || '—'}</div>
          </div>
          <div className="text-right">
            <div className="font-semibold uppercase">NO PO:</div>
            <div className="mt-1">{po.po_number || '—'}</div>
          </div>
        </div>
      </div>

      {/* BARIS KEDUA - kiri: informasi perusahaan, kanan: tujuan order */}
      <div className="grid grid-cols-2 gap-10 mt-6">
        <div>
          <div className="font-extrabold tracking-wide">INFORMASI PERUSAHAAN</div>
          <div className="mt-2">{COMPANY.name}</div>
          <div>{COMPANY.address}</div>
        </div>

        <div>
          <div className="font-extrabold tracking-wide">TUJUAN ORDER</div>
          <div className="mt-2">{vendor?.name ?? '—'}</div>
          {vendor?.address && <div>{vendor.address}</div>}
          {vendor?.phone && <div>Telp: {vendor.phone}</div>}
        </div>
      </div>

      {/* ITEMS */}
      <div className="mt-8">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left bg-[#dbeafe] border border-black/60">
              <th className="py-2 px-2 w-[60px] border-r border-black/60">NO</th>
              <th className="py-2 px-2 border-r border-black/60">ITEM</th>
              <th className="py-2 px-2 w-[100px] border-r border-black/60">UNIT</th>
              <th className="py-2 px-2 w-[100px] text-right border-r border-black/60">QTY</th>
              <th className="py-2 px-2 w-[160px] text-right border-r border-black/60">UNIT PRICE</th>
              <th className="py-2 px-2 w-[180px] text-right">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => {
              const amt = Number(it.amount ?? it.qty * it.unit_price) || 0;
              return (
                <tr key={it.id} className="border-x border-b border-black/60 align-top">
                  <td className="py-2 px-2 border-r border-black/60">{idx + 1}</td>
                  <td className="py-2 px-2 border-r border-black/60">{it.description}</td>
                  <td className="py-2 px-2 border-r border-black/60">{it.unit || '—'}</td>
                  <td className="py-2 px-2 text-right border-r border-black/60">{fmtID.format(it.qty)}</td>
                  <td className="py-2 px-2 text-right border-r border-black/60">Rp {fmtID.format(it.unit_price)}</td>
                  <td className="py-2 px-2 text-right">Rp {fmtID.format(amt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* NOTES + TOTALS */}
      <div className="mt-8 grid grid-cols-2 gap-8 items-start">
        <div>
          <div className="font-extrabold tracking-wide">Notes:</div>
          {notes.length === 0 ? (
            <div className="mt-2">—</div>
          ) : (
            <ol className="mt-2 list-decimal pl-6 space-y-1">
              {notes.map((n, i) => (
                <li key={i} className="leading-relaxed">{n}</li>
              ))}
            </ol>
          )}
        </div>

        <div className="flex justify-end">
          <div className="w-[420px] border border-black/60">
            <SumRow label="Subtotal:" value={`Rp ${fmtID.format(subtotal)}`} />
            <SumRow
              label={`PPN (${taxPct}%):`}
              value={po.is_tax_included ? '—' : `Rp ${fmtID.format(taxAmount)}`}
            />
            <SumRow bold label="Total:" value={`Rp ${fmtID.format(total)}`} />
          </div>
        </div>
      </div>

      {/* SIGNATURE */}
      <div className="mt-16 flex justify-end">
        <div className="w-64">
          <div className="text-center">Hormat kami,</div>
          <div className="h-20" />
          <div className="text-center font-semibold">( ______________________ )</div>
        </div>
      </div>

      {/* PRINT CSS */}
      <style jsx global>{`
        @page { size: A4; margin: 16mm; }
        @media print {
          aside, nav, header, footer,
          .app-sidebar, .app-topbar, .breadcrumbs, .no-print { display: none !important; }
          body { background: white !important; }
        }
        .print-page { font-size: 14px; line-height: 1.2; }
        table, th, td { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      `}</style>
    </div>
  );
}

/* kecil-kecil util */
function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 mt-2 first:mt-0">
      <span className="font-semibold min-w-[180px]">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function SumRow({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between px-3 py-2 border-b border-black/60 ${bold ? 'font-semibold' : ''}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

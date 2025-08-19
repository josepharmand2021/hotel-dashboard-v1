'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

type Header = {
  id: number;
  grn_number: string;
  date_received: string | null;
  vendor_name: string | null;
  purchase_order_id: number | null;
  po?: { po_number: string | null } | null;
};

type Row = {
  id: number;
  description: string | null;
  uom: string | null;
  qty_po: number;
};

export default function PrintReceiveForm() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [header, setHeader] = useState<Header | null>(null);
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const fmtNum = useMemo(() => new Intl.NumberFormat('id-ID'), []);
  const fmtDate = (s?: string | null) => (s ? new Date(s).toLocaleDateString('id-ID') : '—');

  useEffect(() => {
    async function load() {
      setLoading(true);

      // Header + PO No (tanpa status)
      const { data: h } = await supabase
        .from('grns')
        .select(`
          id, grn_number, date_received, vendor_name, purchase_order_id,
          po:purchase_orders ( po_number )
        `)
        .eq('id', Number(id))
        .single();

      let fixedHeader = h as Header | null;
      if (fixedHeader && !fixedHeader.po?.po_number && fixedHeader.purchase_order_id) {
        const { data: po } = await supabase
          .from('purchase_orders')
          .select('po_number')
          .eq('id', fixedHeader.purchase_order_id)
          .single();
        fixedHeader = { ...fixedHeader, po: { po_number: po?.po_number ?? null } };
      }

      // Items
      const { data: gi } = await supabase
        .from('grn_items')
        .select(`
          id, description, uom,
          po_item:po_items ( qty )
        `)
        .eq('grn_id', Number(id))
        .order('id', { ascending: true });

      const rows: Row[] = (gi || []).map((r: any) => ({
        id: r.id,
        description: r.description ?? null,
        uom: r.uom ?? null,
        qty_po: Number(r?.po_item?.qty ?? 0),
      }));

      setHeader(fixedHeader);
      setItems(rows);
      setLoading(false);
    }
    load();
  }, [id]);

  const totalPO = useMemo(() => items.reduce((a, r) => a + (r.qty_po || 0), 0), [items]);

  // Komponen kecil: kotak tanda tangan
  const SigBox = ({ title }: { title: string }) => (
    <div className="w-[220px] text-sm text-center">
      <div className="mb-12 print:mb-10">{title}</div>
      <div className="border-t pt-1">Nama & Tanda Tangan</div>
      <div className="text-xs text-muted-foreground mt-1">Tanggal: ____________</div>
    </div>
  );

  return (
    <div className="mx-auto max-w-[980px] p-6 print:p-0">
      {/* Toolbar (sembunyi saat print) */}
      <div className="flex justify-between items-center mb-4 print:hidden">
        <div className="text-xl font-semibold">Form Penerimaan Barang</div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>Tutup</Button>
          <Button onClick={() => window.print()}>Print</Button>
        </div>
      </div>

      {/* SHEET */}
      <div className="sheet rounded-2xl border bg-white p-8 print:p-5 print:rounded-lg print-avoid">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-[300px]">
            <div className="text-2xl font-extrabold leading-tight">FORM PENERIMAAN BARANG</div>
            <div className="text-sm text-muted-foreground">Dokumen serah-terima barang ke gudang</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-muted-foreground">GRN No</div>
            <div className="text-xl font-bold tracking-wide">{header?.grn_number || '—'}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{fmtDate(header?.date_received)}</div>
          </div>
        </div>

        {/* Meta box: PO No di atas Vendor, Status dihilangkan */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm print:text-[12px]">
          <div className="md:col-span-2 rounded-xl border p-4 print:p-3 print-avoid">
            <div className="flex gap-2">
              <div className="w-32 text-muted-foreground">PO No</div>
              <div className="font-medium">{header?.po?.po_number || '—'}</div>
            </div>
            <div className="flex gap-2 mt-2">
              <div className="w-32 text-muted-foreground">Vendor</div>
              <div className="font-medium">{header?.vendor_name || '—'}</div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-32 text-muted-foreground">Ref No (SJ)</div>
              {/* Isian manual */}
              <div className="line h-6 w-60" />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="flex items-center gap-2">
                <div className="text-muted-foreground shrink-0">Jam Diterima</div>
                <div className="line h-6 grow" />
              </div>
              <div className="flex items-center gap-2">
                <div className="text-muted-foreground shrink-0">Gudang</div>
                <div className="line h-6 grow" />
              </div>
              <div className="flex items-center gap-2 col-span-2">
                <div className="text-muted-foreground shrink-0 w-32">Lokasi</div>
                <div className="line h-6 grow" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabel items */}
        <div className="mt-5 rounded-xl border overflow-hidden print-avoid">
          <table className="w-full text-sm print:text-[12px]">
            <thead className="bg-muted/60">
              <tr className="text-muted-foreground">
                <th className="px-3 py-2 text-left w-10">No</th>
                <th className="px-3 py-2 text-left">Deskripsi</th>
                <th className="px-3 py-2 text-left w-24">UOM</th>
                <th className="px-3 py-2 text-right w-24">PO Qty</th>
                <th className="px-3 py-2 text-center w-44">Diterima (Fisik)</th>
                <th className="px-3 py-2 text-left w-[36%]">Catatan</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">Loading…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">Tidak ada item.</td></tr>
              ) : (
                items.map((r, i) => (
                  <tr key={r.id} className="border-t align-top odd:bg-muted/20">
                    <td className="px-3 py-3">{i + 1}</td>
                    <td className="px-3 py-3"><div className="whitespace-pre-line">{r.description || '—'}</div></td>
                    <td className="px-3 py-3">{r.uom || '—'}</td>
                    <td className="px-3 py-3 text-right">{fmtNum.format(r.qty_po || 0)}</td>
                    <td className="px-3 py-3"><div className="h-8 border rounded-md"></div></td>
                    <td className="px-3 py-3"><div className="h-8 border-b"></div></td>
                  </tr>
                ))
              )}
            </tbody>
            {!loading && items.length > 0 && (
              <tfoot>
                <tr className="border-t font-semibold">
                  <td className="px-3 py-2 text-right" colSpan={3}>Total</td>
                  <td className="px-3 py-2 text-right">{fmtNum.format(totalPO)}</td>
                  <td className="px-3 py-2"></td>
                  <td className="px-3 py-2"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Tanda tangan: sejajar di KANAN */}
        <div className="mt-8 flex justify-end gap-10 print:gap-8 text-sm print:text-[12px] print-avoid">
          <SigBox title="Diterima oleh (Gudang)" />
          <SigBox title="Diperiksa oleh (QC/Lapangan)" />
          <SigBox title="Pengirim" />
        </div>
      </div>

      {/* PRINT STYLES */}
      <style jsx global>{`
        /* A4: 210mm; margin 12mm → konten 186mm */
        @media print {
          @page { size: A4 portrait; margin: 12mm; }
          body { background: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .sheet { width: 186mm !important; margin: 0 auto !important; }
          .print-avoid { break-inside: avoid; page-break-inside: avoid; }
          table { border-collapse: collapse; }
          th, td { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        .line { border-bottom: 1.5px solid #000; }
      `}</style>
    </div>
  );
}

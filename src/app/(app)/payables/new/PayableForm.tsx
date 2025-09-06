'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, FormEvent } from 'react';
import ComboboxPO, { type POOpt } from '@/components/ComboboxPO';
import ComboboxVendor from '@/components/ComboboxVendor';
import ComboboxCategory, { type CategoryOpt } from '@/components/ComboboxCategory';
import ComboboxSubcategory, { type SubcategoryOpt } from '@/components/ComboboxSubcategory';
import { supabase } from '@/lib/supabase/client';

// helpers
const round0 = (n: number) => Math.round(Number(n) || 0);

function deriveFromGross(gross: number, taxPct: number, taxIncluded: boolean) {
  gross = round0(gross);
  if (gross <= 0) return { dpp: 0, ppn: 0, gross: 0 };
  if (taxIncluded) {
    const dpp = round0(gross / (1 + taxPct / 100));
    const ppn = gross - dpp;
    return { dpp, ppn, gross };
  } else {
    const dpp = round0(gross);
    const ppn = round0(dpp * (taxPct / 100));
    return { dpp, ppn, gross: dpp + ppn };
  }
}

/** Opsi PO yang dipakai di form (tambahan field opsional) */
type AnyPO = POOpt & Partial<{
  term_days: number;
  due_date_override: string; // 'YYYY-MM-DD'
  is_tax_included: boolean;
  tax_percent: number;
}>;

/** Opsi Vendor untuk state controlled */
type VendorOpt = { id: number; name: string };

export default function PayableForm({
  action,
  po,
}: {
  action: (fd: FormData) => Promise<void>;
  po?: any | null;
}) {
  const normalizedInitialPO: AnyPO | null = po
    ? {
        id: Number(po.id),
        po_number: String(po.po_number ?? po.id),
        vendor_id: Number(po.vendor_id),
        vendor_name: String(po.vendors?.name ?? po.vendor_name ?? '—'),
        term_days: po.term_days ?? null,
        due_date_override: po.due_date_override ?? null,
        is_tax_included: po.is_tax_included ?? null,
        tax_percent: po.tax_percent ?? null,
        total: po.total ?? null,
      }
    : null;

  const [selectedPO, setSelectedPO] = useState<AnyPO | null>(normalizedInitialPO);
  const [vendorOpt, setVendorOpt] = useState<VendorOpt | null>(null);
  const [catOpt, setCatOpt] = useState<CategoryOpt | null>(null);
  const [subOpt, setSubOpt] = useState<SubcategoryOpt | null>(null);

  const [source, setSource] = useState<'PT' | 'RAB' | 'Petty'>(selectedPO ? 'PT' : 'PT');
  const isPT = source === 'PT';

  // refs hidden/controlled fields
  const vendorIdRef = useRef<HTMLInputElement>(null);
  const vendorNameRef = useRef<HTMLInputElement>(null);
  const poIdRef = useRef<HTMLInputElement>(null);
  const dueRef = useRef<HTMLInputElement>(null);
  const invDateRef = useRef<HTMLInputElement>(null);
  const catIdRef = useRef<HTMLInputElement>(null);
  const subIdRef = useRef<HTMLInputElement>(null);

  // refs untuk amounts (diisi oleh tombol import)
  const dppRef = useRef<HTMLInputElement>(null);
  const ppnRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  const vendorDisplay = useMemo(() => {
    if (!selectedPO) return vendorOpt?.name ?? null;
    return selectedPO.vendor_name ?? `#${selectedPO.vendor_id}`;
  }, [selectedPO, vendorOpt]);

  useEffect(() => {
    if (selectedPO) {
      setSource('PT');
      setVendorOpt(null);
      if (poIdRef.current) poIdRef.current.value = String(selectedPO.id);
      if (vendorIdRef.current) vendorIdRef.current.value = String(selectedPO.vendor_id);
      if (vendorNameRef.current) vendorNameRef.current.value = selectedPO.vendor_name ?? '';
    } else {
      if (poIdRef.current) poIdRef.current.value = '';
      if (vendorIdRef.current) vendorIdRef.current.value = '';
      if (vendorNameRef.current) vendorNameRef.current.value = '';
      if (dueRef.current) dueRef.current.value = '';
    }
  }, [selectedPO]);

  useEffect(() => {
    const syncDue = () => {
      if (!selectedPO || !invDateRef.current || !dueRef.current) return;
      const inv = invDateRef.current.value;
      if (!inv) return;
      if (selectedPO.due_date_override) {
        dueRef.current.value = selectedPO.due_date_override;
        return;
      }
      const td = selectedPO.term_days ?? 0;
      if (td > 0) {
        const d = new Date(`${inv}T00:00:00`);
        d.setDate(d.getDate() + td);
        dueRef.current.value = d.toISOString().slice(0, 10);
      }
    };
    syncDue();
    const el = invDateRef.current;
    if (el) {
      el.addEventListener('change', syncDue);
      return () => el.removeEventListener('change', syncDue);
    }
  }, [selectedPO]);

  // 2) Saat Source bukan PT, kosongkan DPP/PPN (inputnya memang tidak terkirim saat unmount,
//     tapi ini menghindari nilai tertinggal kalau user bolak-balik PT <-> RAB/Petty)
useEffect(() => {
  if (!isPT) {
    if (dppRef.current) dppRef.current.value = '';
    if (ppnRef.current) ppnRef.current.value = '';
  }
}, [isPT]);

  useEffect(() => {
    if (subOpt && catOpt && subOpt.category_id !== catOpt.id) {
      setSubOpt(null);
      if (subIdRef.current) subIdRef.current.value = '';
    }
  }, [catOpt]); // eslint-disable-line

  const clearPO = () => {
    setSelectedPO(null);
    if (poIdRef.current) poIdRef.current.value = '';
    if (vendorIdRef.current) vendorIdRef.current.value = '';
    if (vendorNameRef.current) vendorNameRef.current.value = '';
    if (dueRef.current) dueRef.current.value = '';
  };

  // === Import amount dari PO (OUTSTANDING + TAX dari PO) ===
const [importing, setImporting] = useState(false);

async function importAmountFromPO() {
  if (!selectedPO?.id) return;
  try {
    setImporting(true);
    const poId = Number(selectedPO.id);

    const [{ data: fin, error: finErr }, { data: hdr, error: hdrErr }] = await Promise.all([
      supabase.from('v_po_finance')
        .select('id,total,paid,outstanding')
        .eq('id', poId)
        .maybeSingle(),
      supabase.from('v_po_with_terms')
        .select('is_tax_included,tax_percent')
        .eq('id', poId)
        .maybeSingle(),
    ]);
    if (finErr || hdrErr || !fin || !hdr) throw new Error(finErr?.message || hdrErr?.message || 'Gagal ambil data PO');

    const grossTarget = Number(fin.outstanding ?? Math.max(Number(fin.total||0) - Number(fin.paid||0), 0));
    const taxPct = Number(hdr.tax_percent ?? 0);
    const taxIncluded = !!hdr.is_tax_included;

    let dpp = 0, ppn = 0, gross = Math.round(grossTarget);
    if (taxIncluded) {
      dpp = Math.round(gross / (1 + taxPct / 100));
      ppn = gross - dpp;
    } else {
      dpp = Math.round(gross);
      ppn = Math.round(dpp * (taxPct / 100));
      gross = dpp + ppn;
    }

    if (dppRef.current) dppRef.current.value = String(dpp);
    if (ppnRef.current) ppnRef.current.value = String(ppn);
    if (amountRef.current) amountRef.current.value = String(gross);
  } catch (e:any) {
    console.error(e);
    alert(e?.message || 'Gagal import amount dari PO');
  } finally {
    setImporting(false);
  }
}


  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await action(fd);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">New Payable</h1>
        <Link href="/payables" className="text-sm text-blue-600 hover:underline">
          ← Back to list
        </Link>
      </div>

      {!!selectedPO && (
        <div className="p-3 border rounded bg-amber-50 text-sm flex items-center justify-between gap-3">
          <div>
            From PO <b>{selectedPO.po_number ?? selectedPO.id}</b> • Vendor: <b>{vendorDisplay}</b>
          </div>
          <button
            type="button"
            onClick={clearPO}
            className="px-2 py-1 text-xs border rounded hover:bg-gray-50"
            title="Hapus pilihan PO"
          >
            Clear PO
          </button>
        </div>
      )}

      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2 max-w-4xl">
        {/* SOURCE */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-600">Source</label>
          {selectedPO ? (
            <>
              <input type="hidden" name="source" value="PT" />
              <div className="px-2 py-1 border rounded text-xs bg-gray-50">PT (from PO)</div>
            </>
          ) : (
            <select
              name="source"
              value={source}
              onChange={(e) => setSource(e.target.value as any)}
              className="border rounded px-2 py-1"
            >
              <option value="PT">PT (kena pajak)</option>
              <option value="RAB">RAB (non pajak)</option>
              <option value="Petty">Petty (non pajak)</option>
            </select>
          )}
          <p className="text-[11px] text-slate-500">Field pajak hanya muncul jika Source = PT.</p>
        </div>

        {/* PO PICKER + Clear + Import */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-600">PO (opsional)</label>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <ComboboxPO
                value={
                  selectedPO
                    ? {
                        id: selectedPO.id,
                        po_number: selectedPO.po_number ?? String(selectedPO.id),
                        vendor_id: selectedPO.vendor_id,
                        vendor_name: selectedPO.vendor_name ?? '—',
                        total: selectedPO.total,
                      }
                    : null
                }
                onChange={(item) => {
                  if (!item) {
                    clearPO();
                  } else {
                    setSelectedPO(item as AnyPO);
                  }
                }}
                placeholder="Cari PO…"
              />
            </div>
            {selectedPO && (
              <>
                <button
                  type="button"
                  onClick={clearPO}
                  className="px-2 py-1 text-xs border rounded hover:bg-gray-50"
                  title="Hapus pilihan PO"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={importAmountFromPO}
                  disabled={importing}
                  className="px-2 py-1 text-xs border rounded hover:bg-gray-50"
                  title="Import amount outstanding + pajak dari PO"
                >
                  {importing ? 'Importing…' : 'Import amount dari PO'}
                </button>
              </>
            )}
          </div>
          <input ref={poIdRef} type="hidden" name="po_id" />
        </div>

        {/* VENDOR */}
        {selectedPO ? (
          <>
            <input ref={vendorIdRef} type="hidden" name="vendor_id" />
            <input ref={vendorNameRef} type="hidden" name="vendor_name" />
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-xs text-slate-600">Vendor</label>
              <div className="px-2 py-1 border rounded bg-gray-50 text-sm">{vendorDisplay}</div>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-xs text-slate-600">Vendor *</label>
            <ComboboxVendor
              value={vendorOpt}
              onChange={(v: any) => {
                const picked: VendorOpt | null = v
                  ? { id: Number(v.id ?? v.value ?? v), name: String(v.name ?? v.label ?? v.text ?? '') }
                  : null;
                setVendorOpt(picked);
                if (vendorIdRef.current) vendorIdRef.current.value = picked ? String(picked.id) : '';
                if (vendorNameRef.current) vendorNameRef.current.value = picked ? picked.name : '';
              }}
              placeholder="Cari vendor…"
            />
            <input ref={vendorIdRef} type="hidden" name="vendor_id" required />
            <input ref={vendorNameRef} type="hidden" name="vendor_name" />
          </div>
        )}

        {/* INVOICE */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-600">Invoice No *</label>
          <input name="invoice_no" required className="border rounded px-2 py-1" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-600">Invoice Date *</label>
          <input ref={invDateRef} name="invoice_date" type="date" required className="border rounded px-2 py-1" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-600">Due Date</label>
          <input ref={dueRef} name="due_date" type="date" className="border rounded px-2 py-1" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-600">Term No</label>
            <input name="term_no" type="number" className="border rounded px-2 py-1" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-600">Term %</label>
            <input name="term_percent" type="number" step="0.01" className="border rounded px-2 py-1" />
          </div>
        </div>

        {/* KATEGORI */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-600">Category *</label>
          <ComboboxCategory
            value={catOpt}
            onChange={(c) => {
              setCatOpt(c);
              if (catIdRef.current) catIdRef.current.value = c ? String(c.id) : '';
              setSubOpt(null);
              if (subIdRef.current) subIdRef.current.value = '';
            }}
          />
          <input ref={catIdRef} type="hidden" name="category_id" required />
        </div>

        {/* SUBCATEGORY */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-600">Subcategory *</label>
          <ComboboxSubcategory
            categoryId={catOpt?.id}
            value={subOpt}
            onChange={(sc) => {
              setSubOpt(sc);
              if (subIdRef.current) subIdRef.current.value = sc ? String(sc.id) : '';
            }}
          />
          <input ref={subIdRef} type="hidden" name="subcategory_id" required />
        </div>

        {/* PAJAK (hanya PT) */}
        {isPT && (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-600">DPP</label>
              <input ref={dppRef} name="dpp_amount" inputMode="numeric" placeholder="contoh: 1000000" className="border rounded px-2 py-1" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-600">PPN 11%</label>
              <input ref={ppnRef} name="ppn_amount" inputMode="numeric" placeholder="contoh: 110000" className="border rounded px-2 py-1" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-600">No Seri FP</label>
              <input name="tax_invoice_no" className="border rounded px-2 py-1" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-600">Tanggal FP</label>
              <input name="tax_invoice_date" type="date" className="border rounded px-2 py-1" />
            </div>
          </>
        )}

        {/* GROSS */}
        <div className="flex flex-col gap-1 sm:col-span-2">
          <label className="text-xs text-slate-600">Gross Amount *</label>
          <input
            ref={amountRef}
            name="amount"
            inputMode="numeric"
            required
            placeholder={isPT ? 'DPP + PPN (PT)' : 'Total (non-PT)'}
            className="border rounded px-2 py-1"
          />
          <p className="text-[11px] text-slate-500">Server memastikan konsistensi (Gross = DPP + PPN bila PT).</p>
        </div>

        {/* NOTE */}
        <div className="flex flex-col gap-1 sm:col-span-2">
          <label className="text-xs text-slate-600">Notes</label>
          <textarea name="note" rows={3} className="border rounded px-2 py-1" />
        </div>

        <div className="sm:col-span-2 flex gap-3 pt-2">
          <button type="submit" className="px-4 py-2 rounded bg-black text-white">Create</button>
          <Link href="/payables" className="px-4 py-2 rounded border">Cancel</Link>
        </div>
      </form>
    </div>
  );
}

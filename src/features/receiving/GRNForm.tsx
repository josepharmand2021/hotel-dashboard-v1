'use client';

import { useEffect, useState } from 'react';
import { getPOWithItems, upsertGRNFromPO, upsertGRNNonPO } from '@/features/receiving/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import ComboboxVendor from '@/components/ComboboxVendor';
import ComboboxPO, { type POOpt } from '@/components/ComboboxPO';
import { supabase } from '@/lib/supabase/client';

type Mode = 'PO' | 'NON_PO';
type VendorOpt = { id: number; name: string };

// Fallback kalau PPOpt TIDAK diexport oleh ComboboxPO
// Hapus blok di bawah kalau import PPOpt di atas sudah ada.
// type PPOpt = { id: number; po_number: string; vendor_id: number; vendor_name?: string; date?: string | null };

function getVendorName(v: any): string {
  if (!v) return '';
  return Array.isArray(v) ? (v[0]?.name ?? '') : (v.name ?? '');
}

export default function GRNForm({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<Mode>('PO');

  // header
  const [grnNumber, setGrnNumber] = useState<string>(() => `GRN-${new Date().toISOString().slice(0,10)}`);
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0,10));
  const [vendor, setVendor] = useState<VendorOpt | null>(null);
  const [refNo, setRefNo] = useState<string>('');
  const [note, setNote] = useState<string>('');

  // PO
  const [poChoice, setPoChoice] = useState<POOpt | null>(null);                // ← pakai PPOpt
  const [purchaseOrderId, setPurchaseOrderId] = useState<number | undefined>();
  const [poItems, setPoItems] = useState<Array<{
    id:number; description:string|null; unit:string|null;
    qty_order:number; qty_matched:number; qty_remaining:number;
    qty_input:number;
  }>>([]);

  // Non-PO items
  type NPItem = { id: string; description:string; uom:string; qty_expected:number; qty_received:number|'' };
  const blankNP = (): NPItem => ({ id: crypto.randomUUID(), description:'', uom:'', qty_expected:1, qty_received:'' });
  const [npItems, setNPItems] = useState<NPItem[]>([blankNP()]);

  // ganti PO → kosongkan list & set id
  useEffect(() => {
    setPoItems([]);
    setPurchaseOrderId(poChoice?.id);
    // jika combobox sudah tahu vendor_id, kamu bisa langsung autofill vendor:
    if (poChoice?.vendor_id) setVendor({ id: poChoice.vendor_id, name: poChoice.vendor_name ?? '' });
  }, [poChoice?.id]); // sengaja tetap depend ke id; jangan lupa vendor sudah dihandle di loader juga

  // ketika pindah ke Non-PO, bersihkan state PO biar vendor bisa diedit bebas
  useEffect(() => {
    if (mode === 'NON_PO') {
      setPoChoice(null);
      setPurchaseOrderId(undefined);
      setPoItems([]);
      setNPItems(prev => (prev.length ? prev : [blankNP()]));
    }
  }, [mode]);

  const isPOAutofill = mode === 'PO' && !!purchaseOrderId;

  // ======= Loader PO =======
  useEffect(() => {
    if (!purchaseOrderId) { setPoItems([]); return; }
    (async () => {
      try {
        const resp: any = await getPOWithItems(purchaseOrderId);
        const lines = resp?.lines ?? [];

        const rows = lines.map((l: any) => ({
          id: Number(l.id),
          description: l.description ?? null,
          unit: l.unit ?? l.uom ?? null,
          qty_order: Number(l.qty_order ?? l.qty ?? 0),
          qty_matched: Number(l.qty_matched ?? 0),
          qty_remaining: Number(l.qty_remaining ?? Math.max(Number(l.qty_order ?? l.qty ?? 0) - Number(l.qty_matched ?? 0), 0)),
          qty_input: 0,
        }));
        setPoItems(rows);

        // autofill vendor dari response header atau fallback query
        const header = resp?.header;
        if (header?.vendor_id) {
          setVendor({ id: header.vendor_id, name: header.vendor_name ?? getVendorName(header.vendors) });
        } else {
          const { data: po } = await supabase
            .from('purchase_orders')
            .select('id, vendor_id, vendors(name)')
            .eq('id', purchaseOrderId)
            .single();
          if (po?.vendor_id) setVendor({ id: po.vendor_id, name: getVendorName(po.vendors) });
        }
        if (header?.note) setNote(header.note ?? '');
      } catch (e:any) {
        toast.error(e.message || 'Gagal load PO');
      }
    })();
  }, [purchaseOrderId]);

  async function onSubmit({ print = false }: { print?: boolean } = {}) {
    try {
      if (!grnNumber || !date || !vendor?.id) {
        toast.error('Lengkapi header: GRN No, Tanggal, Vendor');
        return;
      }

      if (mode === 'PO') {
        if (!purchaseOrderId) return toast.error('Pilih Purchase Order dulu');

        const items = poItems.map(r => ({
          po_item_id: r.id,
          description: r.description ?? null,
          uom: r.unit,
          qty_input: Number(r.qty_input || 0),
        }));

        await upsertGRNFromPO({
          grn_number: grnNumber,
          date_received: date,
          purchase_order_id: purchaseOrderId,
          vendor_id: vendor.id,
          vendor_name: vendor.name,
          ref_no: refNo || null,
          note: note || null,
          items,
        } as any);

        toast.success(print ? 'GRN disimpan & siap dicetak' : 'GRN disimpan');
        onClose();
      } else {
        const items = npItems
          .filter(r => r.description.trim() && Number(r.qty_expected) > 0)
          .map(r => ({
            description: r.description.trim(),
            uom: r.uom || null,
            qty_input: r.qty_received === '' ? 0 : Number(r.qty_received),
          }));

        if (!items.length) return toast.error('Minimal 1 item Non-PO dengan deskripsi & Qty Expected > 0');

        await upsertGRNNonPO({
          grn_number: grnNumber,
          date_received: date,
          vendor_id: vendor.id,
          vendor_name: vendor.name,
          ref_no: refNo || null,
          note: note || null,
          items,
        } as any);

        toast.success(print ? 'GRN disimpan & siap dicetak' : 'GRN disimpan');
        onClose();
      }
    } catch (e:any) {
      toast.error(e.message || 'Gagal menyimpan GRN');
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="w-[92vw] sm:max-w-none md:w-[1000px] lg:w-[1100px] max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader><DialogTitle>Buat GRN</DialogTitle></DialogHeader>

        {/* Mode */}
        <div className="flex gap-2">
          <Button variant={mode==='PO'?'default':'outline'} onClick={()=>setMode('PO')}>Dari PO</Button>
          <Button variant={mode==='NON_PO'?'default':'outline'} onClick={()=>setMode('NON_PO')}>Non-PO</Button>
        </div>

        {/* Header */}
        <div className="grid md:grid-cols-4 gap-3">
          <div>
            <div className="text-xs mb-1">GRN Number</div>
            <Input value={grnNumber} onChange={e=>setGrnNumber(e.target.value)} />
          </div>
          <div>
            <div className="text-xs mb-1">Tanggal</div>
            <Input type="date" value={date} onChange={e=>setDate(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <div className="text-xs mb-1">Vendor</div>
            <div className={isPOAutofill ? 'pointer-events-none opacity-70' : ''}>
              <ComboboxVendor
                value={vendor}
                onChange={(opt) => setVendor(opt)}
                placeholder="Pilih / tambah vendor"
              />
            </div>
            <div className="text-[10px] mt-1 text-muted-foreground">
              {isPOAutofill ? 'Vendor diambil dari Purchase Order.' : 'Ketik untuk mencari, atau tambah vendor jika tidak ditemukan.'}
            </div>
          </div>

          <div>
            <div className="text-xs mb-1">Ref No (Surat Jalan)</div>
            <Input value={refNo} onChange={e=>setRefNo(e.target.value)} readOnly={isPOAutofill} />
          </div>
          <div className="md:col-span-3">
            <div className="text-xs mb-1">Catatan</div>
            <Input value={note} onChange={e=>setNote(e.target.value)} />
          </div>
        </div>

        {/* Body */}
        {mode === 'PO' ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <div className="w-full md:w-2/3">
                <div className="text-xs mb-1">Purchase Order</div>
                <ComboboxPO
                  value={poChoice}
                  onChange={(opt) => setPoChoice(opt)}
                  placeholder="Pilih PO (cari nomor/vendor)"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPoItems(prev => prev.map(r => ({ ...r, qty_input: r.qty_remaining })))}
                className="mt-6"
              >
                Prefill Qty = Remaining
              </Button>
            </div>

            <div className="mt-3 border rounded-md overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left">Deskripsi</th>
                    <th className="px-3 py-2 text-left">Unit</th>
                    <th className="px-3 py-2 text-right">Ordered</th>
                    <th className="px-3 py-2 text-right">Matched</th>
                    <th className="px-3 py-2 text-right">Remaining (Expected)</th>
                    <th className="px-3 py-2 text-right">Qty Received (input)</th>
                  </tr>
                </thead>
                <tbody key={purchaseOrderId /* force remount saat ganti PO */}>
                  {poItems.length === 0 ? (
                    <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">Pilih PO untuk menampilkan item</td></tr>
                  ) : poItems.map((r, idx) => (
                    <tr key={`${r.id}-${purchaseOrderId}`} className="border-t">
                      <td className="px-3 py-2">{r.description ?? '—'}</td>
                      <td className="px-3 py-2">{r.unit ?? '—'}</td>
                      <td className="px-3 py-2 text-right">{r.qty_order}</td>
                      <td className="px-3 py-2 text-right">{r.qty_matched}</td>
                      <td className="px-3 py-2 text-right">{r.qty_remaining}</td>
                      <td className="px-3 py-2 text-right">
                        <Input
                          type="number"
                          inputMode="decimal"
                          placeholder="0"
                          value={String(r.qty_input ?? 0)}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPoItems(prev =>
                              prev.map((x,i) => i===idx ? { ...x, qty_input: Number(val || 0) } : x)
                            );
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="mt-3 border rounded-md p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium">Items (Non-PO)</div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNPItems(prev => [...prev, blankNP()])}
                >
                  + Tambah Item
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNPItems(prev => prev.map(r => ({ ...r, qty_received: r.qty_expected })))}
                >
                  Prefill Received = Expected
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNPItems(prev => prev.map(r => ({ ...r, qty_received: '' })))}
                >
                  Kosongkan Received
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left">Description</th>
                    <th className="px-3 py-2 text-left">UOM</th>
                    <th className="px-3 py-2 text-right">Qty Expected</th>
                    <th className="px-3 py-2 text-right">Qty Received (optional)</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {npItems.length === 0 ? (
                    <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Belum ada item Non-PO</td></tr>
                  ) : npItems.map((r, idx) => (
                    <tr key={r.id} className="border-t">
                      <td className="px-3 py-2">
                        <Input
                          placeholder="Tulis deskripsi item"
                          value={r.description}
                          onChange={(e)=> setNPItems(prev => prev.map((x,i)=> i===idx ? { ...x, description: e.target.value } : x))}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          placeholder="Unit"
                          value={r.uom}
                          onChange={(e)=> setNPItems(prev => prev.map((x,i)=> i===idx ? { ...x, uom: e.target.value } : x))}
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Input
                          type="number"
                          inputMode="decimal"
                          value={String(r.qty_expected)}
                          onChange={(e)=> {
                            const v = Number(e.target.value || 0);
                            setNPItems(prev => prev.map((x,i)=> i===idx ? { ...x, qty_expected: v < 0 ? 0 : v } : x));
                          }}
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Input
                          type="number"
                          inputMode="decimal"
                          placeholder="0"
                          value={r.qty_received === '' ? '' : String(r.qty_received)}
                          onChange={(e)=> {
                            const raw = e.target.value;
                            setNPItems(prev => prev.map((x,i)=> i===idx ? { ...x, qty_received: raw === '' ? '' : Math.max(Number(raw), 0) } : x));
                          }}
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={()=> setNPItems(prev => prev.filter((_,i)=> i!==idx))}
                          disabled={npItems.length === 1}
                        >
                          Hapus
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button variant="secondary" onClick={()=>onSubmit({ print: false })}>Simpan (Draft)</Button>
          <Button onClick={()=>onSubmit({ print: true })}>Simpan & Cetak</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

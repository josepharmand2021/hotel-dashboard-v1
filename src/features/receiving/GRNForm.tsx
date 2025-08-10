'use client';
import { useEffect, useState } from 'react';
import { getPOWithItems, upsertGRNFromPO, upsertGRNNonPO } from '@/features/receiving/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import ComboboxVendor from '@/components/ComboboxVendor';
import ComboboxPO from '@/components/ComboboxPO';
import { supabase } from '@/lib/supabase/client';

type Mode = 'PO' | 'NON_PO';
type VendorOpt = { id: number; name: string };
type POChoice = { id:number; po_number:string; vendor_name:string; date?:string|null };

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
  const [poChoice, setPoChoice] = useState<POChoice | null>(null);
  const [purchaseOrderId, setPurchaseOrderId] = useState<number | undefined>();
  const [poItems, setPoItems] = useState<Array<{
    id:number; description:string|null; unit:string|null;
    qty_order:number; qty_matched:number; qty_remaining:number; qty_input:number
  }>>([]);

  // Non-PO items
  type NPItem = { description:string; uom:string|null; qty_expected:number; qty_received:number|'' };
  const [npItems, setNPItems] = useState<NPItem[]>([
    { description:'', uom:'', qty_expected:1, qty_received:'' }
  ]);

  // pilih PO dari combobox
  useEffect(() => {
    setPurchaseOrderId(poChoice?.id);
  }, [poChoice?.id]);

  const isPOAutofill = mode === 'PO' && !!purchaseOrderId;

  useEffect(() => {
    if (!purchaseOrderId) { setPoItems([]); return; }
    (async () => {
      try {
        const resp: any = await getPOWithItems(purchaseOrderId);
        const lines = resp?.lines ?? resp ?? [];
        setPoItems(lines.map((l:any) => ({
          ...l,
          unit: l.unit ?? l.uom ?? null,
          qty_input: l.qty_remaining,
        })));

        const header = resp?.header;
        if (header?.vendor_id) {
          setVendor({ id: header.vendor_id, name: header.vendor_name ?? getVendorName(header.vendors) });
        } else {
          // fallback langsung ke DB (jaga-jaga kalau API belum kirim header)
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
          uom: r.unit,                            // kirim ke backend sebagai uom
          qty_input: Number(r.qty_input || 0),    // API terima qty_input
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
          // status diset di server / sesuai kebutuhanmu
        } as any);

        toast.success(print ? 'GRN disimpan & siap dicetak' : 'GRN disimpan');
        onClose();
      } else {
        const items = npItems
          .filter(r => r.description.trim() && Number(r.qty_expected) > 0)
          .map(r => ({
            description: r.description.trim(),
            uom: r.uom || null,
            qty_input: r.qty_received === '' ? 0 : Number(r.qty_received), // simpan yang diinput
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
          <div>
            <div className="text-xs mb-1">Catatan</div>
            <Input value={note} onChange={e=>setNote(e.target.value)} />
          </div>
        </div>

        {/* Body */}
        {mode === 'PO' ? (
          <>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <div className="text-xs mb-1">Purchase Order</div>
                <ComboboxPO
                  value={poChoice}
                  onChange={(opt) => setPoChoice(opt)}
                  placeholder="Pilih PO (cari nomor/vendor)"
                />
              </div>
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
                <tbody>
                  {poItems.length === 0 ? (
                    <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">Pilih PO untuk menampilkan item</td></tr>
                  ) : poItems.map((r, idx) => (
                    <tr key={r.id} className="border-t">
                      <td className="px-3 py-2">{r.description ?? '—'}</td>
                      <td className="px-3 py-2">{r.unit ?? '—'}</td>
                      <td className="px-3 py-2 text-right">{r.qty_order}</td>
                      <td className="px-3 py-2 text-right">{r.qty_matched}</td>
                      <td className="px-3 py-2 text-right">{r.qty_remaining}</td>
                      <td className="px-3 py-2 text-right">
                        <Input
                          type="number"
                          inputMode="decimal"
                          placeholder="0 (boleh kosong)"
                          value={String(r.qty_input ?? '')}
                          onChange={(e)=>setPoItems(prev => prev.map((x,i)=> i===idx ? { ...x, qty_input: Number(e.target.value) } : x))}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="mt-3 border rounded-md overflow-x-auto">
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
                {npItems.map((it, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="px-3 py-2">
                      <Input
                        value={it.description}
                        onChange={e=>setNPItems(p=>p.map((x,i)=> i===idx?{...x, description:e.target.value}:x))}
                        placeholder="Nama barang/jasa..."
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        value={it.uom ?? ''}
                        onChange={e=>setNPItems(p=>p.map((x,i)=> i===idx?{...x, uom:e.target.value}:x))}
                        placeholder="pcs / box / unit"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Input
                        type="number"
                        inputMode="decimal"
                        value={String(it.qty_expected ?? '')}
                        onChange={e=>setNPItems(p=>p.map((x,i)=> i===idx?{...x, qty_expected:Number(e.target.value || 0)}:x))}
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Input
                        type="number"
                        inputMode="decimal"
                        placeholder="0 (boleh kosong)"
                        value={it.qty_received === '' ? '' : String(it.qty_received)}
                        onChange={e=>{
                          const val = e.target.value;
                          setNPItems(p=>p.map((x,i)=> i===idx?{...x, qty_received: val==='' ? '' : Number(val)}:x));
                        }}
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button variant="destructive" size="sm" onClick={()=>setNPItems(p=>p.filter((_,i)=>i!==idx))}>Hapus</Button>
                    </td>
                  </tr>
                ))}
                <tr className="border-t">
                  <td className="px-3 py-2" colSpan={5}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={()=>setNPItems(p=>[...p, { description:'', uom:'', qty_expected:1, qty_received:'' }])}
                    >
                      + Tambah Item
                    </Button>
                  </td>
                </tr>
              </tbody>
            </table>
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

'use client';
import { useEffect, useMemo, useState } from 'react';
import { getPOWithItems, upsertGRNFromPO, upsertGRNNonPO } from '@/features/receiving/api';
import { supabase } from '@/lib/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

type Opt = { id: number; name: string };
type Mode = 'PO' | 'NON_PO';

export default function GRNForm({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<Mode>('PO');

  // header
  const [grnNumber, setGrnNumber] = useState<string>(() => `GRN-${new Date().toISOString().slice(0,10)}`);
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0,10));
  const [vendorId, setVendorId] = useState<number | undefined>();
  const [vendorName, setVendorName] = useState<string>('');
  const [refNo, setRefNo] = useState<string>('');
  const [note, setNote] = useState<string>('');

  // masters
  const [vendors, setVendors] = useState<Opt[]>([]);

  // PO
  const [purchaseOrderId, setPurchaseOrderId] = useState<number | undefined>();
  const [poItems, setPoItems] = useState<Array<{ id:number; description:string|null; uom:string|null; qty_order:number; qty_matched:number; qty_remaining:number; qty_input:number }>>([]);

  // Non-PO items
  const [npItems, setNPItems] = useState<Array<{ description:string; uom:string|null; qty_input:number }>>([{ description:'', uom:'', qty_input:1 }]);

  useEffect(() => {
    (async () => {
      const v = await supabase.from('vendors').select('id,name').order('name');
      if (!v.error) setVendors((v.data ?? []) as any);
    })();
  }, []);

  useEffect(() => {
    if (!purchaseOrderId) { setPoItems([]); return; }
    (async () => {
      try {
        const { lines } = await getPOWithItems(purchaseOrderId);
        setPoItems(lines.map(l => ({ ...l, qty_input: l.qty_remaining })));
      } catch (e:any) {
        toast.error(e.message || 'Gagal load PO items');
      }
    })();
  }, [purchaseOrderId]);

  async function onSubmit() {
    try {
      if (!grnNumber || !date || !vendorId) {
        toast.error('Lengkapi header: GRN No, Tanggal, Vendor');
        return;
      }
      if (mode === 'PO') {
        if (!purchaseOrderId) return toast.error('Pilih Purchase Order dulu');
        const items = poItems.filter(r => Number(r.qty_input) > 0)
          .map(r => ({ po_item_id: r.id, uom: r.uom, qty_input: Number(r.qty_input || 0), description: r.description ?? null }));
        if (!items.length) return toast.error('Minimal 1 item dengan qty > 0');

        await upsertGRNFromPO({
          grn_number: grnNumber,
          date_received: date,
          purchase_order_id: purchaseOrderId,
          vendor_id: vendorId!,
          vendor_name: vendorName || null,
          ref_no: refNo || null,
          note: note || null,
          items,
        });
      } else {
        const items = npItems.filter(r => Number(r.qty_input) > 0 && r.description.trim())
          .map(r => ({ description: r.description.trim(), uom: r.uom || null, qty_input: Number(r.qty_input || 0) }));
        if (!items.length) return toast.error('Minimal 1 item Non-PO dengan deskripsi & qty > 0');

        await upsertGRNNonPO({
          grn_number: grnNumber,
          date_received: date,
          vendor_id: vendorId!,
          vendor_name: vendorName || null,
          ref_no: refNo || null,
          note: note || null,
          items,
        });
      }
      toast.success('GRN disimpan');
      onClose();
    } catch (e:any) {
      toast.error(e.message || 'Gagal menyimpan GRN');
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader><DialogTitle>Buat GRN</DialogTitle></DialogHeader>

        {/* Mode */}
        <div className="flex gap-2">
          <Button variant={mode==='PO'?'default':'outline'} onClick={()=>setMode('PO')}>Dari PO</Button>
          <Button variant={mode==='NON_PO'?'default':'outline'} onClick={()=>setMode('NON_PO')}>Non-PO</Button>
        </div>

        {/* Header */}
        <div className="grid md:grid-cols-4 gap-3">
          <div><div className="text-xs mb-1">GRN Number</div><Input value={grnNumber} onChange={e=>setGrnNumber(e.target.value)} /></div>
          <div><div className="text-xs mb-1">Tanggal</div><Input type="date" value={date} onChange={e=>setDate(e.target.value)} /></div>
          <div className="md:col-span-2">
            <div className="text-xs mb-1">Vendor</div>
            <Select value={vendorId?String(vendorId):''} onValueChange={(v)=>setVendorId(Number(v))}>
              <SelectTrigger><SelectValue placeholder="Pilih vendor" /></SelectTrigger>
              <SelectContent>{vendors.map(v => <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><div className="text-xs mb-1">Ref No (Surat Jalan)</div><Input value={refNo} onChange={e=>setRefNo(e.target.value)} /></div>
          <div><div className="text-xs mb-1">Catatan</div><Input value={note} onChange={e=>setNote(e.target.value)} /></div>
        </div>

        {/* Body */}
        {mode === 'PO' ? (
          <>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <div className="text-xs mb-1">Purchase Order ID</div>
                <Input value={purchaseOrderId??''} onChange={e=>setPurchaseOrderId(Number(e.target.value)||undefined)} placeholder="Masukkan ID PO" />
              </div>
            </div>

            <div className="mt-3 border rounded-md overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left">Deskripsi</th>
                    <th className="px-3 py-2 text-left">UOM</th>
                    <th className="px-3 py-2 text-right">Ordered</th>
                    <th className="px-3 py-2 text-right">Matched</th>
                    <th className="px-3 py-2 text-right">Remaining</th>
                    <th className="px-3 py-2 text-right">Qty Received (input)</th>
                  </tr>
                </thead>
                <tbody>
                  {poItems.length === 0 ? (
                    <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">Pilih PO untuk menampilkan item</td></tr>
                  ) : poItems.map((r, idx) => (
                    <tr key={r.id} className="border-t">
                      <td className="px-3 py-2">{r.description ?? '—'}</td>
                      <td className="px-3 py-2">{r.uom ?? '—'}</td>
                      <td className="px-3 py-2 text-right">{r.qty_order}</td>
                      <td className="px-3 py-2 text-right">{r.qty_matched}</td>
                      <td className="px-3 py-2 text-right">{r.qty_remaining}</td>
                      <td className="px-3 py-2 text-right">
                        <Input type="number" inputMode="decimal" value={String(r.qty_input ?? '')}
                          onChange={(e)=>setPoItems(prev => prev.map((x,i)=> i===idx ? { ...x, qty_input: Number(e.target.value) } : x))} />
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
                  <th className="px-3 py-2 text-right">Qty Received</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {npItems.map((it, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="px-3 py-2"><Input value={it.description} onChange={e=>setNPItems(p=>p.map((x,i)=> i===idx?{...x, description:e.target.value}:x))} placeholder="Nama barang/jasa..." /></td>
                    <td className="px-3 py-2"><Input value={it.uom ?? ''} onChange={e=>setNPItems(p=>p.map((x,i)=> i===idx?{...x, uom:e.target.value}:x))} placeholder="pcs / box / unit" /></td>
                    <td className="px-3 py-2 text-right"><Input type="number" inputMode="decimal" value={String(it.qty_input ?? '')}
                      onChange={e=>setNPItems(p=>p.map((x,i)=> i===idx?{...x, qty_input:Number(e.target.value)}:x))} /></td>
                    <td className="px-3 py-2 text-right">
                      <Button variant="destructive" size="sm" onClick={()=>setNPItems(p=>p.filter((_,i)=>i!==idx))}>Hapus</Button>
                    </td>
                  </tr>
                ))}
                <tr className="border-t">
                  <td className="px-3 py-2" colSpan={4}>
                    <Button variant="outline" size="sm" onClick={()=>setNPItems(p=>[...p, { description:'', uom:'', qty_input:1 }])}>+ Tambah Item</Button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={onSubmit}>Simpan</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

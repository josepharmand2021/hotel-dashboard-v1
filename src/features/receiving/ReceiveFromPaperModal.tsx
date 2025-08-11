'use client';
import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { getGRNHeader, getGRNItemsWithPO, savePhysicalReceive, postGRN } from '@/features/receiving/api';

type ItemRow = {
  id: number;
  description: string | null;
  uom: string | null;
  po_qty: number;
  qty_input: number;       // input yang disimpan admin
  note: string;
};

export default function ReceiveFromPaperModal({
  grnId, onClose, onSaved,
}: { grnId:number; onClose: () => void; onSaved?: () => void }) {
  const [header, setHeader] = useState<any>(null);
  const [items, setItems]   = useState<ItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refNo, setRefNo] = useState<string>('');

  const fmt = useMemo(()=>new Intl.NumberFormat('id-ID'), []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const h = await getGRNHeader(grnId);
        const its = await getGRNItemsWithPO(grnId);
        setHeader(h);
        setRefNo(h?.ref_no ?? '');
        setItems(
          its.map((r:any)=>({
            id: r.id,
            description: r.description ?? null,
            uom: r.uom ?? null,
            po_qty: Number(r.po_qty || r.qty_po || 0),
            qty_input: Number(r.qty_input ?? 0),
            note: r.note ?? '',
          }))
        );
      } catch (e:any) {
        toast.error(e.message || 'Gagal memuat data GRN');
      } finally {
        setLoading(false);
      }
    })();
  }, [grnId]);

  async function onSave() {
    try {
      setSaving(true);
      // 1) Simpan hasil form (qty_input + note + ref no)
      await savePhysicalReceive({
        grn_id: grnId,
        ref_no: refNo,
        items: items.map(i => ({
          id: i.id,
          qty_input: Number(i.qty_input || 0),
          note: i.note,
        })),
      });

      // 2) Coba POST (ubah status ke posted hanya jika qty matched)
      try {
        await postGRN(grnId);
        toast.success('Disimpan & status diubah ke POSTED');
      } catch (err:any) {
        // Form tetap tersimpan, tapi belum bisa POST (biasanya karena overage)
        toast.warning(err?.message
          ? `Disimpan, tapi belum bisa POST: ${err.message}`
          : 'Disimpan, tapi belum bisa POST: pastikan qty tidak melebihi sisa PO.');
      }

      onSaved?.();
      onClose();
    } catch (e:any) {
      toast.error(e.message || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="w-[92vw] sm:max-w-none md:w-[1000px] max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle>Input Hasil Form — {header?.grn_number ?? ''}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="text-sm text-muted-foreground">Memuat…</div>
        ) : (
          <>
            {/* Header ringkas */}
            <div className="grid md:grid-cols-3 gap-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Vendor</div>
                <div className="font-medium">{header?.vendor_name || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">PO No</div>
                <div className="font-medium">{header?.purchase_orders?.po_number || '—'}</div>
              </div>
              <div>
                <div className="text-xs mb-1">Ref No (SJ)</div>
                <Input value={refNo} onChange={(e)=>setRefNo(e.target.value)} placeholder="Tulis nomor surat jalan" />
              </div>
            </div>

            {/* Items */}
            <div className="mt-4 border rounded-md overflow-x-auto">
              <div className="flex items-center justify-between p-3">
                <div className="text-sm font-medium">Item</div>
                <div className="flex gap-2">
                  <Button
                    variant="outline" size="sm"
                    onClick={()=>setItems(prev=>prev.map(r=>({...r, qty_input: r.po_qty})))}
                  >
                    Prefill = PO Qty
                  </Button>
                  <Button
                    variant="outline" size="sm"
                    onClick={()=>setItems(prev=>prev.map(r=>({...r, qty_input: 0, note: ''})))}
                  >
                    Kosongkan
                  </Button>
                </div>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left">Deskripsi</th>
                    <th className="px-3 py-2 text-left">UOM</th>
                    <th className="px-3 py-2 text-right">PO Qty</th>
                    <th className="px-3 py-2 text-right w-40">Diterima (Fisik)</th>
                    <th className="px-3 py-2 text-left w-[35%]">Catatan</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length===0 ? (
                    <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Tidak ada item.</td></tr>
                  ) : items.map((r, idx)=>(
                    <tr key={r.id} className="border-t">
                      <td className="px-3 py-2">{r.description || '—'}</td>
                      <td className="px-3 py-2">{r.uom || '—'}</td>
                      <td className="px-3 py-2 text-right">{fmt.format(r.po_qty)}</td>
                      <td className="px-3 py-2 text-right">
                        <Input
                          className="text-right"
                          type="number"
                          inputMode="decimal"
                          min={0}
                          value={String(r.qty_input ?? 0)}
                          onChange={(e)=>{
                            const v = e.target.value;
                            setItems(prev => prev.map((x,i)=> i===idx ? { ...x, qty_input: Number(v || 0) } : x));
                          }}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          placeholder="Catatan per item (optional)"
                          value={r.note}
                          onChange={(e)=>{
                            const v = e.target.value;
                            setItems(prev => prev.map((x,i)=> i===idx ? { ...x, note: v } : x));
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
                {items.length>0 && (
                  <tfoot>
                    <tr className="border-t font-semibold">
                      <td className="px-3 py-2 text-right" colSpan={2}>Total</td>
                      <td className="px-3 py-2 text-right">
                        {fmt.format(items.reduce((a,r)=>a+(r.po_qty||0),0))}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {fmt.format(items.reduce((a,r)=>a+(r.qty_input||0),0))}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose} disabled={saving}>Batal</Button>
              <Button onClick={onSave} disabled={saving}>
                {saving ? 'Menyimpan…' : 'Simpan'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

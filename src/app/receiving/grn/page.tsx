'use client';
import { Fragment, useEffect, useState } from 'react';
import { listGRN, deleteGRN, getGRNItems } from '@/features/receiving/api';
import GRNForm from '@/features/receiving/GRNForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import ReceiveFromPaperModal from '@/features/receiving/ReceiveFromPaperModal';
// ⬇️ Tambahan
import { Badge } from '@/components/ui/badge';



type GRNItemRow = {
  id: number;
  description?: string | null;
  uom?: string | null;
  qty_po?: number | null;
  order_qty?: number | null;
  qty?: number | null;
  qty_received?: number | null;
  received_qty?: number | null;
  total_received_qty?: number | null;
  qty_overage?: number | null;
  overage_qty?: number | null;
};

export default function GRNListPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [itemsMap, setItemsMap] = useState<Record<number, GRNItemRow[]>>({});
  const [loadingItems, setLoadingItems] = useState<Record<number, boolean>>({});
  const [receiveForId, setReceiveForId] = useState<number|null>(null);


  const fmt = new Intl.NumberFormat('id-ID');
  const COLS = 7; // kolom tabel utama (tanpa qty)

  async function load() {
    setLoading(true);
    try {
      const { rows } = await listGRN({ q, pageSize: 50 });
      setRows(rows);
    } catch (e: any) {
      toast.error(e.message || 'Gagal memuat GRN');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [q]);

  async function toggleExpand(id: number) {
    setExpandedId(prev => (prev === id ? null : id));
    if (!itemsMap[id]) {
      setLoadingItems(prev => ({ ...prev, [id]: true }));
      try {
        const items = await getGRNItems(id);
        setItemsMap(prev => ({ ...prev, [id]: items || [] }));
      } catch (e: any) {
        toast.error(e.message || 'Gagal memuat item GRN');
      } finally {
        setLoadingItems(prev => ({ ...prev, [id]: false }));
      }
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Goods Receipt Notes</h1>
          <p className="text-sm text-muted-foreground">
            Status default: draft • Overage otomatis dihitung (ditampilkan di detail item)
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>+ Buat GRN</Button>
      </div>

      <div className="flex items-center gap-2">
        <Input
          value={q}
          onChange={(e)=>setQ(e.target.value)}
          placeholder="Cari GRN no / vendor / ref no..."
          className="w-80"
        />
      </div>

      <div className="border rounded-md overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-3 py-2 text-left">GRN No</th>
              <th className="px-3 py-2 text-left">Date</th>
              <th className="px-3 py-2 text-left">PO</th>
              <th className="px-3 py-2 text-left">Vendor</th>
              <th className="px-3 py-2 text-left">Ref No</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={COLS} className="px-3 py-8 text-center text-muted-foreground">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={COLS} className="px-3 py-8 text-center text-muted-foreground">Belum ada GRN</td></tr>
            ) : rows.map((r) => {
              const vendorLabel = r.vendor_name ?? r.vendor ?? r.vendor_id ?? '—';
              const isExpanded = expandedId === r.id;

              return (
                <Fragment key={r.id}>
                  <tr className="border-t">
                    <td className="px-3 py-2">{r.grn_number ?? r.grn_no}</td>
                    <td className="px-3 py-2">{r.date_received ?? r.grn_date}</td>
                    <td className="px-3 py-2">{r.po_number ?? '—'}</td>
                    <td className="px-3 py-2">{vendorLabel}</td>
                    <td className="px-3 py-2">{r.ref_no ?? '—'}</td>
                    <td className="px-3 py-2">
                      {(() => {
                        const s = String(r.status || '').toLowerCase();
                        const variant =
                          s === 'posted' ? 'default' :
                          s === 'received' ? 'default' :
                          s === 'void' ? 'destructive' :
                          'secondary';
                        return <Badge variant={variant}>{s || 'draft'}</Badge>;
                      })()}
                    </td>
               
                    <td className="px-3 py-2 text-right space-x-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => toggleExpand(r.id)}
                      >
                        {isExpanded ? 'Tutup Detail' : 'Lihat Item'}
                      </Button>
  
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`/receiving/grn/${r.id}/print`, '_blank')}
                      >
                        Print
                      </Button>
                      
                      {String(r.status).toLowerCase() === 'draft' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setReceiveForId(r.id)}
                        >
                          Post
                        </Button>
                      )}

                      {receiveForId && (
                        <ReceiveFromPaperModal
                          grnId={receiveForId}
                          onClose={() => setReceiveForId(null)}
                          onSaved={() => load()}
                        />
                      )}
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={async ()=>{
                          if (!confirm('Hapus GRN ini?')) return;
                          try { await deleteGRN(r.id); toast.success('GRN dihapus'); load(); }
                          catch (e:any) { toast.error(e.message); }
                        }}
                      >
                        Hapus
                      </Button>
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr>
                      <td colSpan={COLS} className="px-3 py-3 bg-muted/20">
                        {loadingItems[r.id] ? (
                          <div className="text-sm text-muted-foreground">Memuat item…</div>
                        ) : (itemsMap[r.id]?.length || 0) === 0 ? (
                          <div className="text-sm text-muted-foreground">Tidak ada item untuk GRN ini.</div>
                        ) : (
                          <div className="rounded-md border bg-background">
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead className="bg-muted/50">
                                  <tr>
                                    <th className="px-3 py-2 text-left">Description</th>
                                    <th className="px-3 py-2 text-left">UOM</th>
                                    <th className="px-3 py-2 text-right">PO Qty</th>
                                    <th className="px-3 py-2 text-right">Received Qty</th>
                                    <th className="px-3 py-2 text-right">Overage Qty</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {itemsMap[r.id]!.map((it, idx) => {
                                    const poQ = Number(it.qty_po ?? it.order_qty ?? it.qty ?? 0);
                                    const recQ = Number(it.qty_received ?? it.received_qty ?? it.total_received_qty ?? 0);
                                    const ovQ  = Number(it.qty_overage ?? it.overage_qty ?? Math.max(recQ - poQ, 0));
                                    return (
                                      <tr key={it.id ?? idx} className="border-t">
                                        <td className="px-3 py-2">{it.description || `Item ${idx + 1}`}</td>
                                        <td className="px-3 py-2">{it.uom || '—'}</td>
                                        <td className="px-3 py-2 text-right">{fmt.format(poQ)}</td>
                                        <td className="px-3 py-2 text-right">{fmt.format(recQ)}</td>
                                        <td className="px-3 py-2 text-right">{fmt.format(ovQ)}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {open && <GRNForm onClose={()=>{ setOpen(false); load(); }} />}
    </div>
  );
}

'use client';
import { useEffect, useMemo, useState } from 'react';
import { listGRN, deleteGRN } from '@/features/receiving/api';
import GRNForm from '@/features/receiving/GRNForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function GRNListPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { rows } = await listGRN({ q, pageSize: 50 });
      setRows(rows);
    } catch (e:any) {
      toast.error(e.message || 'Gagal memuat GRN');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [q]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Goods Receipt Notes</h1>
          <p className="text-sm text-muted-foreground">Status default: draft • Overage otomatis dihitung</p>
        </div>
        <Button onClick={() => setOpen(true)}>+ Buat GRN</Button>
      </div>

      <div className="flex items-center gap-2">
        <Input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Cari GRN no / vendor / ref no..." className="w-80" />
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
              <th className="px-3 py-2 text-right">Overage Qty</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">Belum ada GRN</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">{r.grn_number}</td>
                <td className="px-3 py-2">{r.date_received}</td>
                <td className="px-3 py-2">{r.purchase_order_id ?? '—'}</td>
                <td className="px-3 py-2">{r.vendor_name ?? r.vendor_id}</td>
                <td className="px-3 py-2">{r.ref_no ?? '—'}</td>
                <td className="px-3 py-2">{r.status}</td>
                <td className="px-3 py-2 text-right">{(r.overage_qty ?? 0).toLocaleString('id-ID')}</td>
                <td className="px-3 py-2 text-right">
                  <Button variant="destructive" size="sm" onClick={async ()=>{
                    if (!confirm('Hapus GRN ini?')) return;
                    try { await deleteGRN(r.id); toast.success('GRN dihapus'); load(); }
                    catch (e:any) { toast.error(e.message); }
                  }}>Hapus</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && <GRNForm onClose={()=>{ setOpen(false); load(); }} />}
    </div>
  );
}

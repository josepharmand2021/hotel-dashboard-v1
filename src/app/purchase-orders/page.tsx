'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import {
  listPurchaseOrders,
  updatePurchaseOrderStatus,
  deletePurchaseOrder,
} from '@/features/purchase-orders/api.client';
import { Pencil, Trash2 } from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

type Row = {
  id: number;
  po_number: string;
  vendor_name: string;
  po_date: string | null;
  delivery_date: string | null;
  due_date: string | null;         // from view (effective due)
  total: number | null;            // total_amount from view
  is_tax_included: boolean;
  tax_percent: number | null;
  status: 'draft' | 'sent' | 'delivered' | 'cancelled' | string;
  term_code?: 'CBD'|'COD'|'NET'|null;
  term_days?: number | null;
};

const fmtID = new Intl.NumberFormat('id-ID');

function StatusBadge({ status }: { status: Row['status'] }) {
  switch ((status || '').toLowerCase()) {
    case 'approved': return <Badge variant="secondary">Approved</Badge>;
    case 'completed': return <Badge>Completed</Badge>;
    case 'cancelled': return <Badge variant="destructive">Cancelled</Badge>;
    case 'sent': return <Badge variant="secondary">Sent</Badge>;
    case 'delivered': return <Badge>Delivered</Badge>;
    case 'draft':
    default: return <Badge variant="outline">Draft</Badge>;
  }
}

function StatusSelect({
  id, value, onChanged,
}: { id: number; value: Row['status']; onChanged?: (next: Row['status']) => void }) {
  const [current, setCurrent] = useState<Row['status']>(value);
  const [saving, setSaving] = useState(false);
  const handleChange = async (next: Row['status']) => {
    if (next === current) return;
    const prev = current;
    setCurrent(next);
    setSaving(true);
    try {
      await updatePurchaseOrderStatus(id, next);
      toast.success('Status updated');
      onChanged?.(next);
    } catch (e: any) {
      setCurrent(prev);
      toast.error(e?.message || 'Failed to update status');
    } finally {
      setSaving(false);
    }
  };
  return (
    <Select value={String(current)} onValueChange={(v) => handleChange(v as Row['status'])} disabled={saving}>
      <SelectTrigger className="h-8 w-28 whitespace-nowrap shrink-0"><SelectValue /></SelectTrigger>
      <SelectContent>
        {['draft', 'sent', 'delivered', 'cancelled'].map((s) => (
          <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function duePill(due?: string | null) {
  if (!due) return '—';
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(due); d.setHours(0,0,0,0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  const cls = diff < 0 ? 'bg-red-100 text-red-700'
    : diff <= 7 ? 'bg-amber-100 text-amber-700'
    : 'bg-emerald-100 text-emerald-700';
  const label = diff < 0 ? `${Math.abs(diff)}d overdue`
    : diff === 0 ? 'Due today'
    : `Due in ${diff}d`;
  return <span className={`px-2 py-0.5 rounded text-xs ${cls}`}>{new Date(due).toISOString().slice(0,10)} • {label}</span>;
}

export default function PurchaseOrdersListPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  const load = async () => {
    try {
      const { rows, total } = await listPurchaseOrders({ q, page, pageSize });
      setRows(rows as Row[]);
      setTotal(total);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load purchase orders');
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [q, page]);
  const pages = Math.max(1, Math.ceil(total / pageSize));

  const onDelete = async (id: number) => {
    if (!confirm('Delete this purchase order?')) return;
    try {
      await deletePurchaseOrder(id);
      toast.success('Deleted');
      setRows((prev) => prev.filter((r) => r.id !== id));
      if (rows.length === 1 && page > 1) setPage((p) => p - 1);
      else load();
    } catch (e: any) {
      toast.error(e.message || 'Delete failed');
    }
  };

  const header = useMemo(() => (
    <div className="p-3 grid grid-cols-[1.2fr_1.6fr_1.2fr_1.8fr_1.2fr_7rem_6rem] gap-2 font-medium text-sm bg-muted/50">
      <div>PO Number</div>
      <div>Vendor</div>
      <div>PO Date</div>
      <div>Due Date</div>
      <div>Total</div>
      <div>Status</div>
      <div className="text-right">Actions</div>
    </div>
  ), []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Breadcrumbs
            className="mb-2"
            items={[
              { label: 'Dashboard', href: '/dashboard/overview' },
              { label: 'Purchase Orders', current: true },
            ]}
          />
          <h1 className="text-2xl font-semibold">Purchase Orders</h1>
          <p className="text-sm text-muted-foreground">Track all purchase orders for procurement</p>
        </div>
        <Button asChild><Link href="/purchase-orders/new">New Purchase Order</Link></Button>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <Input
          placeholder="Search PO number or vendor…"
          value={q}
          onChange={(e) => { setPage(1); setQ(e.target.value); }}
        />
      </div>

      {/* List */}
      <div className="border rounded-xl overflow-x-auto">
        <div className="divide-y min-w-[980px]">
          {header}

          {rows.map((po) => {
            const totalAmount = Number(po.total ?? 0);
            const taxPercent = po.tax_percent ?? 11;
            const totalDisplay = po.is_tax_included
              ? `${fmtID.format(totalAmount)} (Tax ${taxPercent}%)`
              : fmtID.format(totalAmount);

            return (
              <div
                key={po.id}
                className="p-3 grid grid-cols-[1.2fr_1.6fr_1.2fr_1.8fr_1.2fr_7rem_6rem] gap-2 items-center hover:bg-muted/30 transition-colors"
              >
                <div className="font-medium">
                  <Link href={`/purchase-orders/${po.id}`} className="underline underline-offset-4">
                    {po.po_number}
                  </Link>
                </div>

                <div>{po.vendor_name}</div>
                <div>{po.po_date || '—'}</div>
                <div>{duePill(po.due_date)}</div>
                <div>{totalDisplay}</div>

                <div className="flex justify-end">
                  <StatusSelect
                    id={po.id}
                    value={po.status}
                    onChanged={(next) => {
                      setRows((prev) => prev.map((r) => (r.id === po.id ? { ...r, status: next } : r)));
                    }}
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-1 shrink-0">
                  <Link href={`/purchase-orders/${po.id}/edit`} className="p-2 hover:bg-muted rounded" aria-label="Edit">
                    <Pencil size={16} />
                  </Link>
                  <button
                    onClick={() => onDelete(po.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                    aria-label="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}

          {rows.length === 0 && (
            <div className="p-6 text-sm text-muted-foreground">No purchase orders.</div>
          )}
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
        <div className="text-sm">Page {page} / {Math.max(1, Math.ceil(total / pageSize))}</div>
        <Button variant="outline" disabled={page >= Math.ceil(total / pageSize)} onClick={() => setPage((p) => p + 1)}>Next</Button>
      </div>
    </div>
  );
}

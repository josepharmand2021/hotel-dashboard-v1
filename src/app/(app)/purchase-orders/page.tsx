'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Pencil, Trash2 } from 'lucide-react';

import Breadcrumbs from '@/components/layout/Breadcrumbs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

import {
  listPurchaseOrders,
  updatePurchaseOrderStatus,
  deletePurchaseOrder,
} from '@/features/purchase-orders/api.client';

import PaymentStatusBadge from '@/features/purchase-orders/PaymentStatusBadge';

type Row = {
  id: number;
  po_number: string;
  vendor_name: string;
  po_date: string | null;
  delivery_date: string | null;
  due_date: string | null;
  total: number | null;
  is_tax_included: boolean;
  tax_percent: number | null;
  status: 'draft' | 'sent' | 'delivered' | 'cancelled' | string;
  term_code?: 'CBD'|'COD'|'NET'|null;
  term_days?: number | null;
  amount_paid?: number;
  balance_due?: number;
  payment_status?: 'UNBILLED'|'UNPAID'|'PARTIAL'|'PAID'|'OVERDUE';
  is_overdue?: boolean;
  days_overdue?: number;
};

const fmtID = new Intl.NumberFormat('id-ID');

/* ---------- Badges & Status Select ---------- */
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

/* ====================== PAGE ====================== */
export default function PurchaseOrdersListPage() {
  // write gate (admin ∪ superadmin)
  const [write, setWrite] = useState(false);
  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        const res = await fetch('/api/role-flags', { cache: 'no-store' });
        const json = res.ok ? await res.json() : null;
        if (!abort) setWrite(!!json?.canWrite);
      } catch {/* ignore */}
    })();
    return () => { abort = true; };
  }, []);

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
    if (!write) return; // hard guard
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
    <div className="p-3 grid grid-cols-[1.1fr_1.5fr_1fr_1.3fr_1.1fr_1.9fr_7rem_6rem] gap-2 font-medium text-sm bg-muted/50">
      <div>PO Number</div>
      <div>Vendor</div>
      <div>PO Date</div>
      <div>Due Date</div>
      <div>Total</div>
      <div>Payment</div>
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

        {/* New PO hanya untuk write */}
        {write && (
          <Button asChild>
            <Link href="/purchase-orders/new">New Purchase Order</Link>
          </Button>
        )}
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
        <div className="divide-y min-w-[1100px]">
          {header}

          {rows.map((po) => {
            const totalAmount = Number(po.total ?? 0);
            const taxPercent = po.tax_percent ?? 11;
            const totalDisplay = po.is_tax_included
              ? `Rp ${fmtID.format(totalAmount)} (Tax ${taxPercent}%)`
              : `Rp ${fmtID.format(totalAmount)}`;

            const paid = Number(po.amount_paid ?? 0);
            const balance = Number(po.balance_due ?? Math.max(totalAmount - paid, 0));

            return (
              <div
                key={po.id}
                className="p-3 grid grid-cols-[1.1fr_1.5fr_1fr_1.3fr_1.1fr_1.9fr_7rem_6rem] gap-2 items-center hover:bg-muted/30 transition-colors"
              >
                {/* PO number */}
                <div className="font-medium">
                  <Link href={`/purchase-orders/${po.id}`} className="underline underline-offset-4">
                    {po.po_number}
                  </Link>
                </div>

                {/* Vendor */}
                <div>{po.vendor_name}</div>

                {/* PO Date */}
                <div>{po.po_date || '—'}</div>

                {/* Due Date */}
                <div className="text-xs text-muted-foreground">{po.due_date || '—'}</div>

                {/* Total */}
                <div>{totalDisplay}</div>

                {/* Payment */}
                <div className="flex items-center gap-2">
                  <div className="text-sm">
                    <div className="leading-tight">Paid: <b>Rp {fmtID.format(paid)}</b></div>
                    <div className="leading-tight">Balance: <b>Rp {fmtID.format(balance)}</b></div>
                  </div>
                  <PaymentStatusBadge
                    status={(po.payment_status ?? 'UNBILLED') as any}
                    daysOverdue={po.days_overdue ?? 0}
                  />
                </div>

                {/* Status (editable hanya untuk write) */}
                <div className="flex justify-end">
                  {write ? (
                    <StatusSelect
                      id={po.id}
                      value={po.status}
                      onChanged={(next) => {
                        setRows((prev) => prev.map((r) => (r.id === po.id ? { ...r, status: next } : r)));
                      }}
                    />
                  ) : (
                    <StatusBadge status={po.status} />
                  )}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-1 shrink-0">
                  {write ? (
                    <>
                      <Link
                        href={`/purchase-orders/${po.id}/edit`}
                        className="p-2 hover:bg-muted rounded"
                        aria-label="Edit"
                      >
                        <Pencil size={16} />
                      </Link>
                      <button
                        onClick={() => onDelete(po.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                        aria-label="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  ) : (
                    // Viewer: tombol aman (Open / Print) saja
                    <>
                      <Link
                        href={`/purchase-orders/${po.id}`}
                        className="px-2 py-1 text-sm border rounded hover:bg-muted"
                      >
                        Open
                      </Link>
                      <a
                        href={`/purchase-orders/${po.id}/print`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-1 text-sm border rounded hover:bg-muted"
                      >
                        Print
                      </a>
                    </>
                  )}
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
        <div className="text-sm">Page {page} / {pages}</div>
        <Button
          variant="outline"
          disabled={page >= pages}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

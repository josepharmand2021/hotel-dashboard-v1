'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import { listPurchaseOrders, deletePurchaseOrder } from '@/features/purchase-orders/api';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


type Row = {
  id: number;
  po_number: string;
  vendor_name: string;
  delivery_date: string | null;
  total_amount: number | null;
  is_tax_included: boolean;
  tax_percent: number | null;
  status: string;
};

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

  useEffect(() => {
    load();
  }, [q, page]);

  const pages = Math.max(1, Math.ceil(total / pageSize));

  const onDelete = async (id: number) => {
    if (!confirm('Delete this purchase order?')) return;
    try {
      await deletePurchaseOrder(id);
      toast.success('Deleted');
      load();
    } catch (e: any) {
      toast.error(e.message || 'Delete failed');
    }
  };

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
          <p className="text-sm text-muted-foreground">
            Track all purchase orders for procurement
          </p>
        </div>
        <Button asChild>
          <Link href="/purchase-orders/new">New Purchase Order</Link>
        </Button>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <Input
          placeholder="Search PO number or vendor…"
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
        />
      </div>

      {/* List */}
      <div className="border rounded-xl divide-y">
        {/* Table Header */}
        <div className="p-3 grid grid-cols-12 gap-2 font-medium text-sm bg-muted/50">
          <div className="col-span-2">PO Number</div>
          <div className="col-span-3">Vendor</div>
          <div className="col-span-2">Delivery Date</div>
          <div className="col-span-2">Total Amount</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {/* Table Rows */}
        {rows.map((po) => {
          const totalAmount = po.total_amount ?? 0;
          const taxPercent = po.tax_percent ?? 11;

          return (
            <div
              key={po.id}
              className="p-3 grid grid-cols-12 gap-2 items-center"
            >
              <div className="col-span-2 font-medium">{po.po_number}</div>
              <div className="col-span-3">{po.vendor_name}</div>
              <div className="col-span-2">{po.delivery_date || '—'}</div>
              <div className="col-span-2">
                {po.is_tax_included
                  ? `${totalAmount.toLocaleString()} (Tax ${taxPercent}%)`
                  : totalAmount.toLocaleString()}
              </div>
              <div className="col-span-1 capitalize">{po.status}</div>
                <div className="col-span-2 flex justify-end gap-3">
                <TooltipProvider>
                    <Tooltip>
                    <TooltipTrigger asChild>
                        <Link href={`/purchase-orders/${po.id}`} className="p-1 hover:bg-muted rounded">
                        <Eye size={18} />
                        </Link>
                    </TooltipTrigger>
                    <TooltipContent>Detail</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                    <TooltipTrigger asChild>
                        <Link href={`/purchase-orders/${po.id}/edit`} className="p-1 hover:bg-muted rounded">
                        <Pencil size={18} />
                        </Link>
                    </TooltipTrigger>
                    <TooltipContent>Edit</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                        onClick={() => onDelete(po.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                        <Trash2 size={18} />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent>Delete</TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                </div>
            </div>
          );
        })}

        {rows.length === 0 && (
          <div className="p-6 text-sm text-muted-foreground">
            No purchase orders.
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
        >
          Prev
        </Button>
        <div className="text-sm">
          Page {page} / {pages}
        </div>
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

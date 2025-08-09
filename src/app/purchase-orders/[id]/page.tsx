// src/app/purchase-orders/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';

import Breadcrumbs from '@/components/layout/Breadcrumbs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

import { getPurchaseOrder, deletePurchaseOrder } from '@/features/purchase-orders/api';

type Detail = Awaited<ReturnType<typeof getPurchaseOrder>>;
const fmtID = new Intl.NumberFormat('id-ID');

function StatusBadge({ status }: { status?: string }) {
  const s = (status || '').toLowerCase();

  switch (s) {
    case 'draft':
      return <Badge variant="outline">Draft</Badge>;
    case 'sent':
      return <Badge variant="secondary">Sent</Badge>;
    case 'completed':
      return <Badge>Completed</Badge>;
    case 'cancelled':
      return <Badge variant="destructive">Cancelled</Badge>;
    default:
      return <Badge variant="outline">Completed</Badge>;
  }
}


export default function PurchaseOrderDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = Number(params.id);

  const [po, setPo] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const data = await getPurchaseOrder(id);
      setPo(data);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load PO');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (Number.isFinite(id)) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const onDelete = async () => {
    if (!confirm('Delete this purchase order?')) return;
    try {
      await deletePurchaseOrder(id);
      toast.success('Deleted');
      router.push('/purchase-orders');
    } catch (e: any) {
      toast.error(e.message || 'Delete failed');
    }
  };

  if (loading) return <div>Loading…</div>;
  if (!po) return <div>Not found.</div>;

  return (
    <div className="max-w-5xl space-y-4">
      <Breadcrumbs
        className="mb-2"
        items={[
          { label: 'Dashboard', href: '/dashboard/overview' },
          { label: 'Purchase Orders', href: '/purchase-orders' },
          { label: po.po_number || `#${po.id}`, current: true },
        ]}
      />

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">PO {po.po_number}</h1>
          <p className="text-sm text-muted-foreground">
            Vendor: {po.vendor?.name || '—'}
          </p>
        </div>
        <div className="flex gap-2">
          <StatusBadge status={po.status} />
          <Button asChild variant="outline">
            <Link href={`/purchase-orders/${po.id}/edit`}>Edit</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/purchase-orders/${po.id}/print`}>Print</Link>
          </Button>

          {/* Print & Receive can be wired later */}
          {/* <Button variant="outline">Print</Button> */}
          <Button variant="destructive" onClick={onDelete}>Delete</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>PO Information</CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">PO Number</div>
            <div className="font-medium">{po.po_number}</div>
            <div className="text-sm text-muted-foreground mt-4">PO Date</div>
            <div className="font-medium">{po.po_date || '—'}</div>
            <div className="text-sm text-muted-foreground mt-4">Delivery Date</div>
            <div className="font-medium">{po.delivery_date || '—'}</div>
          </div>

          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Vendor</div>
            <div className="font-medium">{po.vendor?.name || '—'}</div>
            <div className="text-sm text-muted-foreground mt-4">Tax</div>
            <div className="font-medium">
              {po.is_tax_included ? 'Included' : 'Excluded'} ({po.tax_percent}%)
            </div>
            <div className="text-sm text-muted-foreground mt-4">Status</div>
            <div><StatusBadge status={po.status} /></div>
          </div>

          {po.note && (
            <div className="md:col-span-2">
              <div className="text-sm text-muted-foreground">Note</div>
              <div className="font-medium whitespace-pre-wrap">{po.note}</div>
            </div>
          )}
        </CardContent>

        <Separator />

        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[45%]">Description</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {po.items.map((it) => (
                <TableRow key={it.id}>
                  <TableCell>{it.description}</TableCell>
                  <TableCell className="text-right">{fmtID.format(it.qty)}</TableCell>
                  <TableCell>{it.unit || '—'}</TableCell>
                  <TableCell className="text-right">{fmtID.format(it.unit_price)}</TableCell>
                  <TableCell className="text-right font-medium">{fmtID.format(it.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-6 flex flex-col items-end gap-1 text-sm">
            <div className="w-full sm:w-80 flex justify-between">
              <span>Subtotal</span>
              <span>{fmtID.format(po.subtotal)}</span>
            </div>
            <div className="w-full sm:w-80 flex justify-between text-muted-foreground">
              <span>Tax {po.tax_percent}% {po.is_tax_included ? '(included)' : ''}</span>
              <span>{po.is_tax_included ? '—' : fmtID.format(po.taxAmount)}</span>
            </div>
            <Separator className="my-2 w-full sm:w-80" />
            <div className="w-full sm:w-80 flex justify-between font-semibold text-base">
              <span>Total</span>
              <span>{fmtID.format(po.total)}</span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="justify-end gap-2 pb-6">
          <Button variant="outline" onClick={() => history.back()}>Back</Button>
          <Button asChild>
            <Link href={`/purchase-orders/${po.id}/edit`}>Edit</Link>
          </Button>
          {/* <Button variant="outline">Receive (GRN)</Button> */}
          {/* <Button variant="outline">Print</Button> */}
        </CardFooter>
      </Card>
    </div>
  );
}

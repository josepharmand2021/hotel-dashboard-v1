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

import PaymentsCard from '@/features/purchase-orders/PaymentsCard';
import PaymentStatusBadge from '@/features/purchase-orders/PaymentStatusBadge';
// import PayFromPODialog from '@/features/purchase-orders/PayFromPODialog';

// ✅ Komponen client harus pakai API client
import { getPurchaseOrder, deletePurchaseOrder } from '@/features/purchase-orders/api';

type Detail = Awaited<ReturnType<typeof getPurchaseOrder>>;
const fmtID = new Intl.NumberFormat('id-ID');

function StatusBadge({ status }: { status?: string }) {
  const s = (status || '').toLowerCase();
  switch (s) {
    case 'draft': return <Badge variant="outline">Draft</Badge>;
    case 'sent': return <Badge variant="secondary">Sent</Badge>;
    case 'delivered': return <Badge>Delivered</Badge>;
    case 'completed': return <Badge>Completed</Badge>;
    case 'cancelled': return <Badge variant="destructive">Cancelled</Badge>;
    default: return <Badge variant="outline">—</Badge>;
  }
}

export default function PurchaseOrderDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = Number(params?.id);

  const [po, setPo] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);

  // ===== Role flags (viewer tidak bisa write) =====
  const [write, setWrite] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/role-flags', { cache: 'no-store' });
        const j = res.ok ? await res.json() : {};
        // canWrite untuk PO = admin ∪ superadmin
        setWrite(!!j?.isAdmin || !!j?.isSuper);
      } catch {
        // ignore
      }
    })();
  }, []);

  // Pay dialog
  const [payOpen, setPayOpen] = useState(false);
  const [paymentsTick, setPaymentsTick] = useState(0); // refresh PaymentsCard setelah bayar

  async function load() {
    if (!Number.isFinite(id)) return;
    try {
      setLoading(true);
      const data = await getPurchaseOrder(id);
      setPo(data);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load PO');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  async function onDelete() {
    if (!confirm('Delete this purchase order?')) return;
    try {
      await deletePurchaseOrder(id);
      toast.success('Deleted');
      router.push('/purchase-orders');
    } catch (e: any) {
      toast.error(e?.message || 'Delete failed');
    }
  }

  if (!Number.isFinite(id)) return <div>Invalid PO id.</div>;
  if (loading) return <div>Loading…</div>;
  if (!po) return <div>Not found.</div>;

  // ===== Totals (prefer nilai dari server) =====
  const items = po.items ?? [];
  const subtotal =
    po.subtotal != null
      ? Number(po.subtotal)
      : items.reduce((s: number, it: any) => s + (Number(it.amount ?? it.qty * it.unit_price) || 0), 0);

  const taxPct = Number(po.tax_percent ?? 0);
  const taxAmount =
    po.taxAmount != null
      ? Number(po.taxAmount)
      : (po.is_tax_included ? 0 : Math.round(subtotal * (taxPct / 100)));

  const total =
    po.total != null ? Number(po.total) : (po.is_tax_included ? subtotal : subtotal + taxAmount);

  // ===== Finance summary (server dulu) =====
  const paid = Number((po as any).paid ?? 0);
  const balance = Number((po as any).outstanding ?? Math.max(total - paid, 0));

  // ===== Payment status & due date (server dulu) =====
  const paymentStatus = ((po as any).payment_status ??
    (paid >= total - 0.5 ? 'PAID' : paid > 0 ? 'PARTIAL' : 'UNPAID')) as 'UNPAID'|'PARTIAL'|'PAID'|'OVERDUE';
  const daysOverdue = Number((po as any).days_overdue ?? 0);
  const dueDate = (po as any).due_date_effective ?? '';

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

      {/* Header + Action buttons */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">PO {po.po_number}</h1>
          <p className="text-sm text-muted-foreground">Vendor: {po.vendor?.name || '—'}</p>
        </div>
        <div className="flex gap-2">
          <StatusBadge status={po.status} />
          {/* ⬇️ Tombol hanya muncul kalau boleh write */}
          {write && balance > 0 && <Button onClick={() => setPayOpen(true)}>Pay</Button>}
          {write && (
            <Button asChild variant="outline">
              <Link href={`/purchase-orders/${po.id}/edit`}>Edit</Link>
            </Button>
          )}
          <Button asChild variant="outline">
            <Link href={`/purchase-orders/${po.id}/print`}>Print</Link>
          </Button>
          {write && <Button variant="destructive" onClick={onDelete}>Delete</Button>}
        </div>
      </div>

      {/* PO Information */}
      <Card>
        <CardHeader>
          <CardTitle>PO Information</CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="grid md:grid-cols-2 gap-6">
          {/* Left */}
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">PO Number</div>
            <div className="font-medium">{po.po_number}</div>

            <div className="text-sm text-muted-foreground mt-4">PO Date</div>
            <div className="font-medium">{po.po_date || '—'}</div>

            <div className="text-sm text-muted-foreground mt-4">Delivery Date</div>
            <div className="font-medium">{po.delivery_date || '—'}</div>

            {dueDate && (
              <>
                <div className="text-sm text-muted-foreground mt-4">Due Date</div>
                <div className="font-medium">{dueDate}</div>
              </>
            )}
          </div>

          {/* Right */}
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Vendor</div>
            <div className="font-medium">{po.vendor?.name || '—'}</div>

            <div className="text-sm text-muted-foreground mt-4">Tax</div>
            <div className="font-medium">
              {po.is_tax_included ? 'Included' : 'Excluded'} ({taxPct}%)
            </div>

            <div className="text-sm text-muted-foreground mt-4">Payment Status</div>
            <div>
              <PaymentStatusBadge status={paymentStatus} daysOverdue={daysOverdue} />
            </div>

            <div className="text-sm text-muted-foreground mt-4">Payment</div>
            <div className="text-sm">
              <div className="flex justify-between w-64 max-w-full">
                <span>Paid:</span><span className="font-medium">Rp {fmtID.format(paid)}</span>
              </div>
              <div className="flex justify-between w-64 max-w-full">
                <span>Balance:</span><span className="font-semibold">Rp {fmtID.format(balance)}</span>
              </div>
            </div>
          </div>

          {po.note && (
            <div className="md:col-span-2">
              <div className="text-sm text-muted-foreground">Note</div>
              <div className="font-medium whitespace-pre-wrap">{po.note}</div>
            </div>
          )}
        </CardContent>

        <Separator />

        {/* Items */}
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
              {items.map((it: any) => {
                const rowAmt = Number(it.amount ?? it.qty * it.unit_price) || 0;
                return (
                  <TableRow key={it.id}>
                    <TableCell>{it.description}</TableCell>
                    <TableCell className="text-right">{fmtID.format(it.qty)}</TableCell>
                    <TableCell>{it.unit || '—'}</TableCell>
                    <TableCell className="text-right">{fmtID.format(it.unit_price)}</TableCell>
                    <TableCell className="text-right font-medium">{fmtID.format(rowAmt)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {/* Totals */}
          <div className="mt-6 flex flex-col items-end gap-1 text-sm">
            <div className="w-full sm:w-80 flex justify-between">
              <span>Subtotal</span>
              <span>{fmtID.format(subtotal)}</span>
            </div>
            <div className="w-full sm:w-80 flex justify-between text-muted-foreground">
              <span>Tax {taxPct}% {po.is_tax_included ? '(included)' : ''}</span>
              <span>{po.is_tax_included ? '—' : fmtID.format(taxAmount)}</span>
            </div>
            <Separator className="my-2 w-full sm:w-80" />
            <div className="w-full sm:w-80 flex justify-between font-semibold text-base">
              <span>Total</span>
              <span>{fmtID.format(total)}</span>
            </div>

            <Separator className="my-2 w-full sm:w-80" />
            <div className="w-full sm:w-80 flex justify-between">
              <span>Paid</span>
              <span>{fmtID.format(paid)}</span>
            </div>
            <div className="w-full sm:w-80 flex justify-between font-semibold">
              <span>Balance</span>
              <span>{fmtID.format(balance)}</span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="justify-end gap-2 pb-6">
          <Button variant="outline" onClick={() => router.back()}>Back</Button>
          {write && (
            <Button asChild>
              <Link href={`/purchase-orders/${po.id}/edit`}>Edit</Link>
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* Payments list — viewer tetap bisa lihat, tapi tidak bisa menambah */}
      <PaymentsCard
        key={`${po.id}-${paymentsTick}`}
        poId={po.id}
        onAddPayment={write ? () => setPayOpen(true) : undefined}
      />

      {/* Pay dialog (hanya dibuka kalau write=true) */}
      {/* <PayFromPODialog
        open={payOpen}
        onOpenChange={setPayOpen}
        po={{
          id: po.id,
          po_number: po.po_number,
          vendor: po.vendor ? { id: po.vendor.id, name: po.vendor.name } : null,
          paid,
          outstanding: balance,
          total,
        }}
        defaultAmount={balance}
        onSuccess={async () => {
          try {
            const fresh = await getPurchaseOrder(po.id);
            setPo(fresh);
            setPaymentsTick(t => t + 1);
          } catch (e: any) {
            toast.error(e?.message || 'Failed to refresh PO');
          }
        }}
      /> */}
    </div>
  );
}

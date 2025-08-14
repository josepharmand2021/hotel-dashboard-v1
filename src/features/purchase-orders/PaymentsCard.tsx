'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { listPOPayments, type POPaymentRow } from '@/features/purchase-orders/api.client';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const fmtID = new Intl.NumberFormat('id-ID');

export default function PaymentsCard({
  poId,
  onAddPayment,
}: {
  poId: number;
  onAddPayment?: () => void; // panggil setPayOpen(true)
}) {
  const [rows, setRows] = useState<POPaymentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const data = await listPOPayments(poId);
      setRows(data);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (poId) load(); /* eslint-disable-next-line */ }, [poId]);

  const totalAllocated = useMemo(
    () => rows.reduce((s, r) => s + (Number(r.amount) || 0), 0),
    [rows]
  );

  return (
    <Card>
      <CardHeader className="flex items-center justify-between gap-2">
        <CardTitle className="w-full flex items-center justify-between">
          <span>Payments</span>
          {onAddPayment && (
            <Button size="sm" onClick={onAddPayment}>Add Payment</Button>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading payments…</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">No payments.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Date</TableHead>
                <TableHead className="w-[90px]">Source</TableHead>
                <TableHead>Expense</TableHead>
                <TableHead className="w-[160px]">Invoice</TableHead>
                <TableHead>Note</TableHead>
                <TableHead className="text-right w-[160px]">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.expenses.expense_date}</TableCell>
                  <TableCell>{r.expenses.source}</TableCell>
                  <TableCell>
                    <Link
                      href={`/finance/expenses/${r.expenses.id}`}
                      className="underline underline-offset-4"
                    >
                      #{r.expenses.id}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {r.expenses.status}
                    </div>
                  </TableCell>
                  <TableCell>{r.expenses.invoice_no ?? '—'}</TableCell>
                  <TableCell className="max-w-[360px] truncate" title={r.expenses.note ?? ''}>
                    {r.expenses.note ?? '—'}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    Rp {fmtID.format(r.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {rows.length > 0 && (
          <>
            <Separator className="my-4" />
            <div className="flex justify-end font-semibold">
              <div className="w-[240px] flex justify-between">
                <span>Total Allocated</span>
                <span>Rp {fmtID.format(totalAllocated)}</span>
              </div>
            </div>
          </>
        )}
      </CardContent>

      <CardFooter className="justify-end">
        {onAddPayment && <Button onClick={onAddPayment}>Add Payment</Button>}
      </CardFooter>
    </Card>
  );
}

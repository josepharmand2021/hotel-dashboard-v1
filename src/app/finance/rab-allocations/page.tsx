'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listAllocationMonths } from '@/features/rab/api';
import type { RabMonthSummary } from '@/features/rab/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const fmtID2 = new Intl.NumberFormat('id-ID');

export default function RabAllocationsListPage(){
  const [rows, setRows] = useState<RabMonthSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{ (async()=>{ try{ setRows(await listAllocationMonths()); } catch(e:any){ toast.error(e.message||'Gagal memuat'); } finally{ setLoading(false); } })(); },[]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">RAB Allocations</h2>
        <Button asChild><Link href="/finance/rab-allocations/new">New Allocation</Link></Button>
      </div>
      <Card>
        <CardHeader><CardTitle>Months</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Total Allocated</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(r=> (
                  <TableRow key={r.period_month}>
                    <TableCell>{r.period_month.slice(0,7)}</TableCell>
                    <TableCell className="text-right">Rp {fmtID2.format(r.total_allocated)}</TableCell>
                    <TableCell className="text-right"><Button variant="ghost" asChild><Link href={`/finance/rab-allocations/${r.period_month.slice(0,7)}`}>Open</Link></Button></TableCell>
                  </TableRow>
                ))}
                {rows.length===0 && (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-10">{loading? 'Memuat…':'Belum ada alokasi'}</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


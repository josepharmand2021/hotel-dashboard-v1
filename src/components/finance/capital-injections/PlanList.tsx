'use client';

import { useEffect, useState } from 'react';
import { listPlans } from '@/features/capital-injections/api';
import type { PlanSummary } from '@/features/capital-injections/types';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const fmtID = new Intl.NumberFormat('id-ID');

export default function PlanList() {
  const [rows, setRows] = useState<PlanSummary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await listPlans();
        setRows(data);
      } catch (e: any) {
        toast.error(e.message || 'Gagal memuat');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Capital Injections</h2>
        <Button asChild>
          <Link href="/finance/capital-injections/new">New Plan</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Plans</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Target</TableHead>
                  <TableHead className="text-right">Posted</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.period}</TableCell>
                    <TableCell className="text-right">Rp {fmtID.format(r.target_total)}</TableCell>
                    <TableCell className="text-right">Rp {fmtID.format(r.posted_total)}</TableCell>
                    <TableCell>
                      <div className="w-40 bg-muted rounded-full h-2">
                        <div className={`h-2 rounded-full ${r.progress_percent >= 100 ? 'bg-green-500' : 'bg-primary'}`} style={{ width: `${Math.min(100, r.progress_percent)}%` }} />
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{r.progress_percent}%</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.status === 'active' ? 'default' : r.status === 'closed' ? 'secondary' : 'outline'}>{r.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" asChild>
                        <Link href={`/finance/capital-injections/${r.id}`}>Open</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                      {loading ? 'Memuat…' : 'Belum ada plan'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
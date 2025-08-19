'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listPlans } from '@/features/capital-injections/api';
import type { PlanSummary } from '@/features/capital-injections/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const fmtID = new Intl.NumberFormat('id-ID');

type Props = { canWrite?: boolean };

export default function PlanList({ canWrite }: Props) {
  const [rows, setRows] = useState<PlanSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [write, setWrite] = useState<boolean>(!!canWrite); // ← sumber kebenaran di UI

  // Fallback: kalau prop tidak ada/false, cek role ke server
  useEffect(() => {
    let abort = false;
    async function ensureWriteFlag() {
      if (canWrite) {
        setWrite(true);
        return;
      }
      try {
        const res = await fetch('/api/role-flags', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (!abort) setWrite(!!data?.canWrite); // admin || superadmin
      } catch {
        /* ignore */
      }
    }
    ensureWriteFlag();
    return () => { abort = true; };
  }, [canWrite]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await listPlans();
        setRows(data || []);
      } catch (e: any) {
        toast.error(e?.message || 'Gagal memuat');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Capital Injections</h2>

        {/* tampil hanya untuk admin/super */}
        {write && (
          <Button asChild>
            <Link href="/finance/capital-injections/new">New Plan</Link>
          </Button>
        )}
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
                {loading && Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={`s-${i}`}>
                    <TableCell><div className="h-4 w-24 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell className="text-right"><div className="h-4 w-28 bg-muted animate-pulse rounded ml-auto" /></TableCell>
                    <TableCell className="text-right"><div className="h-4 w-28 bg-muted animate-pulse rounded ml-auto" /></TableCell>
                    <TableCell><div className="h-2 w-40 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell><div className="h-6 w-16 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell />
                  </TableRow>
                ))}

                {!loading && rows.map((r) => {
                  const posted = r.posted_total ?? 0;
                  const target = r.target_total ?? 0;
                  const pctFromApi = r.progress_percent ?? (target ? Math.round((posted * 100) / target) : 0);
                  const pct = Math.max(0, Math.min(100, pctFromApi));

                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.period}</TableCell>
                      <TableCell className="text-right">Rp {fmtID.format(target)}</TableCell>
                      <TableCell className="text-right">Rp {fmtID.format(posted)}</TableCell>
                      <TableCell>
                        <div className="w-40 bg-muted rounded-full h-2" aria-label={`Progress ${pct}%`}>
                          <div className={`h-2 rounded-full ${pct >= 100 ? 'bg-green-500' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">{pct}%</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={r.status === 'active' ? 'default' : r.status === 'closed' ? 'secondary' : 'outline'}>
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" asChild>
                          <Link href={`/finance/capital-injections/${r.id}`}>Open</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {!loading && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                      Belum ada plan
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

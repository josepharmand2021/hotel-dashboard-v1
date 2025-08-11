'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  listAllocationMonths,
  getRabRekeningSummary,
  listAllMonthGrid,
} from '@/features/rab/api';
import type { RabMonthSummary, RabMonthGridRow } from '@/features/rab/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const fmtID = new Intl.NumberFormat('id-ID');
const fmtMonth = (iso: string) => iso.slice(0, 7);

export default function RabAllocationsListPage() {
  const [months, setMonths] = useState<RabMonthSummary[]>([]);
  const [rekening, setRekening] = useState<{ total_rab: number; terpakai: number; tersedia: number } | null>(null);
  const [grid, setGrid] = useState<RabMonthGridRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchAll() {
    setLoading(true);
    try {
      const [m, rs, g] = await Promise.all([
        listAllocationMonths(),
        getRabRekeningSummary(),
        listAllMonthGrid(),
      ]);
      setMonths(m);
      setRekening(rs);
      setGrid(g);
    } catch (e: any) {
      toast.error(e.message || 'Gagal memuat');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAll(); }, []);

  // ====== Shape matrix data ======
  const monthsAsc = useMemo(() => {
    const uniq = Array.from(new Set(grid.map(x => fmtMonth(x.period_month))));
    return uniq.sort((a, b) => a.localeCompare(b));
  }, [grid]);

  type MatrixRow = {
    shareholder_id: number;
    shareholder_name: string;
    pct: number;
    perMonth: Record<string, number>;
    total: number;
    available: number;
  };

  const matrixRows: MatrixRow[] = useMemo(() => {
    const map = new Map<number, MatrixRow>();
    for (const r of grid) {
      const id = r.shareholder_id;
      if (!map.has(id)) {
        map.set(id, {
          shareholder_id: id,
          shareholder_name: r.shareholder_name,
          pct: r.ownership_percent || 0,
          perMonth: {},
          total: 0,
          available: 0,
        });
      }
      const row = map.get(id)!;
      const m = fmtMonth(r.period_month);
      const amt = r.allocated_this_month || 0;
      row.perMonth[m] = (row.perMonth[m] || 0) + amt;
      row.total += amt;
    }
    // Belum ada Expenses → available == total
    Array.from(map.values()).forEach(r => { r.available = r.total; });
    return Array.from(map.values()).sort((a, b) => a.shareholder_name.localeCompare(b.shareholder_name));
  }, [grid]);

  const grand = useMemo(() => ({
    perMonth: monthsAsc.reduce<Record<string, number>>((acc, m) => {
      acc[m] = matrixRows.reduce((s, r) => s + (r.perMonth[m] || 0), 0);
      return acc;
    }, {}),
    total: matrixRows.reduce((s, r) => s + r.total, 0),
  }), [monthsAsc, matrixRows]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">RAB Allocations</h2>
        <Button asChild><Link href="/finance/rab-allocations/new">New Allocation</Link></Button>
      </div>

      {/* Rekening RAB — cards */}
      <section className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="py-6">
              <div className="text-sm text-muted-foreground">TOTAL RAB</div>
              <div className="mt-1 text-2xl font-semibold">
                Rp {fmtID.format(rekening?.total_rab ?? 0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-6">
              <div className="text-sm text-muted-foreground">TERPAKAI</div>
              <div className="mt-1 text-2xl font-semibold">
                Rp {fmtID.format(rekening?.terpakai ?? 0)}
              </div>
            </CardContent>
          </Card>

          <Card className="border-emerald-300">
            <CardContent className="py-6">
              <div className="text-sm text-emerald-700">TERSEDIA</div>
              <div className="mt-1 text-2xl font-semibold text-emerald-700">
                Rp {fmtID.format(rekening?.tersedia ?? 0)}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>


      {/* RAB Balance (matrix per-bulan) */}
      <Card>
        <CardHeader><CardTitle>RAB Balance</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="sticky top-0 bg-background z-10">
                  <TableHead className="min-w-[220px] sticky left-0 bg-background z-20">NOMINAL</TableHead>
                  {monthsAsc.map(m => (
                    <TableHead key={m} className="text-right min-w-[160px]">
                      <div className="font-medium">Rp {fmtID.format(grand.perMonth[m] || 0)}</div>
                      <div className="text-xs text-muted-foreground">{m}</div>
                    </TableHead>
                  ))}
                  <TableHead className="text-right min-w-[160px]">TOTAL RAB</TableHead>
                  <TableHead className="text-right min-w-[160px]">DANA TERSEDIA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matrixRows.map(r => (
                  <TableRow key={r.shareholder_id} className="hover:bg-muted/30">
                    <TableCell className="sticky left-0 bg-background z-10">
                      <div className="font-medium">{r.shareholder_name}</div>
                      <div className="text-xs text-muted-foreground">{r.pct?.toFixed(0)}%</div>
                    </TableCell>
                    {monthsAsc.map(m => (
                      <TableCell key={`${r.shareholder_id}-${m}`} className="text-right">
                        {r.perMonth[m] ? `Rp ${fmtID.format(r.perMonth[m])}` : <span className="text-muted-foreground">Rp -</span>}
                      </TableCell>
                    ))}
                    <TableCell className="text-right font-medium">Rp {fmtID.format(r.total)}</TableCell>
                    <TableCell className="text-right font-semibold text-emerald-700">Rp {fmtID.format(r.available)}</TableCell>
                  </TableRow>
                ))}

                {/* TOTAL row */}
                <TableRow className="bg-muted/40">
                  <TableCell className="sticky left-0 bg-muted/40 z-10 font-semibold">TOTAL</TableCell>
                  {monthsAsc.map(m => (
                    <TableCell key={`t-${m}`} className="text-right font-semibold">
                      Rp {fmtID.format(grand.perMonth[m] || 0)}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-semibold">Rp {fmtID.format(grand.total)}</TableCell>
                  <TableCell className="text-right font-semibold text-emerald-700">Rp {fmtID.format(grand.total)}</TableCell>
                </TableRow>

                {!loading && matrixRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={monthsAsc.length + 3} className="text-center text-muted-foreground py-10">
                      Belum ada alokasi
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Daftar bulan (navigasi cepat) */}
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
                {months.map(r => (
                  <TableRow key={r.period_month}>
                    <TableCell className="font-medium">{fmtMonth(r.period_month)}</TableCell>
                    <TableCell className="text-right">Rp {fmtID.format(r.total_allocated)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" asChild>
                        <Link href={`/finance/rab-allocations/${fmtMonth(r.period_month)}`}>Open</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {months.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-10">
                      {loading ? 'Memuat…' : 'Belum ada alokasi'}
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

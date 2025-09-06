// src/features/capital-injections/ui/ShareholderSummaryTable.tsx
'use client';
import * as React from 'react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';

function fmtIDR(n?: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n ?? 0);
}

// Net: negatif = credit (tampilkan "+" hijau), positif = shortfall (tampilkan "-" merah)
function fmtNet(v: number) {
  if (v < 0) return `+${fmtIDR(Math.abs(v))}`; // overpaid (credit)
  if (v > 0) return `-${fmtIDR(v)}`;           // underpaid (shortfall)
  return fmtIDR(0);
}

export function ShareholderSummaryTable({
  rows,
}: {
  rows: Array<{
    shareholder_id: number;
    shareholder_name: string;
    allocated_total: number;
    contributions_total: number;
    net_position_total: number; // negatif = credit, positif = shortfall
    last_contribution_date: string | null;
  }>;
}) {
  if (!rows?.length) {
    return (
      <div className="rounded-xl border p-8 text-center text-sm text-muted-foreground">
        Tidak ada data untuk filter saat ini.
      </div>
    );
  }

  const totals = rows.reduce(
    (acc, r) => {
      acc.alloc += r.allocated_total;
      acc.paid += r.contributions_total;
      acc.net += r.net_position_total;
      return acc;
    },
    { alloc: 0, paid: 0, net: 0 }
  );

  return (
    <div className="rounded-xl border overflow-x-auto">
      <Table className="min-w-[720px]">
        <TableHeader className="sticky top-0 z-10 bg-background">
          <TableRow>
            <TableHead>Shareholder</TableHead>
            <TableHead className="text-right">Allocated</TableHead>
            <TableHead className="text-right">Paid</TableHead>
            <TableHead className="text-right">Net</TableHead>
            <TableHead>Last Contribution</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={r.shareholder_id} className={i % 2 ? 'bg-muted/20' : ''}>
              <TableCell className="font-medium">{r.shareholder_name}</TableCell>
              <TableCell className="text-right tabular-nums font-mono">{fmtIDR(r.allocated_total)}</TableCell>
              <TableCell className="text-right tabular-nums font-mono">{fmtIDR(r.contributions_total)}</TableCell>
              <TableCell
                className={`text-right tabular-nums font-mono ${
                  r.net_position_total < 0 ? 'text-green-600' : r.net_position_total > 0 ? 'text-red-600' : ''
                }`}
              >
                {fmtNet(r.net_position_total)}
              </TableCell>
              <TableCell className="whitespace-nowrap">{r.last_contribution_date ?? '—'}</TableCell>
            </TableRow>
          ))}

          {/* total row */}
          <TableRow className="bg-muted/40">
            <TableCell className="font-semibold uppercase text-xs tracking-wide">TOTAL</TableCell>
            <TableCell className="text-right font-semibold tabular-nums font-mono">{fmtIDR(totals.alloc)}</TableCell>
            <TableCell className="text-right font-semibold tabular-nums font-mono">{fmtIDR(totals.paid)}</TableCell>
            <TableCell
              className={`text-right font-semibold tabular-nums font-mono ${
                totals.net < 0 ? 'text-green-700' : totals.net > 0 ? 'text-red-700' : ''
              }`}
            >
              {fmtNet(totals.net)}
            </TableCell>
            <TableCell />
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

// src/components/finance/ExpenseTable.tsx
'use client';

import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ExpenseListItem } from '@/features/expenses/types';
import { MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import * as React from 'react';

const fmtID = new Intl.NumberFormat('id-ID');

export type ExpenseTableProps = {
  rows: ExpenseListItem[];
  loading?: boolean;
  // columns visibility
  show?: Partial<{
    source: boolean; status: boolean; shareholder: boolean;
    category: boolean; subcategory: boolean;
    vendor: boolean; invoice: boolean; note: boolean; period: boolean;
  }>;
  // optional actions per row
  actions?: (row: ExpenseListItem) => React.ReactNode;
  // optional onRowClick
  onRowClick?: (row: ExpenseListItem) => void;
};

export function ExpenseTable({
  rows, loading,
  show = { source: true, status: true, shareholder: true, category: true, subcategory: true, vendor: true, invoice: true, note: false, period: false },
  actions, onRowClick,
}: ExpenseTableProps) {

  const totalDisplayed = rows.reduce((s, r) => s + (r.amount || 0), 0);

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[110px]">Date</TableHead>
            {show.period && <TableHead className="min-w-[100px]">Month</TableHead>}
            {show.source && <TableHead>Source</TableHead>}
            {show.status && <TableHead>Status</TableHead>}
            {show.shareholder && <TableHead>Shareholder</TableHead>}
            {show.category && <TableHead>Category</TableHead>}
            {show.subcategory && <TableHead>Subcategory</TableHead>}
            {show.vendor && <TableHead>Vendor</TableHead>}
            {show.invoice && <TableHead>Invoice</TableHead>}
            {show.note && <TableHead>Note</TableHead>}
            <TableHead className="text-right min-w-[140px]">Amount</TableHead>
            <TableHead className="w-[56px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && Array.from({ length: 6 }).map((_, i) => (
            <TableRow key={`sk-${i}`}>
              <TableCell><div className="h-4 w-24 bg-muted animate-pulse rounded" /></TableCell>
              {show.period && <TableCell><div className="h-4 w-20 bg-muted animate-pulse rounded" /></TableCell>}
              {show.source && <TableCell><div className="h-4 w-16 bg-muted animate-pulse rounded" /></TableCell>}
              {show.status && <TableCell><div className="h-4 w-16 bg-muted animate-pulse rounded" /></TableCell>}
              {show.shareholder && <TableCell><div className="h-4 w-28 bg-muted animate-pulse rounded" /></TableCell>}
              {show.category && <TableCell><div className="h-4 w-28 bg-muted animate-pulse rounded" /></TableCell>}
              {show.subcategory && <TableCell><div className="h-4 w-28 bg-muted animate-pulse rounded" /></TableCell>}
              {show.vendor && <TableCell><div className="h-4 w-24 bg-muted animate-pulse rounded" /></TableCell>}
              {show.invoice && <TableCell><div className="h-4 w-20 bg-muted animate-pulse rounded" /></TableCell>}
              {show.note && <TableCell><div className="h-4 w-28 bg-muted animate-pulse rounded" /></TableCell>}
              <TableCell className="text-right"><div className="h-4 w-24 bg-muted animate-pulse rounded ml-auto" /></TableCell>
              <TableCell></TableCell>
            </TableRow>
          ))}

          {!loading && rows.map((r) => {
            const statusColor =
              r.status === 'posted' ? 'bg-emerald-100 text-emerald-700' :
              r.status === 'draft'  ? 'bg-amber-100 text-amber-700' :
                                      'bg-red-100 text-red-700';
            return (
              <TableRow key={r.id} className="hover:bg-muted/40 cursor-pointer" onClick={() => onRowClick?.(r)}>
                <TableCell className="font-medium">{r.expense_date}</TableCell>
                {show.period && <TableCell>{r.period_month.slice(0,7)}</TableCell>}
                {show.source && <TableCell>{r.source}</TableCell>}
                {show.status && <TableCell><span className={`px-2 py-0.5 rounded text-xs ${statusColor}`}>{r.status}</span></TableCell>}
                {show.shareholder && <TableCell>{r.shareholder_name ?? '—'}</TableCell>}
                {show.category && <TableCell>{r.category_name}</TableCell>}
                {show.subcategory && <TableCell>{r.subcategory_name}</TableCell>}
                {show.vendor && <TableCell>{r.vendor_name ?? '—'}</TableCell>}
                {show.invoice && <TableCell>{r.invoice_no ?? '—'}</TableCell>}
                {show.note && <TableCell className="max-w-[280px] truncate">{r.note ?? '—'}</TableCell>}
                <TableCell className="text-right">Rp {fmtID.format(r.amount)}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e)=>e.stopPropagation()}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e)=>e.stopPropagation()}>
                      {actions ? actions(r) : (
                        <>
                          <DropdownMenuItem asChild><Link href={`/finance/expenses/${r.id}`}>Open</Link></DropdownMenuItem>
                          {/* Tambah item lain sesuai kebutuhan */}
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}

          {!loading && rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={12} className="text-center text-muted-foreground py-10">
                Tidak ada data
              </TableCell>
            </TableRow>
          )}

          {!loading && rows.length > 0 && (
            <TableRow className="bg-muted/40">
              <TableCell colSpan={show.note ? 10 : 9} className="text-right font-semibold">
                Total (halaman ini)
              </TableCell>
              <TableCell className="text-right font-semibold">Rp {fmtID.format(totalDisplayed)}</TableCell>
              <TableCell></TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

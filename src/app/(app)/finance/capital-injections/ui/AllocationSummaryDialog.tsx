"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";

import type { AllocationSummary } from "@/features/capital-injections/types";
import { fmtIDR } from "./utils";

/**
 * AllocationSummaryDialog
 * - Shows after a contribution is created & allocated
 * - Displays which periods/obligations got fulfilled (FIFO)
 */
export function AllocationSummaryDialog({
  summary,
  onOpenChange,
}: {
  summary: AllocationSummary | null;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Dialog open={!!summary} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ringkasan Alokasi</DialogTitle>
        </DialogHeader>

        {!summary && <div className="p-4 text-muted-foreground">Tidak ada data</div>}

        {summary && (
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                Setoran <Badge>{fmtIDR(summary.contribution.amount)}</Badge> dari shareholder ID {summary.contribution.shareholder_id}
              </p>
              {summary.creditLeft > 0 && (
                <p className="text-sm text-yellow-600">
                  Ada saldo lebih: {fmtIDR(summary.creditLeft)} (akan dipakai otomatis untuk periode berikutnya)
                </p>
              )}
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Dialokasikan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.allocations.map((a, i) => (
                  <TableRow key={i}>
                    <TableCell>{a.period || `Obligation #${a.obligation_id}`}</TableCell>
                    <TableCell className="text-right">{fmtIDR(a.allocated)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex justify-end">
              <Button onClick={() => onOpenChange(false)}>
                <CheckCircle2 className="mr-1 h-4 w-4"/> Selesai
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

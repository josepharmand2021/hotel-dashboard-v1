"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Loader2, Plus, ChevronLeft, ChevronRight } from "lucide-react";

// === sesuaikan path sesuai struktur kamu ===
import {
  listContributionsPaged,
} from "@/features/capital-injections/api";

import {ContributionRow} from "@/features/capital-injections/types";
import { fmtIDR } from "./utils";

type Props = {
  title?: string;
  showCreateButton?: boolean;
  onCreateClick?: () => void;
};

export function ContributionsTable({
  title = "Setoran Modal",
  showCreateButton = true,
  onCreateClick,
}: Props) {
  // pagination
  const [page, setPage] = React.useState<number>(1);        // 1-based
  const [pageSize, setPageSize] = React.useState<number>(10);

  // data
  const [rows, setRows] = React.useState<ContributionRow[]>([]);
  const [total, setTotal] = React.useState<number>(0);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [err, setErr] = React.useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await listContributionsPaged({ page, pageSize });
      setRows(res.rows);
      setTotal(res.total);
    } catch (e: any) {
      setErr(e.message || "Gagal memuat setoran");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
        {showCreateButton && (
          <Button size="sm" onClick={onCreateClick}>
            <Plus className="mr-2 h-4 w-4" />
            Tambah Setoran
          </Button>
        )}
      </CardHeader>

      <CardContent>
        {err && <div className="mb-3 text-sm text-red-600">{err}</div>}

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Memuat…
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead style={{ minWidth: 96 }}>Tanggal</TableHead>
                  <TableHead>Shareholder</TableHead>
                  <TableHead className="text-right">Nominal</TableHead>
                  <TableHead>Bank</TableHead>
                  <TableHead>Ref</TableHead>
                  <TableHead>Catatan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Belum ada setoran.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.transfer_date}</TableCell>
                      <TableCell>{r.shareholder_name}</TableCell>
                      <TableCell className="text-right">{fmtIDR(r.amount)}</TableCell>
                      <TableCell>{r.bank_account_name ?? "-"}</TableCell>
                      <TableCell>{r.deposit_tx_ref ?? "-"}</TableCell>
                      <TableCell>{r.note ?? "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {total === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
              </div>

              <div className="flex items-center gap-2">
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => setPageSize(Number(v))}
                >
                  <SelectTrigger className="w-[110px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 25, 50, 100].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-sm w-12 text-center">{page}/{totalPages}</div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

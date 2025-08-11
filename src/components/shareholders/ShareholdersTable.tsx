"use client";

import { useEffect, useMemo, useState } from "react";
import type { Shareholder, PercentCheck } from "@/features/shareholders/types";
import { listShareholders, getPercentCheck, toggleShareholderActive, deleteShareholder } from "@/features/shareholders/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { toast } from "sonner";

function pctColor(p: number) {
  if (p === 100) return "success";
  if (p > 100) return "destructive";
  return "warning";
}

export default function ShareholdersTable() {
  const [rows, setRows] = useState<Shareholder[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [percent, setPercent] = useState<PercentCheck | null>(null);

  const pages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  async function fetchAll() {
    setLoading(true);
    try {
      const [list, pc] = await Promise.all([
        listShareholders({ q, page, pageSize }),
        getPercentCheck(),
      ]);
      setRows(list.rows);
      setTotal(list.total);
      setPercent(pc);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, page]);

  async function handleToggleActive(id: number, current: boolean) {
    try {
      await toggleShareholderActive(id, !current);
      toast.success(`Shareholder ${!current ? "diaktifkan" : "dinonaktifkan"}`);
      fetchAll();
    } catch (e: any) {
      toast.error(e.message || "Gagal mengubah status");
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Hapus shareholder ini? Tindakan ini tidak bisa dibatalkan.")) return;
    try {
      await deleteShareholder(id);
      toast.success("Shareholder dihapus");
      // reset ke page 1 kalau setelah delete halaman kosong
      if ((total - 1) <= (page - 1) * pageSize) setPage(Math.max(1, page - 1));
      else fetchAll();
    } catch (e: any) {
      toast.error(e.message || "Gagal menghapus");
    }
  }

  const totalPct = percent?.total_active_percent ?? 0;
  const gap = percent?.gap_to_100 ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 w-full max-w-md">
          <Input
            placeholder="Cari nama shareholder…"
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
          />
          <Button variant="secondary" onClick={() => { setQ(""); setPage(1); }}>Reset</Button>
        </div>
        <Button asChild>
          <Link href="/shareholders/new">Tambah Shareholder</Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle>Ringkasan Kepemilikan</CardTitle>
            <Badge variant={totalPct === 100 ? "default" : totalPct > 100 ? "destructive" : "secondary"}>
              Total Aktif: {totalPct.toFixed(2)}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className={`h-2 rounded-full ${totalPct === 100 ? "bg-green-500" : totalPct > 100 ? "bg-red-500" : "bg-amber-500"}`}
              style={{ width: `${Math.min(100, Math.max(0, totalPct))}%` }}
            />
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            {totalPct === 100 ? (
              <span>Distribusi kepemilikan sudah pas 100%.</span>
            ) : totalPct > 100 ? (
              <span>Lebih {Math.abs(gap).toFixed(2)}% dari 100%. Sesuaikan persentase.</span>
            ) : (
              <span>Kurang {gap.toFixed(2)}% dari 100%. Tambah/ubah persentase.</span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Shareholders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead className="text-right">% Ownership</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telepon</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id} className={!r.active ? "opacity-60" : ""}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-right">{r.ownership_percent.toFixed(2)}%</TableCell>
                    <TableCell>{r.email || "-"}</TableCell>
                    <TableCell>{r.phone || "-"}</TableCell>
                    <TableCell>
                      {r.active ? (
                        <Badge>Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <DotsHorizontalIcon />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link href={`/shareholders/${r.id}/edit`}>Edit</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleActive(r.id, r.active)}>
                            {r.active ? "Nonaktifkan" : "Aktifkan"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(r.id)}>
                            Hapus
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                      {loading ? "Memuat…" : "Belum ada data"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">Total: {total}</div>
            <div className="flex items-center gap-2">
              <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Prev
              </Button>
              <div className="text-sm">Page {page} / {pages}</div>
              <Button variant="outline" disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))}>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
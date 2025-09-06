"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, CheckCircle2 } from "lucide-react";

// ==== SESUAIKAN PATH INI DENGAN STRUKTUR KAMU ====
import { listPlans, listObligationsByPeriodId, activatePlan } from "@/features/capital-injections/api";
import type { PeriodSummary, ObligationRow } from "@/features/capital-injections/types";
// ================================================

import { CreateContributionDialog } from "./ui/CreateContributionDialog";
import { AllocationSummaryDialog } from "./ui/AllocationSummaryDialog";
import { CreatePlanDialog } from "./ui/CreatePlanDialog";
import { fmtIDR } from "./ui/utils";

export default function CapitalInjectionsPage() {
  const [periods, setPeriods] = React.useState<PeriodSummary[] | null>(null);
  const [openCreate, setOpenCreate] = React.useState(false);
  const [openPlan, setOpenPlan] = React.useState(false);
  const [summary, setSummary] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

  const reloadPeriods = React.useCallback(async () => {
    try {
      const rows = await listPlans();
      setPeriods(rows);
      setErr(null);
    } catch (e: any) {
      setErr(e.message || "Gagal memuat periods");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    reloadPeriods();
  }, [reloadPeriods]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Capital Injections</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setOpenPlan(true)}>
            <Plus className="mr-2 h-4 w-4" /> Buat Periode Baru
          </Button>
          <Button onClick={() => setOpenCreate(true)}>
            <Plus className="mr-2 h-4 w-4" /> Buat Setoran
          </Button>
        </div>
      </div>

      {loading && (
        <Card>
          <CardContent className="p-8 flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading...
          </CardContent>
        </Card>
      )}

      {err && <Card><CardContent className="p-4 text-red-600">{err}</CardContent></Card>}

      {periods && (
        <Card>
          <CardHeader>
            <CardTitle>Periods</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Target</TableHead>
                  <TableHead className="text-right">Due</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periods.map((p) => (
                  <PeriodRow key={p.id} p={p} onReload={reloadPeriods} />
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <CreateContributionDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
        onAllocated={(s) => setSummary(s)}
      />

      <CreatePlanDialog
        open={openPlan}
        onOpenChange={setOpenPlan}
        onCreated={reloadPeriods} // refetch list setelah create
      />

      <AllocationSummaryDialog summary={summary} onOpenChange={() => setSummary(null)} />
    </div>
  );
}

/* ================= Row item ================= */

function PeriodRow({
  p,
  onReload,
}: {
  p: PeriodSummary;
  onReload: () => Promise<void> | void;
}) {
  const [open, setOpen] = React.useState(false);
  const [rows, setRows] = React.useState<ObligationRow[] | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await listObligationsByPeriodId(p.id);
      setRows(data);
      setOpen(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <TableRow className="cursor-pointer hover:bg-muted/50" onClick={load}>
        <TableCell className="font-medium">{p.period}</TableCell>
        <TableCell className="text-right">{fmtIDR(p.target_total)}</TableCell>
        <TableCell className="text-right">{fmtIDR(p.total_due)}</TableCell>
        <TableCell className="text-right">{fmtIDR(p.total_paid)}</TableCell>
        <TableCell className="text-right">{fmtIDR(p.outstanding)}</TableCell>

        {/* STATUS */}
        <TableCell>
          <Badge variant={p.status === "active" ? "default" : p.status === "draft" ? "secondary" : "outline"}>
            {p.status}
          </Badge>
        </TableCell>

        {/* AKSI */}
        <TableCell className="text-right">
          <div className="flex justify-end gap-2">
            <Link href={`/finance/capital-injections/${p.id}`} onClick={(e) => e.stopPropagation()}>
              <Button size="sm" variant="outline">Lihat Detail</Button>
            </Link>

            {p.status === "draft" && (
              <Button
                size="sm"
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    await activatePlan(p.id);
                    await onReload();
                  } catch (err: any) {
                    alert(err?.message || "Gagal activate");
                  }
                }}
              >
                Activate
              </Button>
            )}
          </div>
        </TableCell>
      </TableRow>

      {open && (
        <tr>
          {/* jumlah kolom = 7 */}
          <td colSpan={7} className="bg-muted/30">
            <Card className="m-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Detail Period {p.period}
                  <Badge variant="secondary">Target {fmtIDR(p.target_total)}</Badge>
                  <Badge>Paid {fmtIDR(p.total_paid)}</Badge>
                  <Badge variant="destructive">Outstanding {fmtIDR(p.outstanding)}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading && <div className="p-4 text-muted-foreground">Loading...</div>}
                {rows && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Shareholder</TableHead>
                        <TableHead className="text-right">Obligation</TableHead>
                        <TableHead className="text-right">Paid</TableHead>
                        <TableHead className="text-right">Outstanding</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r) => (
                        <TableRow key={r.obligation_id}>
                          <TableCell>{r.shareholder_name}</TableCell>
                          <TableCell className="text-right">{fmtIDR(r.obligation_amount)}</TableCell>
                          <TableCell className="text-right">{fmtIDR(r.paid)}</TableCell>
                          <TableCell className="text-right">{fmtIDR(r.outstanding)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </td>
        </tr>
      )}
    </>
  );
}

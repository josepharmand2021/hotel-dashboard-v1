"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Plus, RefreshCw } from "lucide-react";

import { fmtIDR } from "../ui/utils";
import { AllocationSummaryDialog } from "../ui/AllocationSummaryDialog";
import { CreateContributionDialog } from "../ui/CreateContributionDialog";
import { getPlanSummaryById, listObligationsByPeriodId } from "@/features/capital-injections/api";
import type { PeriodSummary, ObligationRow } from "@/features/capital-injections/types";

export default function PlanDetailPage() {
  const router = useRouter();
  const params = useParams();
  const planId = Number(params?.id);

  const [plan, setPlan] = React.useState<PeriodSummary | null>(null);
  const [rows, setRows] = React.useState<ObligationRow[] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

  const [openCreate, setOpenCreate] = React.useState(false);
  const [summary, setSummary] = React.useState<any | null>(null);

  async function fetchAll() {
    setLoading(true);
    setErr(null);
    try {
      const [p, r] = await Promise.all([
        getPlanSummaryById(planId),
        listObligationsByPeriodId(planId),
      ]);
      setPlan(p);
      setRows(r);
    } catch (e: any) {
      setErr(e?.message || "Gagal memuat detail plan");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (!Number.isFinite(planId)) return;
    fetchAll();
  }, [planId]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">Detail Periode</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchAll}>
            <RefreshCw className="mr-2 h-4 w-4"/> Refresh
          </Button>
          <Button onClick={() => setOpenCreate(true)}>
            <Plus className="mr-2 h-4 w-4"/> Buat Setoran
          </Button>
        </div>
      </div>

      {loading && (
        <Card>
          <CardContent className="p-8 flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin"/> Loading...
          </CardContent>
        </Card>
      )}

      {err && <Card><CardContent className="p-4 text-red-600">{err}</CardContent></Card>}

      {plan && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Periode {plan.period}
              <Badge variant="secondary">Target {fmtIDR(plan.target_total)}</Badge>
              <Badge>Paid {fmtIDR(plan.total_paid)}</Badge>
              <Badge variant="destructive">Outstanding {fmtIDR(plan.outstanding)}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
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
                {rows?.map((r) => (
                  <TableRow key={r.obligation_id}>
                    <TableCell>{r.shareholder_name}</TableCell>
                    <TableCell className="text-right">{fmtIDR(r.obligation_amount)}</TableCell>
                    <TableCell className="text-right">{fmtIDR(r.paid)}</TableCell>
                    <TableCell className="text-right">{fmtIDR(r.outstanding)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Global create-contribution dialog */}
      <CreateContributionDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
        onAllocated={(s) => {
          setSummary(s);
          // Refresh numbers after allocation
          fetchAll();
        }}
      />

      <AllocationSummaryDialog summary={summary} onOpenChange={() => setSummary(null)} />
    </div>
  );
}

"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { fmtIDR } from "./utils";
import { getOverallPlanSummary } from "@/features/capital-injections/api";
import type { OverallPlanSummary } from "@/features/capital-injections/types";

export function OverallPlanSummaryCard() {
  const [sum, setSum] = React.useState<OverallPlanSummary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const data = await getOverallPlanSummary();
        setSum(data);
      } catch (e: any) {
        setErr(e.message || "Gagal memuat ringkasan");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ringkasan Semua Periode</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Memuat…
          </div>
        ) : err ? (
          <div className="text-sm text-red-600">{err}</div>
        ) : sum ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="text-sm text-muted-foreground">Target Total</div>
              <div className="text-lg font-semibold">{fmtIDR(sum.grand_target)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Paid Total</div>
              <div className="text-lg font-semibold text-green-600">{fmtIDR(sum.grand_paid)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Outstanding Total</div>
              <div className="text-lg font-semibold text-red-600">{fmtIDR(sum.grand_outstanding)}</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Status</div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Draft {sum.draft_count}</Badge>
                <Badge>Active {sum.active_count}</Badge>
                <Badge variant="outline">Closed {sum.closed_count}</Badge>
                <Badge variant="secondary">Periode {sum.total_periods}</Badge>
              </div>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

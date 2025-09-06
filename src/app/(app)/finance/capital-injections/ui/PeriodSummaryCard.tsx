"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fmtIDR } from "./utils";
import type { PeriodSummary } from "@/features/capital-injections/types";

export function PeriodSummaryCard({ summary }: { summary: PeriodSummary }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          Periode {summary.period}
          <Badge variant={summary.status === "active" ? "default" : summary.status === "draft" ? "secondary" : "outline"}>
            {summary.status}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <div className="text-sm text-muted-foreground">Target</div>
          <div className="font-semibold">{fmtIDR(summary.target_total)}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">Paid</div>
          <div className="font-semibold text-green-600">{fmtIDR(summary.total_paid)}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">Outstanding</div>
          <div className="font-semibold text-red-600">{fmtIDR(summary.outstanding)}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">Status</div>
          <div className="font-semibold">{summary.status}</div>
        </div>
      </CardContent>
    </Card>
  );
}

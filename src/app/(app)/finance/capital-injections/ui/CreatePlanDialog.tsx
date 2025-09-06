"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus } from "lucide-react";

import { createPlan } from "@/features/capital-injections/api";
import { MonthYearPicker } from "./MonthYearPicker";

/**
 * CreatePlanDialog
 * - Buat capital_injection baru (periode + target)
 * - Simpel, status default 'draft'
 */
export function CreatePlanDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: (newPlanId: number) => void;
}) {
  const [loading, setLoading] = React.useState(false);
  const [form, setForm] = React.useState({
    period: new Date().toISOString().slice(0, 7), // YYYY-MM
    target_total: "",
    note: "",
  });

  function parseIntIDR(s: string) {
    const n = Number(String(s).replace(/\D/g, ""));
    return Number.isFinite(n) ? n : 0;
  }

  async function onSubmit() {
    if (!form.period || !form.target_total) return;
    setLoading(true);
    try {
      const { id } = await createPlan({
        period: form.period,
        target_total: parseIntIDR(form.target_total),
        note: form.note || null,
      });
      onOpenChange(false);
      onCreated?.(id);
      setForm((f) => ({ ...f, target_total: "", note: "" }));
    } catch (e: any) {
      alert(e?.message || "Gagal membuat periode");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Buat Periode Baru</DialogTitle>
          <DialogDescription>Tambahkan jadwal topup (periode + target nominal).</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Periode</Label>
            <MonthYearPicker
              value={form.period}
              onChange={(v: string) => setForm((f) => ({ ...f, period: v }))}
            />
          </div>

          <div className="grid gap-1.5">
            <Label>Target Total</Label>
            <Input
              inputMode="numeric"
              placeholder="0"
              value={form.target_total}
              onChange={(e) => setForm((f) => ({ ...f, target_total: e.target.value }))}
            />
          </div>

          <div className="grid gap-1.5">
            <Label>Catatan</Label>
            <Textarea
              placeholder="Opsional"
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={onSubmit} disabled={loading || !form.period || !form.target_total}>
            {loading ? <Loader2 className="animate-spin h-4 w-4" /> : <Plus className="h-4 w-4" />}
            <span className="ml-2">Simpan</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

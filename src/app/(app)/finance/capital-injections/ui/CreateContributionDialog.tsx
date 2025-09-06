"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Banknote } from "lucide-react";

import { listShareholders, listBankAccounts, createContributionAndAllocate } from "@/features/capital-injections/api";
import type { Shareholder, BankAccount, AllocationSummary } from "@/features/capital-injections/types";

/**
 * CreateContributionDialog
 * - Simple, single-step form
 * - On submit → call createContributionAndAllocate (FIFO)
 * - Returns AllocationSummary via onAllocated
 */
export function CreateContributionDialog({
  open,
  onOpenChange,
  onAllocated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAllocated: (summary: AllocationSummary) => void;
}) {
  const [loading, setLoading] = React.useState(false);
  const [shareholders, setShareholders] = React.useState<Shareholder[]>([]);
  const [banks, setBanks] = React.useState<BankAccount[]>([]);

  const [form, setForm] = React.useState({
    shareholder_id: "",
    transfer_date: new Date().toISOString().slice(0, 10),
    amount: "",
    bank_account_id: "",
    deposit_tx_ref: "",
    note: "",
  });

  React.useEffect(() => {
    if (!open) return;
    (async () => {
      const [sh, ba] = await Promise.all([listShareholders(), listBankAccounts()]);
      setShareholders(sh);
      setBanks(ba);
      setForm((f) => ({
        ...f,
        shareholder_id: f.shareholder_id || (sh[0] ? String(sh[0].id) : ""),
        bank_account_id: f.bank_account_id || (ba[0] ? String(ba[0].id) : ""),
      }));
    })();
  }, [open]);

  function numericToInt(str: string) {
    const n = Number(String(str).replace(/\D/g, ""));
    return Number.isFinite(n) ? n : 0;
  }

  async function onSubmit() {
    if (!form.shareholder_id || !form.transfer_date || !form.amount) return;
    setLoading(true);
    try {
      const summary = await createContributionAndAllocate({
        shareholder_id: Number(form.shareholder_id),
        amount: numericToInt(form.amount),
        transfer_date: form.transfer_date,
        bank_account_id: form.bank_account_id ? Number(form.bank_account_id) : null,
        deposit_tx_ref: form.deposit_tx_ref || null,
        note: form.note || null,
      });
      onOpenChange(false);
      onAllocated(summary);
      setForm((f) => ({ ...f, amount: "", deposit_tx_ref: "", note: "" }));
    } catch (e: any) {
      alert(e?.message || "Gagal menyimpan setoran");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Buat Setoran</DialogTitle>
          <DialogDescription>Input sekali, alokasi FIFO otomatis.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Shareholder</Label>
            <Select value={form.shareholder_id} onValueChange={(v) => setForm((f) => ({ ...f, shareholder_id: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih shareholder" />
              </SelectTrigger>
              <SelectContent>
                {shareholders.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label>Tanggal</Label>
            <Input
              type="date"
              value={form.transfer_date}
              onChange={(e) => setForm((f) => ({ ...f, transfer_date: e.target.value }))}
            />
          </div>

          <div className="grid gap-1.5">
            <Label>Nominal</Label>
            <Input
              inputMode="numeric"
              placeholder="0"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            />
          </div>

          <div className="grid gap-1.5">
            <Label>Rekening PT</Label>
            <Select value={form.bank_account_id} onValueChange={(v) => setForm((f) => ({ ...f, bank_account_id: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih rekening" />
              </SelectTrigger>
              <SelectContent>
                {banks.map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label>No. Referensi</Label>
            <Input value={form.deposit_tx_ref} onChange={(e) => setForm((f) => ({ ...f, deposit_tx_ref: e.target.value }))} />
          </div>

          <div className="grid gap-1.5">
            <Label>Catatan</Label>
            <Textarea value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={onSubmit} disabled={loading}>
            {loading ? <Loader2 className="animate-spin h-4 w-4" /> : <Banknote className="h-4 w-4" />}
            <span className="ml-2">Simpan</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

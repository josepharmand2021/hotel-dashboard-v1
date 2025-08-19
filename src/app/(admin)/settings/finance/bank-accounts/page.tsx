'use client';

import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  listBankAccounts, createBankAccount, updateBankAccount,
  deactivateBankAccount, activateBankAccount, type BankAccount
} from "@/features/bank-accounts/api";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MoreHorizontal, Star } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const FormSchema = z.object({
  name: z.string().min(2, "Wajib diisi"),
  bank_name: z.string().optional(),
  account_name: z.string().optional(),
  account_number: z.string().optional(),
  note: z.string().optional(),
  is_default: z.boolean().default(false),
});

function Mask({ value }: { value?: string | null }) {
  if (!value) return <span className="text-muted-foreground">-</span>;
  const v = String(value);
  if (v.length <= 4) return <span>{v}</span>;
  return <span>{"•".repeat(Math.max(0, v.length - 4))}{v.slice(-4)}</span>;
}

export default function BankAccountsSettingsPage() {
  const [rows, setRows] = useState<BankAccount[]>([]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: { is_default: false },
  });

  async function refresh() {
    try {
      const data = await listBankAccounts();
      setRows(data);
    } catch (e: any) {
      toast.error(e.message || "Gagal memuat data");
    }
  }

  useEffect(() => { refresh(); }, []);

  async function onSubmit(values: z.infer<typeof FormSchema>) {
    try {
      await createBankAccount(values);
      toast.success("Rekening PT ditambahkan");
      setOpen(false);
      form.reset({ is_default: false });
      await refresh();
    } catch (e: any) {
      toast.error(e.message || "Gagal menambahkan rekening");
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      [r.name, r.bank_name, r.account_name, r.account_number].some(v => (v || "").toLowerCase().includes(q))
    );
  }, [rows, search]);

  async function handleSetDefault(id: number) {
    try {
      await updateBankAccount(id, { is_default: true });
      toast.success("Set default berhasil");
      await refresh();
    } catch (e: any) {
      toast.error(e.message || "Gagal set default");
    }
  }

  async function handleDeactivate(id: number) {
    try {
      await deactivateBankAccount(id);
      toast.success("Dinonaktifkan");
      await refresh();
    } catch (e: any) {
      toast.error(e.message || "Gagal menonaktifkan");
    }
  }

  async function handleActivate(id: number) {
    try {
      await activateBankAccount(id);
      toast.success("Diaktifkan");
      await refresh();
    } catch (e: any) {
      toast.error(e.message || "Gagal mengaktifkan");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Rekening PT</h1>
        <div className="flex items-center gap-2">
          <Input placeholder="Cari…" value={search} onChange={e=>setSearch(e.target.value)} className="w-56" />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>+ Tambah Rekening</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader><DialogTitle>Tambah Rekening PT</DialogTitle></DialogHeader>
              <form
                id="new-bank-form"
                className="grid grid-cols-1 gap-3"
                onSubmit={form.handleSubmit(onSubmit)}
              >
                <div className="grid gap-1">
                  <label className="text-sm">Alias</label>
                  <Input placeholder="Contoh: Rekening PT Utama" {...form.register("name")} />
                  {form.formState.errors.name && <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>}
                </div>
                <div className="grid gap-1">
                  <label className="text-sm">Bank</label>
                  <Input placeholder="BCA / BNI / Mandiri…" {...form.register("bank_name")} />
                </div>
                <div className="grid gap-1">
                  <label className="text-sm">Nama di Rekening</label>
                  <Input placeholder="PT Tammu Hotel" {...form.register("account_name")} />
                </div>
                <div className="grid gap-1">
                  <label className="text-sm">Nomor Rekening</label>
                  <Input placeholder="1234567890" {...form.register("account_number")} />
                </div>
                <div className="grid gap-1">
                  <label className="text-sm">Catatan (opsional)</label>
                  <Input placeholder="Keterangan" {...form.register("note")} />
                </div>
                <label className="flex items-center gap-2 pt-1">
                  <Checkbox checked={form.watch("is_default")} onCheckedChange={(v)=>form.setValue("is_default", !!v)} />
                  Jadikan Default
                </label>
              </form>
              <DialogFooter>
                <Button variant="outline" onClick={()=>setOpen(false)}>Batal</Button>
                <Button type="submit" form="new-bank-form">Simpan</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Daftar Rekening</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Default</TableHead>
                <TableHead>Alias</TableHead>
                <TableHead>Bank</TableHead>
                <TableHead>Nama Rekening</TableHead>
                <TableHead>No. Rekening</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="w-16">{r.is_default ? <Star className="h-4 w-4 fill-current" /> : null}</TableCell>
                  <TableCell>{r.name}</TableCell>
                  <TableCell>{r.bank_name || "-"}</TableCell>
                  <TableCell>{r.account_name || "-"}</TableCell>
                  <TableCell><Mask value={r.account_number} /></TableCell>
                  <TableCell>
                    {r.is_active ? <Badge variant="secondary">Aktif</Badge> : <Badge variant="outline">Nonaktif</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {!r.is_default && r.is_active && (
                          <DropdownMenuItem onClick={() => handleSetDefault(r.id)}>Set Default</DropdownMenuItem>
                        )}
                        {r.is_active ? (
                          <DropdownMenuItem onClick={() => handleDeactivate(r.id)}>Nonaktifkan</DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => handleActivate(r.id)}>Aktifkan</DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Tidak ada data</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

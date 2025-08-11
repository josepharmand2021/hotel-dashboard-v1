"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { createShareholder } from "@/features/shareholders/api";

export default function NewShareholderPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [ownership, setOwnership] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const pct = Number(ownership);
    if (!name.trim()) return toast.error("Nama wajib diisi");
    if (Number.isNaN(pct) || pct < 0 || pct > 100) return toast.error("Persentase harus 0–100");

    setLoading(true);
    try {
      const { id } = await createShareholder({
        name: name.trim(),
        ownership_percent: Number(pct.toFixed(2)),
        email: email || null,
        phone: phone || null,
        note: note || null,
        active,
      });
      toast.success("Shareholder dibuat");
      router.push(`/dashboard/finance/shareholders/${id}/edit`);
    } catch (e: any) {
      toast.error(e.message || "Gagal menyimpan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Tambah Shareholder</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nama</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama lengkap" />
            </div>
            <div className="space-y-2">
              <Label>Ownership (%)</Label>
              <Input inputMode="decimal" value={ownership} onChange={(e) => setOwnership(e.target.value)} placeholder="contoh: 12.5" />
            </div>
            <div className="space-y-2">
              <Label>Email (opsional)</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@domain.com" />
            </div>
            <div className="space-y-2">
              <Label>Telepon (opsional)</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08xxxxx" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Catatan</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Keterangan tambahan" />
          </div>
          <div className="flex items-center justify-between pt-2">
            <div className="space-y-1">
              <Label>Status</Label>
              <div className="text-sm text-muted-foreground">Kalau nonaktif, tidak ikut perhitungan kewajiban/alokasi baru.</div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={active} onCheckedChange={setActive} />
              <span className="text-sm">{active ? "Active" : "Inactive"}</span>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => history.back()}>Batal</Button>
            <Button type="submit" disabled={loading}>{loading ? "Menyimpan…" : "Simpan"}</Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
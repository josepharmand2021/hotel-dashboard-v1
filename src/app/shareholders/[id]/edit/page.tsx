"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { getShareholder, updateShareholder } from "@/features/shareholders/api";

export default function EditShareholderPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params?.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [ownership, setOwnership] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [active, setActive] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getShareholder(id);
        setName(data.name || "");
        setOwnership(String(data.ownership_percent ?? ""));
        setEmail(data.email || "");
        setPhone(data.phone || "");
        setNote(data.note || "");
        setActive(Boolean(data.active));
      } catch (e: any) {
        toast.error(e.message || "Gagal memuat shareholder");
      } finally {
        setLoading(false);
      }
    }
    if (Number.isFinite(id)) load();
  }, [id]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const pct = Number(ownership);
    if (!name.trim()) return toast.error("Nama wajib diisi");
    if (Number.isNaN(pct) || pct < 0 || pct > 100) return toast.error("Persentase harus 0–100");

    setSaving(true);
    try {
      await updateShareholder(id, {
        name: name.trim(),
        ownership_percent: Number(pct.toFixed(2)),
        email: email || null,
        phone: phone || null,
        note: note || null,
        active,
      });
      toast.success("Perubahan disimpan");
      router.push("/shareholders");
    } catch (e: any) {
      toast.error(e.message || "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  if (!Number.isFinite(id)) return <div>Invalid ID</div>;
  if (loading) return <div>Memuat…</div>;

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Edit Shareholder</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nama</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Ownership (%)</Label>
              <Input inputMode="decimal" value={ownership} onChange={(e) => setOwnership(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Telepon</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Catatan</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="flex items-center justify-between pt-2">
            <div className="space-y-1">
              <Label>Status</Label>
              <div className="text-sm text-muted-foreground">Jika nonaktif, tidak dihitung dalam kewajiban/alokasi baru.</div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={active} onCheckedChange={setActive} />
              <span className="text-sm">{active ? "Active" : "Inactive"}</span>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => history.back()}>Batal</Button>
            <Button type="submit" disabled={saving}>{saving ? "Menyimpan…" : "Simpan"}</Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
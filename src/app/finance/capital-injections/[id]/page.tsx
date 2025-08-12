"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  getPlan,
  getPlanSummaryById,
  listShareholderProgress,
  listContributions,
  addContribution,
  setContributionStatus,
  deleteContribution,
  activatePlan,
  setPlanStatus,
  listObligations,
  updateObligation,
  snapshotObligations,          // <— NEW
} from "@/features/capital-injections/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const fmtID = new Intl.NumberFormat("id-ID");

export default function CapitalInjectionDetailPage() {
  const params = useParams();
  const id = Number(params?.id);

  const [plan, setPlan] = useState<any | null>(null);
  const [summary, setSummary] = useState<any | null>(null);
  const [progressRows, setProgressRows] = useState<any[]>([]);
  const [contriRows, setContriRows] = useState<any[]>([]);
  const [obligationRows, setObligationRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // add-contribution form
  const [shareholderId, setShareholderId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  // obligation edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editObId, setEditObId] = useState<number | null>(null);
  const [editAmount, setEditAmount] = useState<string>("");
  const [editReason, setEditReason] = useState<string>("");

  // QUICK ADD dialog
  const [qaOpen, setQaOpen] = useState(false);
  const [qaShId, setQaShId] = useState<number | null>(null);
  const [qaShName, setQaShName] = useState<string>("");
  const [qaAmount, setQaAmount] = useState<string>("");
  const [qaDate, setQaDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [qaNote, setQaNote] = useState<string>("");
  const [qaSaving, setQaSaving] = useState(false);

  async function fetchAll() {
    setLoading(true);
    try {
      const [p, s, sp, lc, ob] = await Promise.all([
        getPlan(id),
        getPlanSummaryById(id).catch(() => null),
        listShareholderProgress(id).catch(() => []),
        listContributions(id),
        listObligations(id).catch(() => []),
      ]);
      setPlan(p); setSummary(s); setProgressRows(sp); setContriRows(lc); setObligationRows(ob);
    } catch (e: any) {
      toast.error(e.message || "Gagal memuat");
    } finally { setLoading(false); }
  }
  useEffect(() => { if (Number.isFinite(id)) fetchAll(); }, [id]);

  const totals = useMemo(() => {
    const target = plan?.target_total || 0;
    const paid = (summary?.posted_total != null)
      ? summary.posted_total
      : contriRows.filter((r) => r.status === "posted").reduce((s: number, r: any) => s + (r.amount || 0), 0);
    const remaining = Math.max(0, target - paid);
    const progress = target ? Math.round((paid * 100) / target) : 0;
    return { target, paid, remaining, progress };
  }, [plan, summary, contriRows]);

  async function onActivate() {
    try {
      await activatePlan(id);
      toast.success("Plan di-activate & snapshot dibuat bila belum ada");
      fetchAll();
    } catch (e: any) { toast.error(e.message || "Gagal activate"); }
  }
  async function onClose() {
    if (!confirm("Tutup plan ini?")) return;
    try { await setPlanStatus(id, "closed"); toast.success("Plan ditutup"); fetchAll(); }
    catch (e: any) { toast.error(e.message || "Gagal menutup"); }
  }
  async function onReopen() {
    if (!confirm("Buka kembali plan ini?")) return;
    try { await setPlanStatus(id, "active"); toast.success("Plan dibuka kembali"); fetchAll(); }
    catch (e: any) { toast.error(e.message || "Gagal membuka"); }
  }

  async function onSnapshot(replace: boolean) {
    try {
      await snapshotObligations(id, replace);
      toast.success(replace ? 'Snapshot di-regenerate dari ownership' : 'Snapshot dibuat');
      fetchAll();
    } catch (e: any) {
      toast.error(e.message || 'Gagal snapshot');
    }
  }

  async function onAddContribution(e: React.FormEvent) {
    e.preventDefault();
    if (!shareholderId) return toast.error("Pilih shareholder");
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return toast.error("Nominal tidak valid");
    if (!/\d{4}-\d{2}-\d{2}/.test(date)) return toast.error("Tanggal format YYYY-MM-DD");
    setSaving(true);
    try {
      await addContribution({ planId: id, shareholderId: Number(shareholderId), amount: Math.round(amt), transferDate: date, note });
      toast.success("Contribution ditambahkan");
      setShareholderId(""); setAmount(""); setDate(""); setNote("");
      fetchAll();
    } catch (e: any) { toast.error(e.message || "Gagal menyimpan"); }
    finally { setSaving(false); }
  }

  async function onVoidContribution(contrId: number) {
    if (!confirm("Void contribution ini?")) return;
    try { await setContributionStatus(contrId, "void", "void by admin"); toast.success("Di-void"); fetchAll(); }
    catch (e: any) { toast.error(e.message || "Gagal void"); }
  }
  async function onDeleteContribution(contrId: number) {
    if (!confirm("Hapus contribution ini?")) return;
    try { await deleteContribution(contrId); toast.success("Dihapus"); fetchAll(); }
    catch (e: any) { toast.error(e.message || "Gagal menghapus"); }
  }

  function openEditOb(row: any) {
    setEditObId(row.id); setEditAmount(String(row.obligation_amount || "")); setEditReason(""); setEditOpen(true);
  }
  async function saveEditOb() {
    if (!editObId) return;
    const amt = Number(editAmount);
    if (!Number.isFinite(amt) || amt < 0) return toast.error("Nominal tidak valid");
    try {
      await updateObligation(editObId, Math.round(amt), editReason || undefined);
      toast.success("Obligation diperbarui");
      setEditOpen(false);
      fetchAll();
    } catch (e: any) { toast.error(e.message || "Gagal memperbarui"); }
  }

  function openQuickAdd(row: any) {
    setQaShId(row.shareholder_id);
    setQaShName(row.shareholder_name || String(row.shareholder_id));
    const def = Number(row.remaining) > 0 ? Math.round(Number(row.remaining)) : 0;
    setQaAmount(def ? String(def) : "");
    setQaDate(new Date().toISOString().slice(0, 10));
    setQaNote("");
    setQaOpen(true);
  }
  async function saveQuickAdd() {
    if (!qaShId) return;
    const amt = Number(qaAmount);
    if (!Number.isFinite(amt) || amt <= 0) return toast.error("Nominal tidak valid");
    if (!/\d{4}-\d{2}-\d{2}/.test(qaDate)) return toast.error("Tanggal format YYYY-MM-DD");
    setQaSaving(true);
    try {
      await addContribution({
        planId: id,
        shareholderId: qaShId,
        amount: Math.round(amt),
        transferDate: qaDate,
        note: qaNote || `Quick add — ${qaShName}`,
      });
      toast.success("Cicilan ditambahkan");
      setQaOpen(false);
      fetchAll();
    } catch (e: any) {
      toast.error(e.message || "Gagal menyimpan");
    } finally {
      setQaSaving(false);
    }
  }

  if (!Number.isFinite(id)) return <div>Invalid ID</div>;
  if (loading || !plan) return <div>Memuat…</div>;

  const statusBadge = (
    <Badge variant={plan.status === "active" ? "default" : plan.status === "closed" ? "secondary" : "outline"}>
      {plan.status}
    </Badge>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-3">
              <span>Capital Injection — {plan.period}</span>
              {statusBadge}
            </CardTitle>
            <div className="flex gap-2">
              {plan.status === "draft" && (
                <Button onClick={onActivate}>Activate Plan</Button>
              )}
              {plan.status !== "closed" && (
                <Button variant="outline" onClick={() => onSnapshot(true)}>
                  Generate / Regenerate Snapshot
                </Button>
              )}
              {plan.status === "active" && (
                <Button variant="outline" onClick={onClose}>Close</Button>
              )}
              {plan.status === "closed" && (
                <Button variant="outline" onClick={onReopen}>Reopen</Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Target</div>
              <div className="text-xl font-semibold">Rp {fmtID.format(totals.target)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Paid</div>
              <div className="text-xl font-semibold">Rp {fmtID.format(totals.paid)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Remaining</div>
              <div className="text-xl font-semibold">Rp {fmtID.format(totals.remaining)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Progress</div>
              <div className="text-xl font-semibold">{totals.progress}%</div>
              <div className="w-full bg-muted rounded-full h-2 mt-1">
                <div className={`h-2 rounded-full ${totals.progress >= 100 ? 'bg-green-500' : 'bg-primary'}`} style={{ width: `${Math.min(100, totals.progress)}%` }} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="contributions">Contributions</TabsTrigger>
          <TabsTrigger value="obligations">Obligations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          {plan.status === "draft" && (
            <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
              Plan masih <b>draft</b>. Aktifkan atau klik <b>Generate / Regenerate Snapshot</b> setelah plan aktif untuk membuat kewajiban per shareholder berdasarkan ownership snapshot.
            </div>
          )}
          <Card>
            <CardHeader><CardTitle>Progress per Shareholder</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Shareholder</TableHead>
                      <TableHead className="text-right">Ownership %</TableHead>
                      <TableHead className="text-right">Obligation</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Remaining</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right w-[140px]">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {progressRows.map((r) => {
                      const status = r.remaining > 0 ? "Under" : r.remaining < 0 ? "Over" : "OK";
                      const badge = status === "Under" ? (
                        <Badge variant="outline">Under</Badge>
                      ) : status === "Over" ? (
                        <Badge variant="destructive">Over</Badge>
                      ) : (
                        <Badge>OK</Badge>
                      );
                      return (
                        <TableRow key={r.shareholder_id}>
                          <TableCell className="font-medium">{r.shareholder_name}</TableCell>
                          <TableCell className="text-right">{Number(r.ownership_percent).toFixed(2)}%</TableCell>
                          <TableCell className="text-right">Rp {fmtID.format(r.obligation)}</TableCell>
                          <TableCell className="text-right">Rp {fmtID.format(r.paid)}</TableCell>
                          <TableCell className="text-right">Rp {fmtID.format(r.remaining)}</TableCell>
                          <TableCell>{badge}</TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="outline" onClick={() => openQuickAdd(r)} disabled={plan.status !== "active"}>
                              Tambah cicilan
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {progressRows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-10">Tidak ada data</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contributions" className="space-y-4 mt-4">
          {plan.status !== "active" && (
            <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
              Hanya plan <b>ACTIVE</b> yang bisa menerima contribution posted.
            </div>
          )}
          {plan.status === "active" && (
            <Card>
              <CardHeader><CardTitle>Tambah Contribution</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={onAddContribution} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                  <div className="space-y-1 md:col-span-2">
                    <Label>Shareholder</Label>
                    <Select value={shareholderId} onValueChange={setShareholderId}>
                      <SelectTrigger><SelectValue placeholder="Pilih shareholder" /></SelectTrigger>
                      <SelectContent>
                        {progressRows.map((r) => (
                          <SelectItem key={r.shareholder_id} value={String(r.shareholder_id)}>
                            {r.shareholder_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Amount (IDR)</Label>
                    <Input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="500000000" />
                  </div>
                  <div className="space-y-1">
                    <Label>Transfer Date</Label>
                    <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label>Note</Label>
                    <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opsional" />
                  </div>
                  <div className="md:col-span-1 flex justify-end">
                    <Button type="submit" disabled={saving}>{saving ? "Menyimpan…" : "Tambah"}</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>Daftar Contributions</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Shareholder</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[140px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contriRows.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell>{c.transfer_date}</TableCell>
                        <TableCell>{c.shareholders?.name || c.shareholder_id}</TableCell>
                        <TableCell className="text-right">Rp {fmtID.format(c.amount)}</TableCell>
                        <TableCell>
                          {c.status === 'posted' ? <Badge>posted</Badge> : c.status === 'void' ? <Badge variant='secondary'>void</Badge> : <Badge variant='outline'>draft</Badge>}
                        </TableCell>
                        <TableCell className="text-right flex justify-end gap-2">
                          {c.status === 'posted' && (
                            <Button size="sm" variant="outline" onClick={() => onVoidContribution(c.id)}>Void</Button>
                          )}
                          {c.status !== 'posted' && (
                            <Button size="sm" variant="outline" onClick={() =>
                              setContributionStatus(c.id, 'posted')
                                .then(fetchAll)
                                .then(() => toast.success('Di-posting'))
                                .catch((e:any)=>toast.error(e.message||'Gagal'))
                            }>Post</Button>
                          )}
                          {c.status !== 'posted' && (
                            <Button size="sm" variant="ghost" className="text-red-600" onClick={() => onDeleteContribution(c.id)}>Hapus</Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {contriRows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-10">Belum ada kontribusi</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="obligations" className="space-y-4 mt-4">
          {plan.status === 'draft' && (
            <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
              Aktifkan plan untuk membuat dan mengedit obligations per shareholder.
            </div>
          )}
          {plan.status !== 'draft' && (
            <Card>
              <CardHeader><CardTitle>Obligations (Snapshot)</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Shareholder</TableHead>
                        <TableHead className="text-right">% Snapshot</TableHead>
                        <TableHead className="text-right">Obligation (IDR)</TableHead>
                        <TableHead className="w-[90px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {obligationRows.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.shareholders?.name || r.shareholder_id}</TableCell>
                          <TableCell className="text-right">{Number(r.ownership_percent_snapshot).toFixed(2)}%</TableCell>
                          <TableCell className="text-right">Rp {fmtID.format(r.obligation_amount)}</TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="outline" onClick={() => openEditOb(r)}>Edit</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {obligationRows.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-10">Belum ada snapshot</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Obligation Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Obligation</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Amount (IDR)</Label>
              <Input inputMode="numeric" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Reason (optional)</Label>
              <Textarea value={editReason} onChange={(e) => setEditReason(e.target.value)} placeholder="Contoh: penyesuaian kesepakatan" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Batal</Button>
            <Button onClick={saveEditOb}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Add Contribution Dialog */}
      <Dialog open={qaOpen} onOpenChange={setQaOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tambah cicilan — {qaShName || "-"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Amount (IDR)</Label>
              <Input inputMode="numeric" value={qaAmount} onChange={(e)=>setQaAmount(e.target.value)} placeholder="500000000" />
            </div>
            <div className="space-y-1">
              <Label>Tanggal</Label>
              <Input type="date" value={qaDate} onChange={(e)=>setQaDate(e.target.value)} />
            </div>
            <div className="md:col-span-2 space-y-1">
              <Label>Note (opsional)</Label>
              <Textarea value={qaNote} onChange={(e)=>setQaNote(e.target.value)} placeholder="Keterangan cicilan" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setQaOpen(false)}>Batal</Button>
            <Button onClick={saveQuickAdd} disabled={qaSaving || plan.status !== "active"}>
              {qaSaving ? "Menyimpan…" : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

'use client';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { getPlan, listShareholderProgress, listContributions, addContribution, updatePlan, deleteContribution } from '@/features/capital-injections/api';
import type { CapitalInjection, ShareholderProgress } from '@/features/capital-injections/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const fmtID = new Intl.NumberFormat('id-ID');

export default function PlanDetailPage() {
  const params = useParams();
  const id = Number(params?.id);

  const [plan, setPlan] = useState<CapitalInjection | null>(null);
  const [progressRows, setProgressRows] = useState<ShareholderProgress[]>([]);
  const [contriRows, setContriRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // add contribution form state
  const [shareholderId, setShareholderId] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  async function fetchAll() {
    setLoading(true);
    try {
      const [p, sp, lc] = await Promise.all([
        getPlan(id),
        listShareholderProgress(id),
        listContributions(id),
      ]);
      setPlan(p);
      setProgressRows(sp);
      setContriRows(lc);
    } catch (e: any) {
      toast.error(e.message || 'Gagal memuat');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (Number.isFinite(id)) fetchAll(); }, [id]);

  const totals = useMemo(() => {
    const target = plan?.target_total || 0;
    const paid = contriRows.filter((r) => r.status === 'posted').reduce((s: number, r: any) => s + (r.amount || 0), 0);
    const progress = target ? Math.round((paid * 100) / target) : 0;
    return { target, paid, remaining: target - paid, progress };
  }, [plan, contriRows]);

  async function onAddContribution(e: React.FormEvent) {
    e.preventDefault();
    if (!shareholderId) return toast.error('Pilih shareholder');
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return toast.error('Nominal tidak valid');
    if (!/\d{4}-\d{2}-\d{2}/.test(date)) return toast.error('Tanggal format YYYY-MM-DD');
    setSaving(true);
    try {
      await addContribution({ planId: id, shareholderId: Number(shareholderId), amount: Math.round(amt), transferDate: date, note });
      toast.success('Contribution ditambahkan');
      setAmount(''); setDate(''); setNote(''); setShareholderId('');
      fetchAll();
    } catch (e: any) {
      toast.error(e.message || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  }

  async function onClosePlan() {
    if (!confirm('Tutup plan ini?')) return;
    try {
      await updatePlan(id, { period: plan!.period, target_total: plan!.target_total, note: plan!.note, status: 'closed' });
      toast.success('Plan ditutup');
      fetchAll();
    } catch (e: any) { toast.error(e.message || 'Gagal menutup'); }
  }

  async function onDeleteContribution(contrId: number) {
    if (!confirm('Hapus kontribusi ini?')) return;
    try { await deleteContribution(contrId); toast.success('Dihapus'); fetchAll(); }
    catch (e: any) { toast.error(e.message || 'Gagal menghapus'); }
  }

  if (!Number.isFinite(id)) return <div>Invalid ID</div>;
  if (loading || !plan) return <div>Memuat…</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Plan {plan.period}</CardTitle>
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
              <div className="text-xl font-semibold">Rp {fmtID.format(Math.max(0, totals.remaining))}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Progress</div>
              <div className="text-xl font-semibold">{totals.progress}%</div>
              <div className="w-full bg-muted rounded-full h-2 mt-1">
                <div className={`h-2 rounded-full ${totals.progress >= 100 ? 'bg-green-500' : 'bg-primary'}`} style={{ width: `${Math.min(100, totals.progress)}%` }} />
              </div>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            {plan.status !== 'closed' && (
              <Button variant="outline" onClick={onClosePlan}>Close Plan</Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Grid progress per shareholder */}
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {progressRows.map((r) => (
                  <TableRow key={r.shareholder_id}>
                    <TableCell className="font-medium">{r.shareholder_name}</TableCell>
                    <TableCell className="text-right">{r.ownership_percent.toFixed(2)}%</TableCell>
                    <TableCell className="text-right">Rp {fmtID.format(r.obligation)}</TableCell>
                    <TableCell className="text-right">Rp {fmtID.format(r.paid)}</TableCell>
                    <TableCell className="text-right">Rp {fmtID.format(r.remaining)}</TableCell>
                  </TableRow>
                ))}
                {progressRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-10">Tidak ada data</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Contributions */}
      <Card>
        <CardHeader><CardTitle>Contributions</CardTitle></CardHeader>
        <CardContent className="space-y-6">
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
              <Button type="submit" disabled={saving}>{saving ? 'Menyimpan…' : 'Tambah'}</Button>
            </div>
          </form>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Shareholder</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[90px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contriRows.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.transfer_date}</TableCell>
                    <TableCell>{c.shareholders?.name || c.shareholder_id}</TableCell>
                    <TableCell className="text-right">Rp {fmtID.format(c.amount)}</TableCell>
                    <TableCell>{c.status}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" className="text-red-600" onClick={() => onDeleteContribution(c.id)}>Hapus</Button>
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
    </div>
  );
}

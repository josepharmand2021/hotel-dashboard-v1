'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  listLedger,
  addTopup,
  addAdjust,
  addSettlement,
} from '@/features/petty/api';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';

const fmt = new Intl.NumberFormat('id-ID');

type Holder = { id: number; name: string };

export default function PettyCashDetailClient({
  boxId,
  isAdmin,
}: {
  boxId: number;
  isAdmin: boolean;
}) {
  // Filters & data
  const [from, setFrom] = useState<string>('');  // YYYY-MM-DD
  const [to, setTo] = useState<string>('');      // YYYY-MM-DD
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Top Up state (admin only)
  const [source, setSource] = useState<'PT' | 'RAB'>('RAB');
  const [holders, setHolders] = useState<Holder[]>([]);
  const [shareholderId, setShareholderId] = useState<number | undefined>();
  const [topupDate, setTopupDate] = useState<string>('');
  const [topupAmt, setTopupAmt] = useState<string>('');
  const [topupRef, setTopupRef] = useState<string>('');
  const [topupNote, setTopupNote] = useState<string>('');
  const [savingTopup, setSavingTopup] = useState(false);

  // Settlement (admin only)
  const [settleDate, setSettleDate] = useState<string>('');
  const [settleAmt, setSettleAmt] = useState<string>('');
  const [savingSettle, setSavingSettle] = useState(false);

  // Adjustment (admin only)
  const [adjDate, setAdjDate] = useState<string>('');
  const [adjAmt, setAdjAmt] = useState<string>('');
  const [adjDir, setAdjDir] = useState<'in' | 'out'>('in');
  const [savingAdj, setSavingAdj] = useState(false);

  // Load ledger
  async function load() {
    setLoading(true);
    try {
      const data = await listLedger(boxId, from || undefined, to || undefined);
      setRows(data);
    } catch (e: any) {
      toast.error(e.message || 'Gagal memuat ledger');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [boxId, from, to]);

  // Load shareholders (hanya jika admin)
  useEffect(() => {
    if (!isAdmin) return;
    supabase
      .from('shareholders')
      .select('id,name')
      .order('name', { ascending: true })
      .then(({ data, error }) => {
        if (!error) setHolders(data || []);
      });
  }, [isAdmin]);

  const balance = useMemo(
    () => (rows.length ? Number(rows[rows.length - 1].running_balance) : 0),
    [rows]
  );

  // Actions (hard guard di client juga)
  async function doTopup() {
    if (!isAdmin) return;
    const amt = Number(topupAmt);
    if (!topupDate || !amt || amt <= 0) return toast.error('Isi tanggal & amount');
    if (source === 'RAB' && !shareholderId) return toast.error('Pilih shareholder untuk top-up RAB');

    setSavingTopup(true);
    try {
      await addTopup({
        source,
        cashbox_id: boxId,
        txn_date: topupDate,
        amount: amt,
        shareholder_id: source === 'RAB' ? shareholderId! : undefined,
        note: topupNote || null,
        ref_no: topupRef || null,
      });
      setTopupAmt('');
      setTopupDate('');
      setTopupRef('');
      setTopupNote('');
      toast.success('Top Up berhasil');
      await load();
    } catch (e: any) {
      toast.error(e.message || 'Gagal Top Up');
    } finally {
      setSavingTopup(false);
    }
  }

  async function doSettle() {
    if (!isAdmin) return;
    const amt = Number(settleAmt);
    if (!settleDate || !amt || amt <= 0) return toast.error('Isi tanggal & amount');
    setSavingSettle(true);
    try {
      await addSettlement({ cashbox_id: boxId, txn_date: settleDate, amount: amt });
      setSettleAmt('');
      setSettleDate('');
      toast.success('Settlement ditambahkan');
      await load();
    } catch (e: any) {
      toast.error(e.message || 'Gagal settlement');
    } finally {
      setSavingSettle(false);
    }
  }

  async function doAdjust() {
    if (!isAdmin) return;
    const amt = Number(adjAmt);
    if (!adjDate || !amt || amt <= 0) return toast.error('Isi tanggal & amount');
    setSavingAdj(true);
    try {
      await addAdjust({ cashbox_id: boxId, txn_date: adjDate, amount: amt, direction: adjDir });
      setAdjAmt('');
      setAdjDate('');
      toast.success('Adjustment ditambahkan');
      await load();
    } catch (e: any) {
      toast.error(e.message || 'Gagal adjustment');
    } finally {
      setSavingAdj(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-semibold">Petty Cash #{boxId}</h2>
        <div className="text-xl font-semibold">Balance: Rp {fmt.format(balance || 0)}</div>
      </div>

      {/* Quick Actions — HILANG untuk viewer */}
      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Top Up */}
          <Card>
            <CardHeader><CardTitle>Top Up</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <span className="font-medium">Sumber:</span>
                <label className="flex items-center gap-1">
                  <input type="radio" name="src" checked={source === 'PT'} onChange={() => setSource('PT')} />
                  PT
                </label>
                <label className="flex items-center gap-1">
                  <input type="radio" name="src" checked={source === 'RAB'} onChange={() => setSource('RAB')} />
                  RAB
                </label>
              </div>

              {source === 'RAB' && (
                <select
                  className="h-9 rounded-md border px-3 text-sm"
                  value={shareholderId ?? ''}
                  onChange={(e) => setShareholderId(e.target.value ? Number(e.target.value) : undefined)}
                >
                  <option value="">Pilih shareholder…</option>
                  {holders.map((h) => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              )}

              <Input type="date" value={topupDate} onChange={(e) => setTopupDate(e.target.value)} />
              <Input inputMode="numeric" value={topupAmt} onChange={(e) => setTopupAmt(e.target.value)} placeholder="Amount (IDR)" />
              <Input value={topupRef} onChange={(e) => setTopupRef(e.target.value)} placeholder="Ref No (opsional)" />
              <Input value={topupNote} onChange={(e) => setTopupNote(e.target.value)} placeholder="Catatan (opsional)" />
              <Button onClick={doTopup} disabled={savingTopup || (source === 'RAB' && !shareholderId)}>
                {savingTopup ? 'Menyimpan…' : 'Add Top Up'}
              </Button>
            </CardContent>
          </Card>

          {/* Settlement */}
          <Card>
            <CardHeader><CardTitle>Settlement (Setor kembali)</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Input type="date" value={settleDate} onChange={(e) => setSettleDate(e.target.value)} />
              <Input inputMode="numeric" value={settleAmt} onChange={(e) => setSettleAmt(e.target.value)} placeholder="Amount (IDR)" />
              <Button variant="secondary" onClick={doSettle} disabled={savingSettle}>
                {savingSettle ? 'Menyimpan…' : 'Add Settlement'}
              </Button>
            </CardContent>
          </Card>

          {/* Adjustment */}
          <Card>
            <CardHeader><CardTitle>Adjustment</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Button type="button" variant={adjDir === 'in' ? 'default' : 'outline'} onClick={() => setAdjDir('in')}>
                  Adjust In
                </Button>
                <Button type="button" variant={adjDir === 'out' ? 'default' : 'outline'} onClick={() => setAdjDir('out')}>
                  Adjust Out
                </Button>
              </div>
              <Input type="date" value={adjDate} onChange={(e) => setAdjDate(e.target.value)} />
              <Input inputMode="numeric" value={adjAmt} onChange={(e) => setAdjAmt(e.target.value)} placeholder="Amount (IDR)" />
              <Button variant="outline" onClick={doAdjust} disabled={savingAdj}>
                {savingAdj ? 'Menyimpan…' : 'Add Adjustment'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Ledger — tetap terlihat untuk semua role */}
      <Card>
        <CardHeader><CardTitle>Ledger</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2 items-end">
            <div>
              <div className="text-xs text-muted-foreground">From</div>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[170px]" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">To</div>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[170px]" />
            </div>
            <Button variant="outline" onClick={() => { setFrom(''); setTo(''); }}>Reset</Button>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Ref</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead className="text-right">In</TableHead>
                  <TableHead className="text-right">Out</TableHead>
                  <TableHead className="text-right">Running</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>{r.event_date}</TableCell>
                    <TableCell className="uppercase">{r.event_type}</TableCell>
                    <TableCell>{r.ref_no || r.shareholder_name || '—'}</TableCell>
                    <TableCell className="max-w-[360px] truncate" title={r.note || ''}>
                      {r.note || '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.signed_amount > 0 ? `Rp ${fmt.format(r.amount)}` : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.signed_amount < 0 ? `Rp ${fmt.format(r.amount)}` : '—'}
                    </TableCell>
                    <TableCell className={`text-right ${Number(r.running_balance) < 0 ? 'text-red-600' : ''}`}>
                      Rp {fmt.format(Number(r.running_balance) || 0)}
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                      {loading ? 'Memuat…' : 'Tidak ada data'}
                    </TableCell>
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

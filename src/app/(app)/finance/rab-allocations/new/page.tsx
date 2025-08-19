'use client';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { listActiveShareholders, upsertAllocationsForMonth } from '@/features/rab/api';
import type { RabMonthGridRow } from '@/features/rab/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const fmtID = new Intl.NumberFormat('id-ID');

type Sh = { id: number; name: string; ownership_percent: number };

enum Step { Form=1, Preview=2 }

function distributeByOwnership(shareholders: Sh[], total: number) {
  const exact = shareholders.map(s => ({ id: s.id, name: s.name, pct: s.ownership_percent || 0, exact: (total * (s.ownership_percent || 0))/100 }));
  const floors = exact.map(x => ({ id: x.id, name: x.name, floor: Math.floor(x.exact), frac: x.exact - Math.floor(x.exact), pct: x.pct }));
  const sumFloor = floors.reduce((s,x)=> s + x.floor, 0);
  let rem = Math.round(total - sumFloor);
  floors.sort((a,b) => (b.frac - a.frac) || (b.pct - a.pct) || (a.id - b.id));
  const addOne = new Set<number>();
  for (let i=0; i<floors.length && rem>0; i++, rem--) addOne.add(floors[i].id);
  const result = floors.map(f => ({ shareholder_id: f.id, shareholder_name: f.name, amount: f.floor + (addOne.has(f.id)?1:0), pct: f.pct }));
  return result;
}

export default function NewRabAllocationWizard(){
  const router = useRouter();
  const [step, setStep] = useState<Step>(Step.Form);
  const [month, setMonth] = useState(''); // YYYY-MM
  const [total, setTotal] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const [rows, setRows] = useState<{ shareholder_id: number; shareholder_name: string; pct: number; amount: number }[]>([]);
  const [edit, setEdit] = useState<Record<number,string>>({});

  async function onFormSubmit(e: React.FormEvent){
    e.preventDefault();
    if (!/^\d{4}-\d{2}$/.test(month)) return toast.error('Format bulan YYYY-MM');
    const totalNum = Number(total);
    if (!Number.isFinite(totalNum) || totalNum <= 0) return toast.error('Total Amount harus > 0');
    setLoading(true);
    try{
      const sh = await listActiveShareholders();
      if (sh.length === 0) return toast.error('Belum ada shareholder aktif');
      const dist = distributeByOwnership(sh, totalNum);
      setRows(dist);
      const init: Record<number,string> = {};
      dist.forEach(d => { init[d.shareholder_id] = String(d.amount); });
      setEdit(init);
      setStep(Step.Preview);
    }catch(e:any){ toast.error(e.message||'Gagal memuat shareholder'); }
    finally{ setLoading(false); }
  }

  const sumAllocated = useMemo(()=> Object.entries(edit).reduce((s,[k,v])=> s + (Number(v)||0), 0), [edit]);
  const diff = useMemo(()=> Number(total||0) - sumAllocated, [total, sumAllocated]);

  async function onSave(){
    const totalNum = Number(total);
    if (sumAllocated !== totalNum) return toast.error(`Total alokasi (Rp ${fmtID.format(sumAllocated)}) harus sama dengan Total Amount (Rp ${fmtID.format(totalNum)})`);
    setLoading(true);
    try{
      const payload = rows.map(r => ({ shareholder_id: r.shareholder_id, amount: Number(edit[r.shareholder_id]||0), note: note || null }));
      await upsertAllocationsForMonth(month, payload);
      toast.success('Alokasi disimpan');
      router.push(`/finance/rab-allocations/${month}`);
    }catch(e:any){ toast.error(e.message||'Gagal menyimpan'); }
    finally{ setLoading(false); }
  }

  return (
    <div className="max-w-3xl space-y-6">
      {step===Step.Form && (
        <form onSubmit={onFormSubmit} className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Create New RAB Allocation</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Month (YYYY-MM)</Label>
                  <Input required value={month} onChange={(e)=>setMonth(e.target.value)} placeholder="2025-09" />
                </div>
                <div className="space-y-2">
                  <Label>Total Amount (IDR)</Label>
                  <Input required inputMode="numeric" value={total} onChange={(e)=>setTotal(e.target.value)} placeholder="2000000000" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={note} onChange={(e)=>setNote(e.target.value)} placeholder="Contoh: Alokasi September 2025" />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={()=>history.back()}>Batal</Button>
                <Button type="submit" disabled={loading}>{loading? 'Memproses…':'Distribute'}</Button>
              </div>
            </CardContent>
          </Card>
        </form>
      )}

      {step===Step.Preview && (
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Preview Distribution — {month}</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={()=>setStep(Step.Form)}>Back</Button>
              <Button onClick={onSave} disabled={loading}>{loading? 'Menyimpan…':'Save'}</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground mb-2">Notes: {note || '—'}</div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Shareholder</TableHead>
                    <TableHead className="text-right">Ownership %</TableHead>
                    <TableHead className="text-right">Amount (editable)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(r => (
                    <TableRow key={r.shareholder_id}>
                      <TableCell className="font-medium">{r.shareholder_name}</TableCell>
                      <TableCell className="text-right">{(r.pct||0).toFixed(2)}%</TableCell>
                      <TableCell className="text-right">
                        <Input className="text-right" inputMode="numeric" value={edit[r.shareholder_id] ?? String(r.amount)} onChange={(e)=>setEdit(v=>({ ...v, [r.shareholder_id]: e.target.value }))} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {rows.length===0 && (
                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-10">Belum ada shareholder aktif</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 text-right space-y-1">
              <div><b>Total Amount:</b> Rp {fmtID.format(Number(total||0))}</div>
              <div><b>Allocated:</b> Rp {fmtID.format(sumAllocated)} {diff!==0 && <span className="text-red-600">(selisih Rp {fmtID.format(Math.abs(diff))})</span>}</div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
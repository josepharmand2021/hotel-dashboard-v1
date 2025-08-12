'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createExpense } from '@/features/expenses/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';

type Source = 'RAB'|'PT'|'PETTY';

export default function NewExpensePage() {
  const router = useRouter();
  const [source, setSource] = useState<Source>('RAB');

  // masters
  const [shareholders, setShareholders] = useState<{id:number; name:string}[]>([]);
  const [accounts, setAccounts]       = useState<{id:number; name:string}[]>([]);
  const [cashboxes, setCashboxes]     = useState<{id:number; name:string}[]>([]);

  // fields
  const [shareholderId, setShareholderId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [cashboxId, setCashboxId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [vendor, setVendor] = useState('');
  const [invoice, setInvoice] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(()=>{ (async()=>{
    const [{ data:sh }, { data:acc }, { data:box }] = await Promise.all([
      supabase.from('shareholders').select('id,name').eq('active', true).order('name'),
      supabase.from('bank_accounts').select('id,name').order('name'),
      supabase.from('petty_cash_boxes').select('id,name').order('name'),
    ]);
    if (sh) setShareholders(sh);
    if (acc) setAccounts(acc);
    if (box) setCashboxes(box);
  })(); },[]);

  useEffect(()=>{ setShareholderId(''); setAccountId(''); setCashboxId(''); }, [source]);

  async function onSubmit(e: React.FormEvent){
    e.preventDefault();
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt<=0) return toast.error('Amount tidak valid');

    if (source==='RAB'   && !shareholderId) return toast.error('Pilih shareholder');
    if (source==='PT'    && !accountId)     return toast.error('Pilih account PT');
    if (source==='PETTY' && !cashboxId)     return toast.error('Pilih cashbox');

    setSaving(true);
    try{
      await createExpense({
        source,
        shareholder_id: source==='RAB'   ? Number(shareholderId) : null,
        account_id:     source==='PT'    ? Number(accountId)     : null,
        cashbox_id:     source==='PETTY' ? Number(cashboxId)     : null,
        expense_date: date,
        amount: Math.round(amt),
        category: category || null,
        vendor: vendor || null,
        invoice_no: invoice || null,
        note: note || null,
        status: 'posted', // langsung posted (Phase 1)
      });
      toast.success('Expense dibuat');
      router.push('/finance/expenses');
    }catch(e:any){ toast.error(e.message || 'Gagal menyimpan'); }
    finally{ setSaving(false); }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-6">
      <Card>
        <CardHeader><CardTitle>New Expense</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Source</Label>
            <Select value={source} onValueChange={(v:any)=>setSource(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="RAB">RAB</SelectItem>
                <SelectItem value="PT">PT</SelectItem>
                <SelectItem value="PETTY">PETTY</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {source==='RAB' && (
            <div className="space-y-1">
              <Label>Shareholder</Label>
              <Select value={shareholderId} onValueChange={setShareholderId}>
                <SelectTrigger><SelectValue placeholder="Pilih shareholder" /></SelectTrigger>
                <SelectContent>
                  {shareholders.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          {source==='PT' && (
            <div className="space-y-1">
              <Label>Account</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger><SelectValue placeholder="Pilih account PT" /></SelectTrigger>
                <SelectContent>
                  {accounts.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          {source==='PETTY' && (
            <div className="space-y-1">
              <Label>Cashbox</Label>
              <Select value={cashboxId} onValueChange={setCashboxId}>
                <SelectTrigger><SelectValue placeholder="Pilih cashbox" /></SelectTrigger>
                <SelectContent>
                  {cashboxes.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e)=>setDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Amount (IDR)</Label>
            <Input inputMode="numeric" value={amount} onChange={(e)=>setAmount(e.target.value)} placeholder="50000000" />
          </div>
          <div className="space-y-1">
            <Label>Category</Label>
            <Input value={category} onChange={(e)=>setCategory(e.target.value)} placeholder="Material / Jasa" />
          </div>
          <div className="space-y-1">
            <Label>Vendor</Label>
            <Input value={vendor} onChange={(e)=>setVendor(e.target.value)} placeholder="Nama vendor" />
          </div>
          <div className="space-y-1">
            <Label>Invoice No</Label>
            <Input value={invoice} onChange={(e)=>setInvoice(e.target.value)} placeholder="Opsional" />
          </div>
          <div className="md:col-span-2 space-y-1">
            <Label>Note</Label>
            <Input value={note} onChange={(e)=>setNote(e.target.value)} placeholder="Keterangan" />
          </div>

          <div className="md:col-span-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={()=>history.back()}>Batal</Button>
            <Button type="submit" disabled={saving}>{saving?'Menyimpan…':'Simpan'}</Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

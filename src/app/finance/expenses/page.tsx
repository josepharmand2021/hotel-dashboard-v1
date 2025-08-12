'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listExpenses, setExpenseStatus, deleteExpense } from '@/features/expenses/api';
import type { Expense } from '@/features/expenses/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const fmtID = new Intl.NumberFormat('id-ID');

export default function ExpensesListPage(){
  const [rows, setRows] = useState<(Expense & { shareholder_name?: string|null; account_name?: string|null; cashbox_name?: string|null })[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'all'|'draft'|'posted'|'void'>('all');
  const [source, setSource] = useState<'all'|'RAB'|'PT'|'PETTY'>('all');
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');

  async function fetchAll() {
    setLoading(true);
    try {
      const data = await listExpenses({
        status, source,
        from: from || undefined,
        to: to || undefined,
      });
      setRows(data);
    } catch (e:any) {
      toast.error(e.message || 'Gagal memuat');
    } finally { setLoading(false); }
  }

  useEffect(()=>{ fetchAll(); }, [status, source, from, to]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">Expenses</h2>
        <Button asChild><Link href="/finance/expenses/new">New Expense</Link></Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <label className="text-sm text-muted-foreground">Source</label>
            <Select value={source} onValueChange={(v:any)=>setSource(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="RAB">RAB</SelectItem>
                <SelectItem value="PT">PT</SelectItem>
                <SelectItem value="PETTY">PETTY</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Status</label>
            <Select value={status} onValueChange={(v:any)=>setStatus(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="posted">Posted</SelectItem>
                <SelectItem value="void">Void</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">From</label>
            <Input type="date" value={from} onChange={(e)=>setFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">To</label>
            <Input type="date" value={to} onChange={(e)=>setTo(e.target.value)} />
          </div>
          <div className="flex items-end"><Button variant="outline" onClick={fetchAll}>Apply</Button></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>All Expenses</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[180px] text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && Array.from({length:6}).map((_,i)=>(
                  <TableRow key={`s-${i}`}>
                    <TableCell><div className="h-4 w-24 bg-muted animate-pulse rounded"/></TableCell>
                    <TableCell><div className="h-4 w-14 bg-muted animate-pulse rounded"/></TableCell>
                    <TableCell><div className="h-4 w-32 bg-muted animate-pulse rounded"/></TableCell>
                    <TableCell><div className="h-4 w-24 bg-muted animate-pulse rounded"/></TableCell>
                    <TableCell><div className="h-4 w-20 bg-muted animate-pulse rounded"/></TableCell>
                    <TableCell className="text-right"><div className="h-4 w-24 bg-muted animate-pulse rounded ml-auto"/></TableCell>
                    <TableCell><div className="h-5 w-12 bg-muted animate-pulse rounded"/></TableCell>
                    <TableCell />
                  </TableRow>
                ))}
                {!loading && rows.map(r=>(
                  <TableRow key={r.id}>
                    <TableCell>{r.expense_date}</TableCell>
                    <TableCell>{r.source}</TableCell>
                    <TableCell>
                      {r.source==='RAB'   ? (r.shareholder_name || r.shareholder_id)
                      : r.source==='PT'    ? (r.account_name     || r.account_id)
                      : r.source==='PETTY' ? (r.cashbox_name     || r.cashbox_id)
                      : '-' }
                    </TableCell>
                    <TableCell>{r.vendor || '-'}</TableCell>
                    <TableCell>{r.category || '-'}</TableCell>
                    <TableCell className="text-right">Rp {fmtID.format(r.amount)}</TableCell>
                    <TableCell>
                      {r.status==='posted'
                        ? <Badge>posted</Badge>
                        : r.status==='void'
                        ? <Badge variant="secondary">void</Badge>
                        : <Badge variant="outline">draft</Badge>}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {r.status!=='posted' && (
                        <Button size="sm" variant="outline"
                          onClick={()=>setExpenseStatus(r.id,'posted').then(fetchAll).then(()=>toast.success('Posted')).catch((e:any)=>toast.error(e.message||'Gagal'))}>
                          Post
                        </Button>
                      )}
                      {r.status==='posted' && (
                        <Button size="sm" variant="outline"
                          onClick={()=>setExpenseStatus(r.id,'void').then(fetchAll).then(()=>toast.success('Voided')).catch((e:any)=>toast.error(e.message||'Gagal'))}>
                          Void
                        </Button>
                      )}
                      {r.status!=='posted' && (
                        <Button size="sm" variant="ghost" className="text-red-600"
                          onClick={()=>{ if(confirm('Hapus expense ini?')) deleteExpense(r.id).then(fetchAll).then(()=>toast.success('Dihapus')).catch((e:any)=>toast.error(e.message||'Gagal')); }}>
                          Hapus
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && rows.length===0 && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-10">Tidak ada data</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

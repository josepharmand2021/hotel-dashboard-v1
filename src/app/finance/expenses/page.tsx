'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ExpenseTable } from '@/components/ExpenseTable';
import { listExpenses, listCategories, listSubcategories, listActiveShareholders } from '@/features/expenses/api';
import type { Category, Subcategory, Shareholder } from '@/features/expenses/api';
import type { ExpenseListItem } from '@/features/expenses/types';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { toast } from 'sonner';
import Link from 'next/link';

const pageSizes = [10, 20, 50, 100];
const fmtID = new Intl.NumberFormat('id-ID');

export default function ExpensesListPage() {
  const router = useRouter();
  const sp = useSearchParams();

  // filters state
  const [month, setMonth] = useState<string>(sp.get('month') || '');
  const [source, setSource] = useState<'RAB'|'PT'|'PETTY'|'all'>((sp.get('source') as any) || 'all');
  const [status, setStatus] = useState<'posted'|'draft'|'void'|'all'>((sp.get('status') as any) || 'all');

  // >>> gunakan 'all' sebagai sentinel, bukan string kosong
  const [categoryId, setCategoryId] = useState<string>(sp.get('category_id') || 'all');
  const [subcategoryId, setSubcategoryId] = useState<string>(sp.get('subcategory_id') || 'all');
  const [shareholderId, setShareholderId] = useState<string>(sp.get('shareholder_id') || 'all');

  // pagination
  const [page, setPage] = useState<number>(Number(sp.get('page') || 1));
  const [pageSize, setPageSize] = useState<number>(Number(sp.get('pageSize') || 20));

  // data
  const [cats, setCats] = useState<Category[]>([]);
  const [subs, setSubs] = useState<Subcategory[]>([]);
  const [shs, setShs] = useState<Shareholder[]>([]);
  const [rows, setRows] = useState<ExpenseListItem[]>([]);
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  async function loadSubs(cid?: string) {
    try {
      // kalau 'all', ambil semua subcategory
      const s = await listSubcategories(cid && cid !== 'all' ? Number(cid) : undefined);
      setSubs(s);
    } catch (e:any) {
      toast.error(e.message || 'Gagal memuat subcategory');
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const [c, s, h] = await Promise.all([listCategories(), listSubcategories(), listActiveShareholders()]);
        setCats(c); setSubs(s); setShs(h);
      } catch (e:any) { toast.error(e.message || 'Gagal memuat master data'); }
    })();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const { rows, count } = await listExpenses({
        month: month || undefined,
        source, status,
        category_id: categoryId !== 'all' ? Number(categoryId) : undefined,
        subcategory_id: subcategoryId !== 'all' ? Number(subcategoryId) : undefined,
        shareholder_id: shareholderId !== 'all' ? Number(shareholderId) : undefined,
        page, pageSize,
        q: undefined,
        orderBy: 'expense_date', orderDir: 'desc',
      });
      setRows(rows); setCount(count);
    } catch (e:any) {
      toast.error(e.message || 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }

  // fetch on filter change
  useEffect(() => { fetchData(); /* eslint-disable-next-line */ }, [month, source, status, categoryId, subcategoryId, shareholderId, page, pageSize]);

  // reset page when main filters change
  useEffect(() => { setPage(1); /* eslint-disable-next-line */ }, [month, source, status, categoryId, subcategoryId, shareholderId]);

  // keep subcategories synced
  useEffect(() => {
    loadSubs(categoryId);
    // kalau ganti category, defaultkan subcategory ke 'all'
    setSubcategoryId('all');
  }, [categoryId]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(count / pageSize)), [count, pageSize]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Expenses</h2>
        <Button asChild><Link href="/finance/expenses/new">New Expense</Link></Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-sm block mb-1">Month</label>
            <Input type="month" value={month} onChange={(e)=>setMonth(e.target.value)} placeholder="YYYY-MM" />
          </div>

          <div>
            <label className="text-sm block mb-1">Source</label>
            <Select value={source} onValueChange={(v:any)=>setSource(v)}>
              <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="RAB">RAB</SelectItem>
                <SelectItem value="PT">PT</SelectItem>
                <SelectItem value="PETTY">PETTY</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm block mb-1">Status</label>
            <Select value={status} onValueChange={(v:any)=>setStatus(v)}>
              <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="posted">Posted</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="void">Void</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm block mb-1">Category</label>
            <Select value={categoryId} onValueChange={(v)=>setCategoryId(v)}>
              <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {cats.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm block mb-1">Subcategory</label>
            <Select value={subcategoryId} onValueChange={(v)=>setSubcategoryId(v)}>
              <SelectTrigger><SelectValue placeholder={categoryId === 'all' ? 'All' : 'All'} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {subs
                  .filter(s => categoryId === 'all' || s.category_id === Number(categoryId))
                  .map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm block mb-1">Shareholder</label>
            <Select value={shareholderId} onValueChange={(v)=>setShareholderId(v)}>
              <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {shs.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm">Page size</label>
            <Select value={String(pageSize)} onValueChange={(v)=>setPageSize(Number(v))}>
              <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {pageSizes.map(s => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button
              type="button"
              variant="outline"
              onClick={()=>{
                setMonth('');
                setSource('all');
                setStatus('all');
                setCategoryId('all');
                setSubcategoryId('all');
                setShareholderId('all');
                setPage(1);
              }}
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Expenses</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <ExpenseTable
            rows={rows}
            loading={loading}
            show={{ source: true, status: true, shareholder: true, category: true, subcategory: true, vendor: true, invoice: true, note: false, period: false, po: true }}
            onRowClick={(r)=> router.push(`/finance/expenses/${r.id}`)}
          />

          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Total: <b>{fmtID.format(count)}</b> rows</div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Prev</Button>
              <div className="text-sm">Page {page} / {Math.max(1, Math.ceil(count / pageSize))}</div>
              <Button variant="outline" size="sm" disabled={page>=Math.max(1, Math.ceil(count / pageSize))} onClick={()=>setPage(p=>p+1)}>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

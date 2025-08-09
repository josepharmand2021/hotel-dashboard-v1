'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type Cat = { id: number; name: string };
type Sub = { id: number; name: string; category_id: number };

type ByCatSub = {
  category_id: number;
  subcategory_id: number;
  allocated: number;
  actual: number;
  available: number;
};

type ByLine = {
  id: number;
  category_id: number;
  subcategory_id: number;
  description: string | null;
  allocated: number;
  actual: number;
  available: number;
};

type ByCat = { category_id: number; allocated: number; actual: number; available: number };

export default function BudgetReportPage() {
  // masters
  const [cats, setCats] = useState<Cat[]>([]);
  const [subs, setSubs] = useState<Sub[]>([]);

  // filters
  const [catId, setCatId] = useState<number | undefined>();
  const [subId, setSubId] = useState<number | undefined>();
  const [q, setQ] = useState(''); // hanya untuk By Line

  // data
  const [loading, setLoading] = useState(true);
  const [rowsCatSub, setRowsCatSub] = useState<ByCatSub[]>([]);
  const [rowsLine, setRowsLine] = useState<ByLine[]>([]);

  const fmt = useMemo(() => new Intl.NumberFormat('id-ID'), []);

  useEffect(() => {
    (async () => {
      const [c1, s1] = await Promise.all([
        supabase.from('categories').select('id,name').order('name'),
        supabase.from('subcategories').select('id,name,category_id').order('name'),
      ]);
      if (c1.error) toast.error(c1.error.message);
      else setCats((c1.data ?? []) as Cat[]);
      if (s1.error) toast.error(s1.error.message);
      else setSubs((s1.data ?? []) as Sub[]);
    })();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      // by cat+sub (pool)
      let q1 = supabase
        .from('v_budget_by_cat_sub')
        .select('category_id,subcategory_id,allocated,actual,available');
      if (catId) q1 = q1.eq('category_id', catId);
      if (subId) q1 = q1.eq('subcategory_id', subId);
      const r1 = await q1;
      if (r1.error) throw r1.error;
      setRowsCatSub((r1.data ?? []) as ByCatSub[]);

      // by line
      let q2 = supabase
        .from('v_budget_by_line')
        .select('id,category_id,subcategory_id,description,allocated,actual,available')
        .order('id', { ascending: false });
      if (catId) q2 = q2.eq('category_id', catId);
      if (subId) q2 = q2.eq('subcategory_id', subId);
      if (q.trim()) q2 = q2.ilike('description', `%${q.trim()}%`);
      const r2 = await q2;
      if (r2.error) throw r2.error;
      setRowsLine((r2.data ?? []) as ByLine[]);
    } catch (e: any) {
      toast.error(e.message || 'Gagal memuat');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(loadData, 200);
    return () => clearTimeout(t);
  }, [catId, subId, q]);

  const subsFiltered = useMemo(
    () => (catId ? subs.filter((s) => s.category_id === catId) : subs),
    [subs, catId]
  );

  const catName = (id?: number) => cats.find((c) => c.id === id)?.name ?? `#${id ?? ''}`;
  const subName = (id?: number) => subs.find((s) => s.id === id)?.name ?? `#${id ?? ''}`;

  const sum = (arr: Array<{ allocated: number; actual: number; available: number }>) =>
    arr.reduce(
      (a, r) => ({
        allocated: a.allocated + Number(r.allocated || 0),
        actual: a.actual + Number(r.actual || 0),
        available: a.available + Number(r.available || 0),
      }),
      { allocated: 0, actual: 0, available: 0 }
    );

  // total untuk tab existing
  const tCatSub = sum(rowsCatSub);
  const tLine = sum(rowsLine);

  // ============ NEW: agregasi per Category ============
  const rowsByCat: ByCat[] = useMemo(() => {
    const map = new Map<number, ByCat>();
    for (const r of rowsCatSub) {
      const curr = map.get(r.category_id) ?? { category_id: r.category_id, allocated: 0, actual: 0, available: 0 };
      curr.allocated += Number(r.allocated || 0);
      curr.actual += Number(r.actual || 0);
      curr.available += Number(r.available || 0);
      map.set(r.category_id, curr);
    }
    const arr = Array.from(map.values());
    return catId ? arr.filter((x) => x.category_id === catId) : arr;
  }, [rowsCatSub, catId]);

  const tCat = sum(rowsByCat);
  // ====================================================

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Budget Report</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setCatId(undefined); setSubId(undefined); setQ(''); }}>
            Reset Filter
          </Button>
          <Button onClick={loadData} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6 grid gap-3 md:grid-cols-4">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Category</div>
            <Select
              value={catId ? String(catId) : 'ALL'}
              onValueChange={(v) => {
                const next = v === 'ALL' ? undefined : Number(v);
                setCatId(next);
                setSubId(undefined);
              }}
            >
              <SelectTrigger><SelectValue placeholder="Semua Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Category</SelectItem>
                {cats.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Subcategory</div>
            <Select
              value={subId ? String(subId) : 'ALL'}
              onValueChange={(v) => setSubId(v === 'ALL' ? undefined : Number(v))}
              disabled={!subsFiltered.length}
            >
              <SelectTrigger><SelectValue placeholder="Semua Subcategory" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Subcategory</SelectItem>
                {subsFiltered.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2">
            <div className="text-xs text-muted-foreground mb-1">Cari Deskripsi (By Line)</div>
            <Input placeholder="mis. Besi lantai, HVAC…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="cat" className="w-full">
        <TabsList>
          <TabsTrigger value="catOnly">By Category</TabsTrigger> {/* NEW */}
          <TabsTrigger value="cat">By Category+Subcategory</TabsTrigger>
          <TabsTrigger value="line">By Line</TabsTrigger>
        </TabsList>

        {/* NEW: By Category */}
        <TabsContent value="catOnly" className="space-y-3">
          <Summary allocated={tCat.allocated} actual={tCat.actual} available={tCat.available} fmt={fmt} />
          <TableCat rows={rowsByCat} catName={catName} fmt={fmt} loading={loading} />
        </TabsContent>

        {/* By Cat+Sub */}
        <TabsContent value="cat" className="space-y-3">
          <Summary allocated={tCatSub.allocated} actual={tCatSub.actual} available={tCatSub.available} fmt={fmt} />
          <TableCatSub rows={rowsCatSub} catName={catName} subName={subName} fmt={fmt} loading={loading} />
        </TabsContent>

        {/* By Line */}
        <TabsContent value="line" className="space-y-3">
          <Summary allocated={tLine.allocated} actual={tLine.actual} available={tLine.available} fmt={fmt} />
          <TableLine rows={rowsLine} catName={catName} subName={subName} fmt={fmt} loading={loading} />
        </TabsContent>

      </Tabs>
    </div>
  );
}

/* --- Small components --- */

function Summary({ allocated, actual, available, fmt }: any) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Ringkasan</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Badge variant="secondary">Allocated: Rp {fmt.format(allocated)}</Badge>
        <Badge variant="outline">Actual: Rp {fmt.format(actual)}</Badge>
        <Badge className={available < 0 ? 'bg-red-600 text-white' : ''}>
          Available: Rp {fmt.format(available)}
        </Badge>
      </CardContent>
    </Card>
  );
}

function TableCatSub({
  rows, catName, subName, fmt, loading,
}: { rows: ByCatSub[]; catName: (id?: number) => string; subName: (id?: number) => string; fmt: Intl.NumberFormat; loading: boolean; }) {
  return (
    <div className="border rounded-md overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-3 py-2 text-left">Category</th>
            <th className="px-3 py-2 text-left">Subcategory</th>
            <th className="px-3 py-2 text-right">Allocated</th>
            <th className="px-3 py-2 text-right">Actual</th>
            <th className="px-3 py-2 text-right">Available</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">Loading…</td></tr>
          ) : rows.length === 0 ? (
            <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">Tidak ada data</td></tr>
          ) : (
            rows.map((r, i) => (
              <tr key={`${r.category_id}-${r.subcategory_id}-${i}`} className="border-t">
                <td className="px-3 py-2">{catName(r.category_id)}</td>
                <td className="px-3 py-2">{subName(r.subcategory_id)}</td>
                <td className="px-3 py-2 text-right">Rp {fmt.format(r.allocated)}</td>
                <td className="px-3 py-2 text-right">Rp {fmt.format(r.actual)}</td>
                <td className={`px-3 py-2 text-right ${r.available < 0 ? 'text-red-600 font-medium' : ''}`}>
                  Rp {fmt.format(r.available)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function TableLine({
  rows, catName, subName, fmt, loading,
}: { rows: ByLine[]; catName: (id?: number) => string; subName: (id?: number) => string; fmt: Intl.NumberFormat; loading: boolean; }) {
  return (
    <div className="border rounded-md overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-3 py-2 text-left">Category</th>
            <th className="px-3 py-2 text-left">Subcategory</th>
            <th className="px-3 py-2 text-left">Description</th>
            <th className="px-3 py-2 text-right">Allocated</th>
            <th className="px-3 py-2 text-right">Actual</th>
            <th className="px-3 py-2 text-right">Available</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">Loading…</td></tr>
          ) : rows.length === 0 ? (
            <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">Tidak ada data</td></tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">{catName(r.category_id)}</td>
                <td className="px-3 py-2">{subName(r.subcategory_id)}</td>
                <td className="px-3 py-2">{r.description ?? '—'}</td>
                <td className="px-3 py-2 text-right">Rp {fmt.format(r.allocated)}</td>
                <td className="px-3 py-2 text-right">Rp {fmt.format(r.actual)}</td>
                <td className={`px-3 py-2 text-right ${r.available < 0 ? 'text-red-600 font-medium' : ''}`}>
                  Rp {fmt.format(r.available)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// NEW: table per Category
function TableCat({
  rows, catName, fmt, loading,
}: { rows: ByCat[]; catName: (id?: number) => string; fmt: Intl.NumberFormat; loading: boolean; }) {
  return (
    <div className="border rounded-md overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-3 py-2 text-left">Category</th>
            <th className="px-3 py-2 text-right">Allocated</th>
            <th className="px-3 py-2 text-right">Actual</th>
            <th className="px-3 py-2 text-right">Available</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">Loading…</td></tr>
          ) : rows.length === 0 ? (
            <tr><td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">Tidak ada data</td></tr>
          ) : (
            rows.map((r) => (
              <tr key={r.category_id} className="border-t">
                <td className="px-3 py-2">{catName(r.category_id)}</td>
                <td className="px-3 py-2 text-right">Rp {fmt.format(r.allocated)}</td>
                <td className="px-3 py-2 text-right">Rp {fmt.format(r.actual)}</td>
                <td className={`px-3 py-2 text-right ${r.available < 0 ? 'text-red-600 font-medium' : ''}`}>
                  Rp {fmt.format(r.available)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

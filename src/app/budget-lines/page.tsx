'use client';

import { useEffect, useState } from 'react';
import { listBudgetLines, deleteBudgetLine, BudgetLine } from '@/features/budget-lines/api';
import { listCategoriesBasic } from '@/features/masters/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import BudgetLineForm from '@/features/budget-lines/BudgetLineForm';

export default function BudgetLinesPage() {
  const [rows, setRows] = useState<BudgetLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [filterCat, setFilterCat] = useState<number | undefined>();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState<null | { id?: number }>(null);

  async function loadData() {
    setLoading(true);
    try {
      const res = await listBudgetLines({ q: search, category_id: filterCat });
      setRows(res.rows);
    } catch (e: any) {
      toast.error(e?.message || 'Gagal memuat');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, [search, filterCat]);

  useEffect(() => {
    listCategoriesBasic().then(setCategories).catch((e) => toast.error(e?.message || 'Gagal load kategori'));
  }, []);

  async function onDelete(id: number) {
    if (!confirm('Hapus budget line ini?')) return;
    try {
      await deleteBudgetLine(id);
      toast.success('Berhasil dihapus');
      loadData();
    } catch (e: any) {
      toast.error(e?.message || 'Gagal menghapus');
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Budget Lines</h1>
        <Button onClick={() => setShowForm({})}>Tambah</Button>
      </div>

      {/* Filter & Search */}
      <div className="flex items-center gap-2">
        <Select
          value={filterCat ? String(filterCat) : 'ALL'}
          onValueChange={(val) => setFilterCat(val === 'ALL' ? undefined : Number(val))}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua Category</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          placeholder="Cari deskripsi…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
      </div>

      {/* Table */}
      <div className="border rounded-md overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-3 py-2 text-left">Category</th>
              <th className="px-3 py-2 text-left">Subcategory</th>
              <th className="px-3 py-2 text-left">Description</th>
              <th className="px-3 py-2 text-right">Amount</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">{r.category_name}</td>
                <td className="px-3 py-2">{r.subcategory_name}</td>
                <td className="px-3 py-2">{r.description || '—'}</td>
                <td className="px-3 py-2 text-right">{r.amount.toLocaleString('id-ID')}</td>
                <td className="px-3 py-2 text-right space-x-2">
                  <Button variant="outline" size="sm" onClick={() => setShowForm({ id: r.id })}>Edit</Button>
                  <Button variant="destructive" size="sm" onClick={() => onDelete(r.id)}>Hapus</Button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-muted-foreground">Tidak ada data</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Form Modal */}
      {showForm && (
        <BudgetLineForm
          id={showForm.id}
          onClose={() => {
            setShowForm(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}

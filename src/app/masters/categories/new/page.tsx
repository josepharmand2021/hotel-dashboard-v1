'use client';

import { useEffect, useMemo, useState } from 'react';
import { listCategories, deleteCategory, Category } from '@/features/masters/api';
import CategoryForm from '@/features/masters/CategoryForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

const PAGE_SIZE = 10;

export default function CategoriesPage() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

  const [openConfirm, setOpenConfirm] = useState(false);
  const [toDelete, setToDelete] = useState<Category | null>(null);

  async function load() {
    setLoading(true);
    try {
      const { rows, total } = await listCategories({ q, page, pageSize: PAGE_SIZE });
      setRows(rows); setTotal(total);
    } catch (e: any) {
      toast.error(e?.message || 'Gagal memuat kategori');
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [page]);
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); load(); }, 350);
    return () => clearTimeout(t);
  }, [q]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  function onCreate() { setEditing(null); setOpenForm(true); }
  function onEdit(row: Category) { setEditing(row); setOpenForm(true); }
  function confirmDelete(row: Category) { setToDelete(row); setOpenConfirm(true); }

  async function onDelete() {
    if (!toDelete) return;
    try {
      await deleteCategory(toDelete.id);
      toast.success('Kategori dihapus');
      setOpenConfirm(false);
      load();
    } catch (e: any) {
      if (e?.message?.toLowerCase?.().includes('foreign key')) {
        toast.error('Tidak bisa dihapus: masih dipakai Subcategory. Hapus/ubah subcategory dulu.');
      } else {
        toast.error(e?.message || 'Gagal menghapus');
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Categories</h1>
          <p className="text-sm text-muted-foreground">Master data untuk pengelompokan Budget & Expenses.</p>
        </div>
        <Button onClick={onCreate}>+ Tambah</Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama kategori…" className="max-w-sm" />
        <Badge variant="outline">Total: {total}</Badge>
      </div>

      {/* Table */}
      <div className="rounded-2xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">ID</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead className="w-52">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={3} className="py-6 text-muted-foreground">Loading…</TableCell></TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                  {q ? 'Tidak ada hasil.' : 'Belum ada kategori. Tambahkan dulu.'}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.id}</TableCell>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => onEdit(r)}>Edit</Button>
                      <Button variant="destructive" size="sm" onClick={() => confirmDelete(r)}>Hapus</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Prev</Button>
        <span className="text-sm text-muted-foreground">Page <b>{page}</b> / {totalPages}</span>
        <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</Button>
      </div>

      {/* Dialog: Create/Edit */}
      <CategoryForm open={openForm} onOpenChange={setOpenForm} onSaved={load} initial={editing} />

      {/* Confirm Delete */}
      <Dialog open={openConfirm} onOpenChange={setOpenConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Hapus Category</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Hapus <b>{toDelete?.name}</b>? Tindakan ini tidak bisa dibatalkan.</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenConfirm(false)}>Batal</Button>
            <Button variant="destructive" onClick={onDelete}>Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

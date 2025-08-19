'use client';

import { useEffect, useMemo, useState } from 'react';
import { listSubcategories, deleteSubcategory, Subcategory } from '@/features/masters/api';
import SubcategoryForm from '@/features/masters/SubcategoryForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

const PAGE_SIZE = 10;

export default function SubcategoriesPage() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Subcategory[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Subcategory | null>(null);

  const [openConfirm, setOpenConfirm] = useState(false);
  const [toDelete, setToDelete] = useState<Subcategory | null>(null);

  async function load() {
    setLoading(true);
    try {
      const { rows, total } = await listSubcategories({ q, page, pageSize: PAGE_SIZE });
      setRows(rows);
      setTotal(total);
    } catch (e: any) {
      toast.error(e?.message || 'Gagal memuat subcategory');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [page]);
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); load(); }, 350);
    return () => clearTimeout(t);
  }, [q]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  function onCreate() {
    setEditing(null);
    setOpenForm(true);
  }
  function onEdit(row: Subcategory) {
    setEditing(row);
    setOpenForm(true);
  }
  function confirmDelete(row: Subcategory) {
    setToDelete(row);
    setOpenConfirm(true);
  }

  async function onDelete() {
    if (!toDelete) return;
    try {
      await deleteSubcategory(toDelete.id);
      toast.success('Subcategory dihapus');
      setOpenConfirm(false);
      load();
    } catch (e: any) {
      toast.error(e?.message || 'Gagal menghapus');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Subcategories</h1>
          <p className="text-sm text-muted-foreground">Master data sub-kategori untuk Budget & Expenses.</p>
        </div>
        <Button onClick={onCreate}>+ Tambah</Button>
      </div>

      <div className="flex items-center gap-3">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari nama subcategory…"
          className="max-w-sm"
        />
        <Badge variant="outline">Total: {total}</Badge>
      </div>

      <div className="rounded-2xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">ID</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="w-52">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="py-6 text-muted-foreground">Loading…</TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                  {q ? 'Tidak ada hasil.' : 'Belum ada subcategory. Tambahkan dulu.'}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.id}</TableCell>
                  <TableCell>{r.name}</TableCell>
                  <TableCell>{r.category_name}</TableCell>
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

      <div className="flex items-center gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
          Prev
        </Button>
        <span className="text-sm text-muted-foreground">
          Page <b>{page}</b> / {totalPages}
        </span>
        <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
          Next
        </Button>
      </div>

      <SubcategoryForm
        open={openForm}
        onOpenChange={setOpenForm}
        onSaved={load}
        initial={editing}
      />

      <Dialog open={openConfirm} onOpenChange={setOpenConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus Subcategory</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Hapus <b>{toDelete?.name}</b>? Tindakan ini tidak bisa dibatalkan.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenConfirm(false)}>Batal</Button>
            <Button variant="destructive" onClick={onDelete}>Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

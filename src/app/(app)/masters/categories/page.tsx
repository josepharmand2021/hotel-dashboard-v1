'use client';

import { useEffect, useMemo, useState } from 'react';
import { listCategories, deleteCategory, updateCategory, Category } from '@/features/masters/api';
import CategoryForm from '@/features/masters/CategoryForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Pencil, Check, X } from 'lucide-react';

const PAGE_SIZE = 10;

export default function CategoriesPage() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: 'name'|'created_at'; dir: 'asc'|'desc' }>({ key: 'name', dir: 'asc' });

  const [rows, setRows] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [openForm, setOpenForm] = useState(false);
  const [editingModal, setEditingModal] = useState<Category | null>(null);

  const [openConfirm, setOpenConfirm] = useState(false);
  const [toDelete, setToDelete] = useState<Category | null>(null);

  // inline edit state
  const [inlineEditId, setInlineEditId] = useState<number | null>(null);
  const [inlineName, setInlineName] = useState('');

  async function load() {
    setLoading(true);
    try {
      const { rows, total } = await listCategories({ q, page, pageSize: PAGE_SIZE });
      // client-side sort ringan (kalau mau server-side, modif api.ts)
      rows.sort((a,b) => {
        const dir = sort.dir === 'asc' ? 1 : -1;
        if (sort.key === 'name') return a.name.localeCompare(b.name) * dir;
        return (new Date(a.created_at||'').getTime() - new Date(b.created_at||'').getTime()) * dir;
      });
      setRows(rows); setTotal(total);
    } catch (e: any) {
      toast.error(e?.message || 'Gagal memuat kategori');
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [page, sort]);
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); load(); }, 350);
    return () => clearTimeout(t);
  }, [q]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  function openCreate() { setEditingModal(null); setOpenForm(true); }
  function openEditModal(row: Category) { setEditingModal(row); setOpenForm(true); }

  function startInline(row: Category) {
    setInlineEditId(row.id);
    setInlineName(row.name);
  }
  async function saveInline() {
    if (!inlineEditId) return;
    const n = inlineName.trim();
    if (!n) return toast.error('Nama tidak boleh kosong');
    try {
      await updateCategory(inlineEditId, n);
      toast.success('Tersimpan');
      setInlineEditId(null); setInlineName('');
      load();
    } catch (e:any) {
      toast.error(e?.message || 'Gagal menyimpan');
    }
  }
  function cancelInline() {
    setInlineEditId(null);
    setInlineName('');
  }

  function confirmDelete(row: Category) { setToDelete(row); setOpenConfirm(true); }
  async function onDelete() {
    if (!toDelete) return;
    try {
      await deleteCategory(toDelete.id);
      toast.success('Kategori dihapus');
      setOpenConfirm(false);
      load();
    } catch (e:any) {
      if (e?.message?.toLowerCase?.().includes('foreign key')) {
        toast.error('Tidak bisa dihapus: masih dipakai Subcategory. Hapus/ubah subcategory dulu.');
      } else {
        toast.error(e?.message || 'Gagal menghapus');
      }
    }
  }

  function toggleSort(key: 'name'|'created_at') {
    setSort((s) => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Categories</h1>
          <p className="text-sm text-muted-foreground">Master data untuk pengelompokan Budget & Expenses.</p>
        </div>
        <Button onClick={openCreate}>+ Tambah</Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <Input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Cari nama kategori…" className="max-w-sm" />
        <Badge variant="outline">Total: {total}</Badge>
      </div>

      {/* Table */}
      <div className="rounded-2xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">ID</TableHead>
              <TableHead className="cursor-pointer select-none" onClick={()=>toggleSort('name')}>
                Nama {sort.key==='name' ? (sort.dir==='asc'?'↑':'↓') : ''}
              </TableHead>
              <TableHead className="w-48 cursor-pointer select-none" onClick={()=>toggleSort('created_at')}>
                Created {sort.key==='created_at' ? (sort.dir==='asc'?'↑':'↓') : ''}
              </TableHead>
              <TableHead className="w-56">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={4} className="py-6 text-muted-foreground">Loading…</TableCell>
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center">
                  <div className="space-y-3">
                    <p className="text-muted-foreground">{q ? 'Tidak ada hasil.' : 'Belum ada kategori.'}</p>
                    <Button size="sm" onClick={openCreate}>+ Tambah Category</Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => {
                const isInline = inlineEditId === r.id;
                return (
                  <TableRow key={r.id}>
                    <TableCell>{r.id}</TableCell>
                    <TableCell className="font-medium">
                      {isInline ? (
                        <Input
                          value={inlineName}
                          onChange={(e)=>setInlineName(e.target.value)}
                          onKeyDown={(e)=>{ if (e.key==='Enter') saveInline(); if (e.key==='Escape') cancelInline(); }}
                          className="h-8"
                        />
                      ) : r.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString('id-ID') : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {isInline ? (
                          <>
                            <Button size="sm" onClick={saveInline}><Check className="h-4 w-4" /></Button>
                            <Button size="sm" variant="outline" onClick={cancelInline}><X className="h-4 w-4" /></Button>
                          </>
                        ) : (
                          <>
                            <Button variant="outline" size="sm" onClick={()=>startInline(r)}>
                              <Pencil className="h-4 w-4 mr-1" /> Rename
                            </Button>
                            <Button variant="outline" size="sm" onClick={()=>openEditModal(r)}>Edit</Button>
                            <Button variant="destructive" size="sm" onClick={()=>confirmDelete(r)}>Hapus</Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page<=1}>Prev</Button>
        <span className="text-sm text-muted-foreground">Page <b>{page}</b> / {Math.max(1, Math.ceil(total / PAGE_SIZE))}</span>
        <Button variant="outline" size="sm" onClick={()=>setPage(p=>p+1)} disabled={page>=Math.ceil(total/PAGE_SIZE)}>Next</Button>
      </div>

      {/* Dialog: Create/Edit (modal penuh) */}
      <CategoryForm open={openForm} onOpenChange={setOpenForm} onSaved={load} initial={editingModal} />

      {/* Confirm Delete */}
      <Dialog open={openConfirm} onOpenChange={setOpenConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Hapus Category</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Hapus <b>{toDelete?.name}</b>? Tindakan ini tidak bisa dibatalkan.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={()=>setOpenConfirm(false)}>Batal</Button>
            <Button variant="destructive" onClick={onDelete}>Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

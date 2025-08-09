'use client';

import { useEffect, useState } from 'react';
import { Category, Subcategory, createSubcategory, updateSubcategory, listCategories } from '@/features/masters/api';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  initial?: Subcategory | null;
};

export default function SubcategoryForm({ open, onOpenChange, onSaved, initial }: Props) {
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initial) {
      setName(initial.name);
      setCategoryId(initial.category_id.toString());
    } else {
      setName('');
      setCategoryId('');
    }
  }, [initial]);

  useEffect(() => {
    async function loadCategories() {
      try {
        const { rows } = await listCategories({ q: '', page: 1, pageSize: 100 });
        setCategories(rows);
      } catch (e: any) {
        toast.error(e?.message || 'Gagal memuat kategori');
      }
    }
    loadCategories();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !categoryId) {
      toast.error('Lengkapi semua field');
      return;
    }
    setLoading(true);
    try {
      if (initial) {
        await updateSubcategory(initial.id, { name: name.trim(), category_id: Number(categoryId) });
        toast.success('Subcategory diperbarui');
      } else {
        await createSubcategory({ name: name.trim(), category_id: Number(categoryId) });
        toast.success('Subcategory ditambahkan');
      }
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || 'Gagal menyimpan');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit' : 'Tambah'} Subcategory</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label>Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih kategori" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Nama Subcategory</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Menyimpan…' : 'Simpan'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

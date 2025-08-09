'use client';

import { useEffect, useState } from 'react';
import { createBudgetLine, updateBudgetLine, listBudgetLines, BudgetLine } from '@/features/budget-lines/api';
import { listCategoriesBasic, listSubcategories } from '@/features/masters/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function BudgetLineForm({ id, onClose }: { id?: number; onClose: () => void }) {
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [subcategories, setSubcategories] = useState<{ id: number; name: string }[]>([]);

  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [subcategoryId, setSubcategoryId] = useState<number | undefined>();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listCategoriesBasic().then(setCategories).catch((e) => toast.error(e.message));
  }, []);

  useEffect(() => {
    if (categoryId) {
      listSubcategories({ category_id: categoryId, pageSize: 100 })
        .then((res) => setSubcategories(res.rows.map((r) => ({ id: r.id, name: r.name }))))
        .catch((e) => toast.error(e.message));
    } else {
      setSubcategories([]);
    }
  }, [categoryId]);

  useEffect(() => {
    if (id) {
      listBudgetLines({ pageSize: 1 }).then((res) => {
        const existing = res.rows.find((r) => r.id === id);
        if (existing) {
          setCategoryId(existing.category_id);
          setSubcategoryId(existing.subcategory_id);
          setDescription(existing.description ?? '');
          setAmount(existing.amount.toString());
        }
      });
    }
  }, [id]);

  const onSubmit = async () => {
    if (!categoryId || !subcategoryId || !amount) {
      toast.error('Lengkapi semua field');
      return;
    }
    setLoading(true);
    try {
      if (id) {
        await updateBudgetLine(id, {
          category_id: categoryId,
          subcategory_id: subcategoryId,
          description,
          amount: parseFloat(amount),
        });
        toast.success('Berhasil diupdate');
      } else {
        await createBudgetLine({
          category_id: categoryId,
          subcategory_id: subcategoryId,
          description,
          amount: parseFloat(amount),
        });
        toast.success('Berhasil ditambahkan');
      }
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{id ? 'Edit Budget Line' : 'Tambah Budget Line'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Select
            value={categoryId?.toString() ?? ''}
            onValueChange={(val) => setCategoryId(Number(val))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id.toString()}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={subcategoryId?.toString() ?? ''}
            onValueChange={(val) => setSubcategoryId(Number(val))}
            disabled={!categoryId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih Subcategory" />
            </SelectTrigger>
            <SelectContent>
              {subcategories.map((sc) => (
                <SelectItem key={sc.id} value={sc.id.toString()}>
                  {sc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            placeholder="Deskripsi"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <Input
            placeholder="Amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Batal</Button>
            <Button onClick={onSubmit} disabled={loading}>
              {loading ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

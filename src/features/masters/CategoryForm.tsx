'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { Category } from './api';
import { createCategory, updateCategory } from './api';
import { supabase } from '@/lib/supabase/client';

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;           // dipanggil setelah sukses create/update
  initial?: Category | null;     // null => create, ada value => edit
};

export default function CategoryForm({ open, onOpenChange, onSaved, initial }: Props) {
  const isEdit = !!initial;
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  // live duplicate check
  const [dupe, setDupe] = useState<null | { id: number; name: string }>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    setName(initial?.name ?? '');
    setDupe(null);
  }, [initial, open]);

  // debounce dupe check
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      const n = name.trim();
      if (!n) { setDupe(null); return; }
      // cek nama sama (case-insensitive), kecuali dirinya sendiri saat edit
      const { data, error } = await supabase
        .from('categories')
        .select('id,name')
        .ilike('name', n)
        .limit(1);
      if (error) { setDupe(null); return; }
      const hit = (data?.[0] && (!isEdit || data[0].id !== initial!.id)) ? data[0] : null;
      setDupe(hit ?? null);
    }, 250);
    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current); };
  }, [name, isEdit, initial, open]);

  const canSubmit = useMemo(() => {
    return !!name.trim() && !saving;
  }, [name, saving]);

  async function onSubmit() {
    const n = name.trim();
    if (!n) return toast.error('Nama kategori wajib diisi');
    try {
      setSaving(true);
      if (isEdit) {
        await updateCategory(initial!.id, n);
        toast.success('Kategori diperbarui');
      } else {
        await createCategory(n);
        toast.success('Kategori ditambahkan');
      }
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (msg.toLowerCase().includes('unique')) {
        toast.error('Nama kategori sudah ada');
      } else {
        toast.error(msg || 'Gagal menyimpan');
      }
    } finally {
      setSaving(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && canSubmit) {
      e.preventDefault();
      onSubmit();
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !saving && onOpenChange(v)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Category' : 'Tambah Category'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="cat-name">Nama</Label>
          <Input
            id="cat-name"
            placeholder="Contoh: MEP, Arsitektur, Interior"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={onKeyDown}
            autoFocus
          />
          {dupe && (
            <p className="text-xs text-red-600">
              Nama <b>{dupe.name}</b> sudah ada.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Batal
          </Button>
          <Button onClick={onSubmit} disabled={!canSubmit || !!dupe} className="min-w-24">
            {saving ? 'Menyimpan…' : (isEdit ? 'Simpan Perubahan' : 'Simpan')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

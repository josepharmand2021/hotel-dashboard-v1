'use client';

import * as React from 'react';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ChevronsUpDown, Check } from 'lucide-react';

export type SubcategoryOpt = { id: number; name: string; category_id: number };

export default function ComboboxSubcategory({
  categoryId,
  value,
  onChange,
  placeholder = 'Cari subkategori…',
}: {
  categoryId?: number | null;
  value: SubcategoryOpt | null;
  onChange: (next: SubcategoryOpt | null) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<SubcategoryOpt[]>([]);
  const [loading, setLoading] = React.useState(false);

  async function fetchList(term?: string) {
    if (!categoryId) { setItems([]); return; }
    setLoading(true);
    try {
      let q = supabase.from('subcategories')
        .select('id, name, category_id')
        .eq('category_id', categoryId)
        .order('name')
        .limit(50);
      const t = (term || '').trim();
      if (t) q = q.ilike('name', `%${t}%`);
      const { data, error } = await q;
      if (error) throw error;
      setItems((data ?? []).map((r: any) => ({
        id: Number(r.id), name: String(r.name), category_id: Number(r.category_id),
      })));
    } finally { setLoading(false); }
  }

  React.useEffect(() => { if (open) fetchList(); }, [open, categoryId]);

  const disabled = !categoryId;
  return (
    <Popover open={open} onOpenChange={disabled ? () => {} : setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between" disabled={disabled}
          title={disabled ? 'Pilih kategori dulu' : ''}>
          {value ? value.name : disabled ? 'Pilih kategori dulu' : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0 z-50" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Cari subkategori…" onValueChange={(v) => fetchList(v)} />
          <CommandList>
            {loading && <div className="px-3 py-2 text-sm text-muted-foreground">Memuat…</div>}
            {!loading && (
              <>
                <CommandEmpty>Tidak ada data</CommandEmpty>
                <CommandGroup heading="Subcategories">
                  {items.map((it) => (
                    <CommandItem key={it.id} value={it.name}
                      onSelect={() => { onChange(it); setOpen(false); }}
                      className="flex items-center gap-2">
                      <Check className={`h-4 w-4 ${value?.id === it.id ? 'opacity-100' : 'opacity-0'}`} />
                      <span>{it.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

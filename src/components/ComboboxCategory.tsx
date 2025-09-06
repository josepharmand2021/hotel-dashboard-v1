'use client';

import * as React from 'react';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ChevronsUpDown, Check } from 'lucide-react';

export type CategoryOpt = { id: number; name: string };

export default function ComboboxCategory({
  value,
  onChange,
  placeholder = 'Cari kategori…',
}: {
  value: CategoryOpt | null;
  onChange: (next: CategoryOpt | null) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<CategoryOpt[]>([]);
  const [loading, setLoading] = React.useState(false);

  async function fetchList(term?: string) {
    setLoading(true);
    try {
      let q = supabase.from('categories').select('id, name').order('name').limit(30);
      const t = (term || '').trim();
      if (t) q = q.ilike('name', `%${t}%`);
      const { data, error } = await q;
      if (error) throw error;
      setItems((data ?? []).map((r: any) => ({ id: Number(r.id), name: String(r.name) })));
    } finally { setLoading(false); }
  }

  React.useEffect(() => { if (open && items.length === 0) fetchList(); }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between">
          {value ? value.name : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0 z-50" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Cari kategori…" onValueChange={(v) => fetchList(v)} />
          <CommandList>
            {loading && <div className="px-3 py-2 text-sm text-muted-foreground">Memuat…</div>}
            {!loading && (
              <>
                <CommandEmpty>Tidak ada data</CommandEmpty>
                <CommandGroup heading="Categories">
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

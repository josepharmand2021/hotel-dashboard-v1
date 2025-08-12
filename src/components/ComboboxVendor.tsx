'use client';

import * as React from 'react';
import { ChevronsUpDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command, CommandEmpty, CommandInput, CommandGroup, CommandItem, CommandList, CommandSeparator,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase/client';

export type VendorOpt = { id: number; name: string };

export default function ComboboxVendor({
  value,
  onChange,
  placeholder = 'Pilih vendor',
  className,
}: {
  value?: VendorOpt | null;
  onChange: (opt: VendorOpt | null) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [vendors, setVendors] = React.useState<VendorOpt[]>([]);
  const [loadingCreate, setLoadingCreate] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      const { data } = await supabase.from('vendors').select('id,name').order('name');
      if (data) setVendors(data as any);
    })();
  }, []);

  const selectedLabel = value?.name ?? '';
  const lower = query.toLowerCase();
  const filtered = vendors.filter(v => v.name.toLowerCase().includes(lower));

  async function handleCreate(name: string) {
    const n = name.trim();
    if (!n) return;
    setLoadingCreate(true);
    // coba cari yg sudah ada (case-insensitive)
    const existing = vendors.find(v => v.name.toLowerCase() === n.toLowerCase());
    if (existing) { onChange(existing); setOpen(false); setLoadingCreate(false); return; }

    // upsert by unique name biar aman dari conflict
    const { data, error } = await supabase
      .from('vendors')
      .upsert({ name: n }, { onConflict: 'name' })
      .select('id,name')
      .single();

    setLoadingCreate(false);
    if (error || !data) return;

    setVendors(prev => [...prev.filter(v => v.id !== data.id), data as any].sort((a,b)=>a.name.localeCompare(b.name)));
    onChange(data as any);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" aria-expanded={open}
          className={cn('w-full justify-between', className)}>
          {selectedLabel || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Cari vendor…" value={query} onValueChange={setQuery} />
          <CommandList>
            {filtered.length > 0 && (
              <>
                <CommandGroup heading="Vendors">
                  {filtered.map(v => (
                    <CommandItem key={v.id} value={String(v.id)}
                      onSelect={() => { onChange(v); setOpen(false); }}>
                      <Check className={cn('mr-2 h-4 w-4', v.id === value?.id ? 'opacity-100' : 'opacity-0')} />
                      {v.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </>
            )}
            <CommandEmpty className="py-3 text-muted-foreground">Tidak ada hasil</CommandEmpty>

            {query && vendors.every(v => v.name.toLowerCase() !== lower) && (
              <div className="p-2">
                <Button className="w-full" variant="secondary" disabled={loadingCreate}
                        onClick={() => handleCreate(query)}>
                  {loadingCreate ? 'Menyimpan…' : `+ Tambah vendor: "${query}"`}
                </Button>
              </div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
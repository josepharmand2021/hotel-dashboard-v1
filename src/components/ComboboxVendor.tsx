'use client';

import * as React from 'react';
import { ChevronsUpDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command, CommandEmpty, CommandInput, CommandGroup, CommandItem, CommandList, CommandSeparator,
} from '@/components/ui/command';
import { cn } from '@/lib/utils'; // kalau punya helper cn. Kalau tidak, pakai clsx atau hapus.
import { supabase } from '@/lib/supabase/client';

type Opt = { id: number; name: string };

export default function ComboboxVendor({
  value,
  onChange,
  placeholder = 'Pilih vendor',
  className,
}: {
  value?: Opt | null;
  onChange: (opt: Opt | null) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [vendors, setVendors] = React.useState<Opt[]>([]);
  const [loadingCreate, setLoadingCreate] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('vendors').select('id,name').order('name');
      if (!error && data) setVendors(data as any);
    })();
  }, []);

  const selectedLabel = value?.name ?? '';

  async function handleCreate(name: string) {
    if (!name.trim()) return;
    setLoadingCreate(true);
    const { data, error } = await supabase
      .from('vendors')
      .insert({ name: name.trim() })
      .select('id, name')
      .single();
    setLoadingCreate(false);
    if (error) return;
    // tambah ke list lokal biar langsung muncul
    setVendors((prev) => [...prev, data as any].sort((a, b) => a.name.localeCompare(b.name)));
    onChange(data as any);
    setOpen(false);
  }

  const lower = query.toLowerCase();
  const filtered = vendors.filter(v => v.name.toLowerCase().includes(lower));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between', className)}
        >
          {selectedLabel || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Cari vendor…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>

            {filtered.length > 0 && (
              <>
                <CommandGroup heading="Vendors">
                  {filtered.map((v) => (
                    <CommandItem
                      key={v.id}
                      value={String(v.id)}
                      onSelect={() => {
                        onChange(v);
                        setOpen(false);
                      }}
                    >
                      <Check className={cn('mr-2 h-4 w-4', v.id === value?.id ? 'opacity-100' : 'opacity-0')} />
                      {v.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </>
            )}

            {query && vendors.every(v => v.name.toLowerCase() !== lower) && (
              <div className="p-2">
                <Button
                  className="w-full"
                  variant="secondary"
                  disabled={loadingCreate}
                  onClick={() => handleCreate(query)}
                >
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

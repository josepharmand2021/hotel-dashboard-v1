'use client';

import * as React from 'react';
import { ChevronsUpDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command, CommandEmpty, CommandInput, CommandGroup, CommandItem, CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';

export type VendorOpt = { id: number; name: string };

type Props = {
  value?: VendorOpt | null;
  onChange: (opt: VendorOpt | null) => void;
  placeholder?: string;
  className?: string;
};

export default function ComboboxVendor({
  value,
  onChange,
  placeholder = 'Choose vendor...',
  className,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [vendors, setVendors] = React.useState<VendorOpt[]>([]);
  const [loading, setLoading] = React.useState(false);

  // load first page (kosongkan q) saat popover dibuka pertama kali
  React.useEffect(() => {
    if (!open || vendors.length) return;
    fetchVendors('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // debounce pencarian
  React.useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => fetchVendors(query), 250);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, open]);

  async function fetchVendors(q: string) {
    try {
      setLoading(true);
      const res = await fetch(`/api/vendors?q=${encodeURIComponent(q)}&limit=20`, { cache: 'no-store' });
      const body = await res.json();
      const rows = (body?.rows ?? []) as Array<{ id: number; name: string }>;
      setVendors(rows.map(r => ({ id: Number(r.id), name: String(r.name ?? '') })));
    } catch {
      setVendors([]);
    } finally {
      setLoading(false);
    }
  }

  const selectedLabel = value?.name ?? '';

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
          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Cari vendor…" value={query} onValueChange={setQuery} />
          <CommandList>
            {vendors.length > 0 && (
              <CommandGroup heading="Vendors">
                {vendors.map(v => (
                  <CommandItem
                    key={v.id}
                    value={String(v.id)}
                    onSelect={() => { onChange(v); setOpen(false); }}
                  >
                    <Check className={cn('mr-2 h-4 w-4', v.id === value?.id ? 'opacity-100' : 'opacity-0')} />
                    {v.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            <CommandEmpty className="py-3 text-muted-foreground">
              {loading ? 'Loading…' : 'Tidak ada hasil'}
            </CommandEmpty>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

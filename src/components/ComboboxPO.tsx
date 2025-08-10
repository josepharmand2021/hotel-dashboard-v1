'use client';

import * as React from 'react';
import { ChevronsUpDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';

type POOpt = { id: number; po_number: string; vendor_name: string; date?: string | null };

function getVendorName(v: any): string {
  if (!v) return '';
  return Array.isArray(v) ? (v[0]?.name ?? '') : (v.name ?? '');
}

export default function ComboboxPO({
  value, onChange, placeholder = 'Pilih PO', className, filterStatus,
}: {
  value?: POOpt | null;
  onChange: (opt: POOpt | null) => void;
  placeholder?: string;
  className?: string;
  filterStatus?: string[];
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [items, setItems] = React.useState<POOpt[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        let q = supabase
          .from('purchase_orders')
          .select('id, po_number, po_date, vendor_id, vendors(name)')
          .order('id', { ascending: false })
          .limit(200);
        if (filterStatus?.length) q = q.in('status', filterStatus as any);

        const { data, error } = await q;
        if (error) throw error;

        const rows: POOpt[] = (data ?? []).map((r: any) => ({
          id: r.id,
          po_number: r.po_number ?? String(r.id),
          vendor_name: getVendorName(r.vendors),
          date: r.po_date ?? null,
        }));
        setItems(rows);
      } catch (err: any) {
        toast.error(err.message || 'Gagal memuat PO');
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [filterStatus?.join(',')]);

  const filtered = items.filter(
    (x) =>
      x.po_number.toLowerCase().includes(query.toLowerCase()) ||
      x.vendor_name.toLowerCase().includes(query.toLowerCase())
  );

  const label = value ? `${value.po_number} — ${value.vendor_name}` : '';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" aria-expanded={open} className={cn('w-full justify-between', className)}>
          {label || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Cari PO / Vendor…" value={query} onValueChange={setQuery} />
          <CommandList>
            <CommandEmpty>{loading ? 'Memuat…' : 'Tidak ditemukan'}</CommandEmpty>
            <CommandGroup heading="Purchase Orders">
              {filtered.map((po) => (
                <CommandItem key={po.id} value={String(po.id)} onSelect={() => { onChange(po); setOpen(false); }}>
                  <Check className={cn('mr-2 h-4 w-4', po.id === value?.id ? 'opacity-100' : 'opacity-0')} />
                  <div className="flex flex-col">
                    <span className="font-medium">{po.po_number} — {po.vendor_name}</span>
                    {po.date ? <span className="text-xs text-muted-foreground">{po.date}</span> : null}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

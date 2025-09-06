'use client';

import * as React from 'react';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ChevronsUpDown, Check } from 'lucide-react';

export type PayableOpt = {
  id: number;
  invoice_no: string;
  invoice_date: string | null;
  vendor_id: number;
  vendor_name: string;
  amount: number;
  source: 'PT' | 'RAB' | 'PETTY' | string | null;
  category_id: number | null;
  subcategory_id: number | null;
  po_id?: number | null;
};

function cn(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(' ');
}

export default function ComboboxPayable({
  value,
  onChange,
  placeholder = 'Pilih payable…',
}: {
  value: PayableOpt | null;
  onChange: (next: PayableOpt | null) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<PayableOpt[]>([]);
  const [loading, setLoading] = React.useState(false);

  async function fetchList(term?: string) {
    setLoading(true);
    try {
      let q = supabase
        .from('payables')
        .select([
          'id',
          'invoice_no',
          'invoice_date',
          'vendor_id',
          'vendor_name',
          'amount',
          'source',
          'category_id',
          'subcategory_id',
          'po_id',
        ].join(','))
        .eq('status', 'unpaid')
        .order('invoice_date', { ascending: false })
        .limit(15);

      const t = (term || '').trim();
      if (t) q = q.or(`invoice_no.ilike.%${t}%,vendor_name.ilike.%${t}%`);

      const { data, error } = await q;
      if (error) throw error;

    // ComboboxPayable.tsx
    setItems(
      (data || []).map((r: any) => ({
        id: Number(r.id),
        invoice_no: String(r.invoice_no ?? `INV-${r.id}`),
        invoice_date: r.invoice_date ?? null,
        vendor_id: Number(r.vendor_id),
        vendor_name: String(r.vendor_name ?? '—'),
        amount: Number(r.amount || 0),
        source: (r.source as any) ?? 'PT',
        // ⬇️ penting: pastikan number, bukan string
        category_id: r.category_id != null ? Number(r.category_id) : null,
        subcategory_id: r.subcategory_id != null ? Number(r.subcategory_id) : null,
        po_id: r.po_id != null ? Number(r.po_id) : null,
      })),
    );
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (open && items.length === 0) fetchList();
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between">
          {value ? `${value.invoice_no} — ${value.vendor_name}` : (placeholder || 'Pilih payable…')}
          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[520px] p-0 z-50" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Cari invoice/vendor…" onValueChange={(v) => fetchList(v)} />
          <CommandList>
            {loading && <div className="px-3 py-2 text-sm text-muted-foreground">Memuat…</div>}
            {!loading && (
              <>
                <CommandEmpty>Tidak ada data</CommandEmpty>
                <CommandGroup heading="Payables (UNPAID)">
                  {items.map((it) => (
                    <CommandItem
                      key={it.id}
                      value={`${it.invoice_no} ${it.vendor_name}`}
                      onSelect={() => {
                        onChange(it);
                        setOpen(false);
                      }}
                      className="flex items-center gap-2"
                    >
                      <Check className={cn('h-4 w-4', value?.id === it.id ? 'opacity-100' : 'opacity-0')} />
                      <div className="flex flex-col">
                        <div className="font-medium">{it.invoice_no}</div>
                        <div className="text-xs text-muted-foreground">
                          {it.vendor_name} • {it.source ?? 'PT'}
                        </div>
                      </div>
                      <div className="ml-auto text-xs">Rp {new Intl.NumberFormat('id-ID').format(it.amount)}</div>
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

// src/components/ComboboxPO.tsx
'use client';

import * as React from 'react';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { ChevronsUpDown, Check } from 'lucide-react';

// util kelas (kalau kamu punya cn sendiri, pakai punyamu)
function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(' ');
}

// ====== Type yang diexpose ke pemakai combobox ======
export type POOpt = {
  id: number;
  po_number: string;
  vendor_id: number;
  vendor_name: string;
  total?: number;
  paid?: number;
  outstanding?: number;

  // >>> tambahan meta pajak opsional (tidak breaking)
  is_tax_included?: boolean;
  tax_percent?: number;
};

export default function ComboboxPO({
  value,
  onChange,
  placeholder = 'Pilih PO...',
}: {
  value: POOpt | null;
  onChange: (next: POOpt | null) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<POOpt[]>([]);
  const [loading, setLoading] = React.useState(false);

  async function fetchList(term?: string) {
    setLoading(true);
    try {
      // Ambil dari purchase_orders + vendors(name)
      let q = supabase
        .from('purchase_orders')
        .select('id, po_number, vendor_id, vendors(name)')
        .order('po_date', { ascending: false })
        .limit(10);

      const t = (term || '').trim();
      if (t) q = q.or(`po_number.ilike.%${t}%,vendors.name.ilike.%${t}%`);

      const { data, error } = await q;
      if (error) throw error;

      const rows: POOpt[] = (data ?? []).map((r: any) => ({
        id: Number(r.id),
        po_number: String(r.po_number || ''),
        vendor_id: Number(r.vendor_id || 0),
        vendor_name: String(r.vendors?.name || '—'),
      }));
      setItems(rows);
    } catch (e) {
      console.error('[ComboboxPO] fetchList error:', e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (open && items.length === 0) fetchList();
  }, [open]); // fetch saat popover dibuka

  async function selectPO(it: POOpt) {
    try {
      // 1) finance ringkas
      const { data: fin } = await supabase
        .from('v_po_finance')
        .select('id,total,paid,outstanding')
        .eq('id', it.id)
        .maybeSingle();

      // 2) header pajak (opsional, buat tombol import nanti)
      const { data: hdr } = await supabase
        .from('v_po_with_terms')
        .select('is_tax_included,tax_percent')
        .eq('id', it.id)
        .maybeSingle();

      onChange({
        ...it,
        total: Number(fin?.total ?? 0),
        paid: Number(fin?.paid ?? 0),
        outstanding: Number(fin?.outstanding ?? 0),
        is_tax_included: !!hdr?.is_tax_included,
        tax_percent: hdr?.tax_percent == null ? undefined : Number(hdr.tax_percent),
      });
    } catch (e) {
      console.error('[ComboboxPO] selectPO enrich error:', e);
      // fallback tetap kirim minimal
      onChange(it);
    } finally {
      setOpen(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between">
          {value ? `${value.po_number} — ${value.vendor_name}` : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[520px] p-0 z-50" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Cari PO / vendor..." onValueChange={(v) => fetchList(v)} />
          <CommandList>
            {loading && (
              <div className="px-3 py-2 text-sm text-muted-foreground">Memuat…</div>
            )}

            {!loading && (
              <>
                <CommandEmpty>Tidak ada data</CommandEmpty>
                <CommandGroup heading="Purchase Orders">
                  {items.map((it) => (
                    <CommandItem
                      key={it.id}
                      value={`${it.po_number} ${it.vendor_name}`}
                      onSelect={() => selectPO(it)}
                      className="flex items-center gap-2"
                    >
                      <Check className={cx('h-4 w-4', value?.id === it.id ? 'opacity-100' : 'opacity-0')} />
                      <div className="flex flex-col">
                        <div className="font-medium">{it.po_number}</div>
                        <div className="text-xs text-muted-foreground">{it.vendor_name}</div>
                      </div>
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

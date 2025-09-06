// src/components/ComboboxAccount.tsx
'use client';

import * as React from 'react';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AccountOpt = {
  id: number;
  label: string;
  bank?: string | null;
  no?: string | null;
};

export default function ComboboxAccount({
  value,
  onChange,
  placeholder = 'Pilih rekening bank...',
}: {
  value: AccountOpt | null;
  onChange: (next: AccountOpt | null) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<AccountOpt[]>([]);
  const [loading, setLoading] = React.useState(false);

  async function fetchList(term?: string) {
    setLoading(true);
    try {
      // Ambil semua kolom → kita normalisasi di FE
      let q = supabase.from('bank_accounts').select('*').order('id', { ascending: false }).limit(30);

      const t = (term || '').trim();
      if (t) {
        // cari di beberapa kemungkinan kolom
        q = q.or(
          [
            'bank_name.ilike.%' + t + '%',
            'bank.ilike.%' + t + '%',
            'account_no.ilike.%' + t + '%',
            'account_number.ilike.%' + t + '%',
            'account_holder.ilike.%' + t + '%',
            'name.ilike.%' + t + '%',
          ].join(',')
        );
      }

      const { data, error } = await q;
      if (error) {
        console.error('load accounts error:', error);
        setItems([]);
        return;
      }

      // Normalisasi baris → AccountOpt
      const rows: AccountOpt[] = (data ?? []).map((r: any) => {
        const bank = (r.bank_name ?? r.bank ?? '').toString().trim() || null;
        const no = (r.account_no ?? r.account_number ?? r.number ?? '').toString().trim() || null;
        const holder = (r.account_holder ?? r.name ?? '').toString().trim();

        const label =
          holder ||
          (bank || no ? `${bank ?? ''}${bank && no ? ' - ' : ''}${no ?? ''}` : '') ||
          `#${r.id}`;

        return { id: Number(r.id), label, bank, no };
      });

      setItems(rows);
    } catch (e) {
      console.error('load accounts fatal:', e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (open && items.length === 0) fetchList();
  }, [open]); // fetch saat dropdown dibuka

  function selectItem(it: AccountOpt) {
    onChange(it);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between">
          {value ? value.label : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[520px] p-0 z-50" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Cari nama/bank/no rekening..." onValueChange={(v) => fetchList(v)} />
          <CommandList>
            {loading && <div className="px-3 py-2 text-sm text-muted-foreground">Memuat…</div>}
            {!loading && (
              <>
                <CommandEmpty>Tidak ada data</CommandEmpty>
                <CommandGroup heading="Bank Accounts">
                  {items.map((it) => (
                    <CommandItem
                      key={it.id}
                      value={it.label}
                      onSelect={() => selectItem(it)}
                      className="flex items-center gap-2"
                    >
                      <Check className={cn('h-4 w-4', value?.id === it.id ? 'opacity-100' : 'opacity-0')} />
                      <div className="flex flex-col">
                        <div className="font-medium">{it.label}</div>
                        {(it.bank || it.no) && (
                          <div className="text-xs text-muted-foreground">
                            {[it.bank, it.no].filter(Boolean).join(' • ')}
                          </div>
                        )}
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

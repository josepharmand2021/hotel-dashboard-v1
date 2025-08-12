'use client';
import * as React from 'react';
import { ChevronsUpDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase/client';

export type CashboxOpt = { id: number; name: string };

export default function ComboboxCashbox({
  value, onChange, placeholder = 'Pilih cash box', className,
}: { value?: CashboxOpt|null; onChange:(v:CashboxOpt|null)=>void; placeholder?:string; className?:string; }) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState('');
  const [items, setItems] = React.useState<CashboxOpt[]>([]);

  React.useEffect(() => { (async () => {
    const { data } = await supabase.from('petty_cash_boxes').select('id,name').order('name');
    if (data) setItems(data as any);
  })(); }, []);

  const filtered = items.filter(i => i.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" className={cn('w-full justify-between', className)}>
          {value?.name ?? placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]">
        <Command shouldFilter={false}>
          <CommandInput value={q} onValueChange={setQ} placeholder="Cari cash box…" />
          <CommandList>
            <CommandEmpty>Tidak ada hasil</CommandEmpty>
            <CommandGroup>
              {filtered.map(it => (
                <CommandItem key={it.id} value={String(it.id)} onSelect={() => { onChange(it); setOpen(false); }}>
                  <Check className={cn('mr-2 h-4 w-4', it.id===value?.id ? 'opacity-100':'opacity-0')} />
                  {it.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

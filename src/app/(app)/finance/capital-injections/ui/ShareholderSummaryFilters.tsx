// src/features/capital-injections/ui/ShareholderSummaryFilters.tsx
'use client';
import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

type Opt = { id: number; name: string };

export function ShareholderSummaryFilters({ shareholders }: { shareholders: Opt[] }) {
  const router = useRouter();
  const sp = useSearchParams();

  const [asOf, setAsOf] = React.useState(sp.get('asOf') ?? '');
  const [statuses, setStatuses] = React.useState<string[]>(
    (sp.get('statuses') ?? 'active,closed').split(',')
  );
  const [shareholderId, setShareholderId] = React.useState(
    sp.get('shareholderId') ?? 'ALL' // sentinel
  );

  function apply() {
    const q = new URLSearchParams();
    if (asOf) q.set('asOf', asOf);
    if (statuses.length) q.set('statuses', statuses.join(','));
    if (shareholderId !== 'ALL') q.set('shareholderId', shareholderId);
    router.push(`/finance/capital-injections/shareholders?${q.toString()}`);
  }

  function reset() {
    setAsOf('');
    setStatuses(['active', 'closed']);
    setShareholderId('ALL');
    router.push('/finance/capital-injections/shareholders');
  }

  return (
    <div className="flex flex-wrap gap-3 items-end">
      {/* As of */}
      <div className="flex flex-col">
        <label className="text-sm mb-1">As of (bulan)</label>
        <Input
          type="month"
          value={asOf}
          onChange={(e) => setAsOf(e.target.value)}
          className="w-[180px]"
        />
      </div>

      {/* Status Plan */}
      <div className="flex flex-col">
        <label className="text-sm mb-1">Status Plan</label>
        <Select value={statuses.join(',')} onValueChange={(v) => setStatuses(v.split(','))}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Pilih status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active,closed">Active + Closed</SelectItem>
            <SelectItem value="active">Active saja</SelectItem>
            <SelectItem value="closed">Closed saja</SelectItem>
            <SelectItem value="draft,active,closed">Semua (draft+)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Shareholder */}
      <div className="flex flex-col">
        <label className="text-sm mb-1">Shareholder</label>
        <Select value={shareholderId} onValueChange={setShareholderId}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Semua shareholder" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua</SelectItem>
            {shareholders.map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Actions */}
      <Button onClick={apply}>Apply</Button>
      <Button variant="secondary" onClick={reset}>Reset</Button>
    </div>
  );
}

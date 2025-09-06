// app/finance/capital-injections/shareholders/page.tsx
import { listShareholderSummary, listShareholdersBasic } from '@/features/capital-injections/api.server';
import { ShareholderSummaryFilters } from '../ui/ShareholderSummaryFilters';
import { ShareholderSummaryTable } from '../ui/ShareholderSummaryTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function one(v?: string | string[]) { return Array.isArray(v) ? v[0] : v; }
function fmtAsOf(asOf?: string) {
  if (!asOf) return '—';
  const [y, m] = asOf.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, 1).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
}
function statusLabel(arr: string[]) {
  const s = new Set(arr);
  if (s.size === 3) return 'Draft + Active + Closed';
  if (s.has('active') && s.has('closed') && !s.has('draft')) return 'Active + Closed';
  return Array.from(s).map(x => x[0]?.toUpperCase() + x.slice(1)).join(', ');
}

export default async function Page({
  searchParams,
}: {
  // ⬇️ Next 15: searchParams bisa Promise
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // ⬇️ WAJIB: await dulu
  const sp = await searchParams;

  const asOfMonth = one(sp.asOf);
  const statuses = (one(sp.statuses) ?? 'active,closed')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean) as Array<'draft' | 'active' | 'closed'>;

  const sid = one(sp.shareholderId);
  const shareholderId =
    sid && sid.trim() !== '' && Number.isFinite(Number(sid)) ? Number(sid) : undefined;

  const [rows, shareholders] = await Promise.all([
    listShareholderSummary({ asOfMonth, statuses, shareholderId }),
    listShareholdersBasic(),
  ]);

  const shName = shareholderId
    ? shareholders.find(s => s.id === shareholderId)?.name ?? `ID ${shareholderId}`
    : undefined;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Ringkasan Per Shareholder</CardTitle>
          <p className="text-sm text-muted-foreground">
            As of {fmtAsOf(asOfMonth)} • Status: {statusLabel(statuses)}
            {shName ? ` • Shareholder: ${shName}` : ''}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <ShareholderSummaryFilters shareholders={shareholders} />
          <ShareholderSummaryTable rows={rows} />
        </CardContent>
      </Card>
    </div>
  );
}

export const runtime = 'nodejs';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { getVendorServer } from '@/features/vendors/api.server';  // ⬅️ ini yang penting
import { RoleGate } from '@/lib/supabase/acl';

function termLabel(v: {
  payment_type: 'CBD'|'COD'|'NET';
  term_days: number | null;
  payment_term_label: string | null;
}) {
  if (v.payment_term_label?.trim()) return v.payment_term_label!;
  if (v.payment_type === 'NET') {
    const d = Number(v.term_days || 0);
    return d > 0 ? `NET ${d} days` : 'NET';
  }
  return v.payment_type || '—';
}

export default async function VendorDetail({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let v;
  try {
    v = await getVendorServer(Number(id));
  } catch {
    // kalau tidak ketemu (single() error “PGRST116 No rows”) → 404
    return notFound();
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{v.name}</h1>
          <p className="text-sm text-muted-foreground">Supplier detail</p>
        </div>
        <RoleGate admin>
          <Button asChild variant="outline">
            <Link href={`/vendors/${v.id}/edit`}>Edit</Link>
          </Button>
        </RoleGate>
      </div>

      <Card>
        <CardHeader><CardTitle>Information</CardTitle></CardHeader>
        <Separator />
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div><div className="text-xs text-muted-foreground">Email</div><div>{v.email || '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">Phone</div><div>{v.phone || '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">NPWP</div><div>{v.npwp || '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">Payment Term</div><Badge variant="outline">{termLabel(v)}</Badge></div>
          <div className="md:col-span-2">
            <div className="text-xs text-muted-foreground">Address</div>
            <div className="whitespace-pre-wrap">{v.address || '—'}</div>
          </div>
          <div className="md:col-span-2">
            <div className="text-xs text-muted-foreground">Vendor ID</div>
            <Badge variant="secondary">{v.id}</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

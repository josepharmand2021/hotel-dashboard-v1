// src/app/(app)/vendors/[id]/page.tsx
export const runtime = 'nodejs';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { getVendor } from '@/features/vendors/api';

async function VendorDetailActions({ id }: { id: number }) {
  // server component – delete via action route or client dialog? We'll keep to link for edit.
  return (
    <div className="flex gap-2">
      <Button asChild variant="outline">
        <Link href={`/vendors/${id}/edit`}>Edit</Link>
      </Button>
      {/* For delete, handle in a client subcomponent if you want confirmation */}
    </div>
  );
}

export default async function VendorDetail({
  params,
}: {
  // ✅ Next.js 15 expects Promise here
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const v = await getVendor(Number(id));

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{v.name}</h1>
          <p className="text-sm text-muted-foreground">Supplier detail</p>
        </div>
        <VendorDetailActions id={v.id} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Information</CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="text-xs text-muted-foreground">Email</div>
            <div>{v.email || '—'}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Phone</div>
            <div>{v.phone || '—'}</div>
          </div>
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

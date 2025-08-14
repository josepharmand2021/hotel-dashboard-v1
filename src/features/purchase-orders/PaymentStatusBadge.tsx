// src/features/purchase-orders/PaymentStatusBadge.tsx
'use client';
import { Badge } from '@/components/ui/badge';

export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERDUE';

export default function PaymentStatusBadge({
  status,
  daysOverdue = 0,
}: {
  status: PaymentStatus;
  daysOverdue?: number;
}) {
  if (status === 'PAID') return <Badge>PAID</Badge>;
  if (status === 'OVERDUE') {
    return (
      <Badge variant="destructive">
        OVERDUE{daysOverdue ? ` • ${daysOverdue}d` : ''}
      </Badge>
    );
  }
  if (status === 'PARTIAL') return <Badge variant="secondary">PARTIAL</Badge>;
  return <Badge variant="outline">UNPAID</Badge>;
}

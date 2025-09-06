'use client';
import React from 'react';

type BadgeStatus = 'UNBILLED' | 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERDUE';

export default function PaymentStatusBadge({
  status,
  daysOverdue = 0,
}: {
  status: BadgeStatus;
  daysOverdue?: number;
}) {
  let cls = 'bg-gray-100 text-gray-700';
  let label: string = status;

  switch (status) {
    case 'PAID':
      cls = 'bg-emerald-100 text-emerald-700';
      break;
    case 'PARTIAL':
      cls = 'bg-amber-100 text-amber-700';
      break;
    case 'OVERDUE':
      cls = 'bg-red-100 text-red-700';
      label = daysOverdue > 0 ? `OVERDUE (${daysOverdue}d)` : 'OVERDUE';
      break;
    case 'UNPAID':
      cls = 'bg-slate-200 text-slate-700';
      break;
    case 'UNBILLED':
    default:
      cls = 'bg-gray-100 text-gray-700';
  }

  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{label}</span>;
}

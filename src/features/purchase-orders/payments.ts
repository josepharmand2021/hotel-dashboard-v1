// src/features/purchase-orders/payment.ts
export type PaymentStatus = 'PAID' | 'PARTIAL' | 'UNPAID' | 'OVERDUE';

type Item = { qty?: number; unit_price?: number; amount?: number };
export type POShape = {
  total?: number | null;
  subtotal?: number | null;
  items?: Item[] | null;
  is_tax_included?: boolean | null;
  tax_percent?: number | null;

  // berbagai kemungkinan kolom "paid" di backend
  total_paid?: number | null;
  paid_amount?: number | null;
  payments_total?: number | null;
  expenses_total?: number | null;

  po_date?: string | null;
  delivery_date?: string | null;
  term_code?: string | null;   // 'CBD' | 'COD' | 'NET'
  term_days?: number | null;
  due_date_override?: string | null;
};

const asNum = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);

function computeFormulaDue(po: POShape) {
  const p = po.po_date ? new Date(po.po_date) : null;
  const d = po.delivery_date ? new Date(po.delivery_date) : null;
  const code = (po.term_code || 'NET').toUpperCase();
  const base = code === 'COD' ? (d || p) : p;
  if (!base) return '';
  const dt = new Date(base);
  if (code === 'NET') dt.setDate(dt.getDate() + asNum(po.term_days));
  return dt.toISOString().slice(0, 10);
}

export function computeEffectiveDue(po: POShape) {
  return po.due_date_override || computeFormulaDue(po) || '';
}

export function summarizePayment(po: POShape, now = new Date()) {
  const subtotal =
    po.subtotal != null
      ? asNum(po.subtotal)
      : (po.items || []).reduce(
          (s, it) => s + asNum(it.amount ?? asNum(it.qty) * asNum(it.unit_price)),
          0
        );

  const taxPct = asNum(po.tax_percent);
  const total =
    po.total != null
      ? asNum(po.total)
      : (po.is_tax_included ? subtotal : subtotal * (1 + taxPct / 100));

  const paid = Math.max(
    asNum(po.total_paid),
    asNum(po.paid_amount),
    asNum(po.payments_total),
    asNum(po.expenses_total),
    0
  );

  const balance = Math.max(total - paid, 0);

  const effectiveDue = computeEffectiveDue(po);
  let overdueDays = 0;
  if (effectiveDue && balance > 0) {
    const today = new Date(now); today.setHours(0,0,0,0);
    const due = new Date(effectiveDue); due.setHours(0,0,0,0);
    const diff = Math.ceil((today.getTime() - due.getTime()) / 86400000);
    overdueDays = diff > 0 ? diff : 0;
  }

  let status: PaymentStatus;
  if (paid >= total - 0.5) status = 'PAID';
  else if (paid > 0) status = 'PARTIAL';
  else status = 'UNPAID';
  if (status !== 'PAID' && overdueDays > 0) status = 'OVERDUE';

  return { subtotal, taxPct, total, paid, balance, effectiveDue, overdueDays, status };
}

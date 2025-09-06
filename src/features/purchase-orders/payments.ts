// src/features/purchase-orders/payment.ts
export type PaymentStatus = 'UNBILLED' | 'PAID' | 'PARTIAL' | 'UNPAID' | 'OVERDUE';

type Item = { qty?: number; unit_price?: number; amount?: number };
export type POShape = {
  total?: number | null;
  subtotal?: number | null;
  items?: Item[] | null;
  is_tax_included?: boolean | null;
  tax_percent?: number | null;

  // kolom2 PO untuk fallback due-date (kalau belum ada payable)
  po_date?: string | null;
  delivery_date?: string | null;
  term_code?: string | null;   // 'CBD' | 'COD' | 'NET'
  term_days?: number | null;
  due_date_override?: string | null;
};

// ===== Helper for due-date (fallback tanpa payable) =====
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

// ====== Payment summary BERDASARKAN PAYABLES ======
export type PayableMini = {
  id: number;
  po_id: number;
  amount: number;     // gross invoice
  status: 'unpaid' | 'paid' | 'void';
  due_date: string | null;
};

export type PostedByPayable = Record<number, number>; // payable_id -> total posted expense

export type PoPaymentSummary = {
  total: number;            // total invoice (sum payables.amount)
  paid: number;             // total posted expense
  balance: number;          // total - paid
  status: PaymentStatus;    // UNBILLED/UNPAID/PARTIAL/PAID/OVERDUE
  anyOverdueUnpaid: boolean;
  daysOverdue?: number;     // max overdue days among unpaid payables
};

export function summarizePoPaymentFromPayables(
  payables: PayableMini[],
  postedByPayable?: PostedByPayable,
  now = new Date(),
): PoPaymentSummary {
  const active = (payables || []).filter(p => p.status !== 'void');

  // belum ada payable sama sekali => UNBILLED
  if (active.length === 0) {
    return { total: 0, paid: 0, balance: 0, status: 'UNBILLED', anyOverdueUnpaid: false };
  }

  const total = active.reduce((s, p) => s + (Number(p.amount) || 0), 0);

  const paid = active.reduce((s, p) => {
    const posted = postedByPayable
      ? Number(postedByPayable[p.id] || 0)
      : (p.status === 'paid' ? Number(p.amount) || 0 : 0);
    return s + Math.min(Number(p.amount) || 0, posted);
  }, 0);

  const balance = Math.max(total - paid, 0);

  // overdue: ada payable yang masih kurang bayar & due < today
  const today = new Date(now); today.setHours(0,0,0,0);
  let anyOverdueUnpaid = false;
  let maxOverdueDays = 0;

  for (const p of active) {
    const posted = postedByPayable
      ? Number(postedByPayable[p.id] || 0)
      : (p.status === 'paid' ? Number(p.amount) || 0 : 0);
    const stillOwes = posted < (Number(p.amount) || 0);
    if (!stillOwes) continue;
    if (!p.due_date) continue;

    const due = new Date(p.due_date); due.setHours(0,0,0,0);
    const diff = Math.ceil((today.getTime() - due.getTime()) / 86400000);
    if (diff > 0) {
      anyOverdueUnpaid = true;
      if (diff > maxOverdueDays) maxOverdueDays = diff;
    }
  }

  let status: PaymentStatus;
  if (paid >= total - 0.5) status = 'PAID';
  else if (paid > 0) status = 'PARTIAL';
  else status = 'UNPAID';
  if (status !== 'PAID' && anyOverdueUnpaid) status = 'OVERDUE';

  return { total, paid, balance, status, anyOverdueUnpaid, daysOverdue: maxOverdueDays || undefined };
}

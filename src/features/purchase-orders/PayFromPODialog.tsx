'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { payPO, listExpenseCategories, listExpenseSubcategories,
         type ExpenseCategory, type ExpenseSubcategory } from '@/features/purchase-orders/api.client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const fmtID = new Intl.NumberFormat('id-ID');

type Source = 'PT' | 'RAB' | 'PETTY';

type PODialogPO = {
  id: number;
  po_number: string;
  vendor: { id: number; name?: string | null } | null;
  paid?: number;
  outstanding?: number;
  total?: number;
};

export default function PayFromPODialog({
  open,
  onOpenChange,
  po,
  defaultAmount = 0,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  po: PODialogPO;
  defaultAmount?: number;
  onSuccess?: () => void;
}) {
  const computedOutstanding = useMemo(() => {
    if (typeof po.outstanding === 'number') return Math.max(po.outstanding, 0);
    if (typeof po.total === 'number' && typeof po.paid === 'number') {
      return Math.max(po.total - po.paid, 0);
    }
    return Math.max(defaultAmount, 0);
  }, [po, defaultAmount]);

  const vendorId = po.vendor?.id ?? 0;

  const [submitting, setSubmitting] = useState(false);
  const [source, setSource] = useState<Source>('PT');
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState<number>(Number(computedOutstanding || 0));

  // pickers
  const [cats, setCats] = useState<ExpenseCategory[]>([]);
  const [subs, setSubs] = useState<ExpenseSubcategory[]>([]);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [subcategoryId, setSubcategoryId] = useState<number | null>(null);

  const [invoiceNo, setInvoiceNo] = useState('');
  const [note, setNote] = useState('');
  const [shareholderId, setShareholderId] = useState<number | ''>(''); // RAB
  const [cashboxId, setCashboxId] = useState<number | ''>('');         // PETTY

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const cs = await listExpenseCategories();
        setCats(cs);
        if (cs.length) {
          setCategoryId(cs[0].id);
        }
      } catch (e: any) {
        toast.error(e?.message || 'Failed to load categories');
      }
    })();
  }, [open]);

  useEffect(() => {
    if (!open || !categoryId) { setSubs([]); setSubcategoryId(null); return; }
    (async () => {
      try {
        const ss = await listExpenseSubcategories(categoryId);
        setSubs(ss);
        setSubcategoryId(ss.length ? ss[0].id : null);
      } catch (e: any) {
        toast.error(e?.message || 'Failed to load subcategories');
      }
    })();
  }, [open, categoryId]);

  useEffect(() => {
    // reset amount every time dialog opens with new outstanding
    if (open) setAmount(Number(computedOutstanding || 0));
  }, [open, computedOutstanding]);

  const valid =
    vendorId > 0 &&
    amount > 0 &&
    amount <= Math.max(computedOutstanding, 0) &&
    !!expenseDate &&
    !!categoryId &&
    !!subcategoryId;

  async function onSubmit() {
    if (!valid) { toast.error('Lengkapi data pembayaran'); return; }
    try {
      setSubmitting(true);
      await payPO(po.id, {
        source,
        expense_date: expenseDate,
        amount: Number(amount),
        vendor_id: vendorId,
        category_id: Number(categoryId),
        subcategory_id: Number(subcategoryId),
        status: 'posted',
        shareholder_id: source === 'RAB' ? (shareholderId ? Number(shareholderId) : null) : null,
        cashbox_id: source === 'PETTY' ? (cashboxId ? Number(cashboxId) : null) : null,
        invoice_no: invoiceNo || null,
        note: note || null,
      });
      toast.success('Payment recorded');
      onOpenChange(false);
      onSuccess?.();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !submitting && onOpenChange(v)}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>
            Pay Purchase Order <span className="font-semibold">{po.po_number}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          {/* Source */}
          <div className="grid gap-2">
            <Label>Source</Label>
            <Select value={source} onValueChange={(v) => setSource(v as Source)} disabled={submitting}>
              <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PT">PT (Company)</SelectItem>
                <SelectItem value="RAB">RAB (Shareholder)</SelectItem>
                <SelectItem value="PETTY">Petty Cash</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date & Amount */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Expense Date</Label>
              <Input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} disabled={submitting} />
            </div>
            <div className="grid gap-2">
              <Label>Amount</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={1}
                  max={Math.max(computedOutstanding, 0)}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value || 0))}
                  disabled={submitting}
                />
                <Button type="button" variant="outline" onClick={() => setAmount(Math.max(computedOutstanding, 0))} disabled={submitting}>
                  Max
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                Outstanding: <b>Rp {fmtID.format(Math.max(computedOutstanding, 0))}</b>
              </div>
            </div>
          </div>

          {/* Category & Subcategory pickers */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select
                value={categoryId ? String(categoryId) : undefined}
                onValueChange={(v) => setCategoryId(Number(v))}
                disabled={submitting || cats.length === 0}
              >
                <SelectTrigger><SelectValue placeholder="Choose category" /></SelectTrigger>
                <SelectContent>
                  {cats.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Subcategory</Label>
              <Select
                value={subcategoryId ? String(subcategoryId) : undefined}
                onValueChange={(v) => setSubcategoryId(Number(v))}
                disabled={submitting || subs.length === 0}
              >
                <SelectTrigger><SelectValue placeholder="Choose subcategory" /></SelectTrigger>
                <SelectContent>
                  {subs.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Conditional extras */}
          {source === 'RAB' && (
            <div className="grid gap-2">
              <Label>Shareholder ID</Label>
              <Input
                type="number"
                value={shareholderId}
                onChange={(e) => setShareholderId(e.target.value ? Number(e.target.value) : '')}
                disabled={submitting}
              />
            </div>
          )}
          {source === 'PETTY' && (
            <div className="grid gap-2">
              <Label>Cashbox ID</Label>
              <Input
                type="number"
                value={cashboxId}
                onChange={(e) => setCashboxId(e.target.value ? Number(e.target.value) : '')}
                disabled={submitting}
              />
            </div>
          )}

          {/* Optional fields */}
          <div className="grid gap-2">
            <Label>Invoice No (optional)</Label>
            <Input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} disabled={submitting} />
          </div>
          <div className="grid gap-2">
            <Label>Note (optional)</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} disabled={submitting} />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={onSubmit} disabled={submitting || !valid}>
            {submitting ? 'Saving…' : 'Record Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

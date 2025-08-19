// src/app/finance/expenses/[id]/edit/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  getExpense, updateExpense,
  listCategories, listSubcategories, listActiveShareholders, getBudgetProgress
} from '@/features/expenses/api';
import type { ExpenseDetail } from '@/features/expenses/types';
import type { Category, Subcategory, Shareholder } from '@/features/expenses/api';

import { allocateExpenseToPO, listAllocationsForExpense } from '@/features/expenses-po-links/page';
import ComboboxPO, { POOpt } from '@/components/ComboboxPO';
import ComboboxVendor, { VendorOpt } from '@/components/ComboboxVendor';
import ComboboxCashbox, { CashboxOpt } from '@/components/ComboboxCashbox';

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { toast } from 'sonner';

const fmtID = new Intl.NumberFormat('id-ID');
const toMonthStart = (d: string) => (/^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d.slice(0,7)}-01` : '');

type AllocationRow = {
  id: number;
  purchase_order_id: number;
  amount: number;
  created_at: string;
  purchase_orders?: { po_number?: string | null } | null;
};

export default function ExpenseEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  // master data
  const [cats, setCats] = useState<Category[]>([]);
  const [subs, setSubs] = useState<Subcategory[]>([]);
  const [shs, setShs] = useState<Shareholder[]>([]);

  // form state
  const [source, setSource] = useState<'RAB'|'PT'|'PETTY'>('RAB');
  const [shareholderId, setShareholderId] = useState<string>('');
  const [cashbox, setCashbox] = useState<CashboxOpt | null>(null);
  const [date, setDate] = useState<string>(''); // YYYY-MM-DD
  const [amount, setAmount] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [subcategoryId, setSubcategoryId] = useState<string>('');
  const [vendor, setVendor] = useState<VendorOpt | null>(null);
  const [invoiceNo, setInvoiceNo] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [status, setStatus] = useState<'posted'|'draft'|'void'>('posted');

  // UI state
  const [row, setRow] = useState<ExpenseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [booting, setBooting] = useState(true);

  // PO allocation state
  const [allocs, setAllocs] = useState<AllocationRow[]>([]);
  const [allocLoading, setAllocLoading] = useState(true);
  const [pickPO, setPickPO] = useState<POOpt | null>(null);
  const [allocAmt, setAllocAmt] = useState<string>('');

  const allocatedTotal = useMemo(
    () => allocs.reduce((s, a) => s + Number(a.amount || 0), 0),
    [allocs]
  );
  const expenseAmt = Number(amount || 0);
  const unallocated = Math.max(0, expenseAmt - allocatedTotal);

  // preview
  const [preview, setPreview] = useState<{
    budget_amount: number; realised_monthly: number; realised_cumulative: number; remaining: number; realisation_pct: number | null;
  }|null>(null);
  const periodMonth = useMemo(() => (date ? toMonthStart(date) : ''), [date]);

  // initial load
useEffect(() => {
  (async () => {
    try {
      setLoading(true);
      const [c, h, r] = await Promise.all([
        listCategories(),
        listActiveShareholders(),
        getExpense(Number(id)),
      ]);

      setCats(c);
      setShs(h);
      setRow(r);

      // 1) subcategories for current category
      const s = await listSubcategories(r.category_id);
      const ensured: Subcategory[] = s.some(x => x.id === r.subcategory_id)
        ? s
        : [{
            id: r.subcategory_id,
            name: r.subcategories?.name ?? '(Unknown)',
            category_id: r.category_id
          }, ...s];
      setSubs(ensured);

      // 2) isi value form (type-safe)
      const asSource = (v: string | null | undefined): 'RAB'|'PT'|'PETTY' =>
        v === 'RAB' || v === 'PETTY' ? v : 'PT';
      const asStatus = (v: string | null | undefined): 'posted'|'draft'|'void' =>
        v === 'draft' || v === 'void' ? v : 'posted';

      setSource(asSource(r.source));
      setShareholderId(r.shareholder_id ? String(r.shareholder_id) : '');

      setCashbox(
        r.cashbox_id
          ? { id: Number(r.cashbox_id), name: (r as any).petty_cash_boxes?.name ?? '(Unknown)' }
          : null
      );

      setDate(r.expense_date ?? '');
      setAmount(String(Number(r.amount ?? 0)));
      setCategoryId(String(r.category_id));
      setSubcategoryId(String(r.subcategory_id));

      const vendorOpt: VendorOpt | null = r.vendor_id
        ? { id: Number(r.vendor_id), name: r.vendors?.name ?? '(Unknown)' }
        : null;
      setVendor(vendorOpt);

      setInvoiceNo(r.invoice_no ?? '');
      setNote(r.note ?? '');
      setStatus(asStatus(r.status));

      setBooting(false);
    } catch (e: any) {
      toast.error(e.message || 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  })();
}, [id]);

  // fetch allocations
  async function reloadAllocations() {
    setAllocLoading(true);
    try {
      const data = await listAllocationsForExpense(Number(id));
      setAllocs((data as AllocationRow[]) || []);
    } catch (e:any) {
      toast.error(e.message || 'Gagal memuat PO allocations');
    } finally {
      setAllocLoading(false);
    }
  }
  useEffect(() => { reloadAllocations(); /* eslint-disable-next-line */ }, [id]);

  // load subcats on category change
  useEffect(() => {
    (async () => {
      if (!categoryId) { setSubs([]); if (!booting) setSubcategoryId(''); return; }
      try {
        const s = await listSubcategories(Number(categoryId));
        setSubs(s);
        if (!booting && !s.some(x => String(x.id) === subcategoryId)) {
          setSubcategoryId('');
        }
      } catch (e:any) {
        toast.error(e.message || 'Gagal memuat subcategory');
      }
    })();
  }, [categoryId, booting, subcategoryId]);

  // clear irrelevant fields when source changes
  useEffect(() => {
    if (source !== 'RAB') setShareholderId('');
    if (source !== 'PETTY') setCashbox(null);
  }, [source]);

  // budget preview
  useEffect(() => {
    (async () => {
      setPreview(null);
      if (!periodMonth || !categoryId || !subcategoryId) return;
      try {
        const row = await getBudgetProgress({
          period_month: periodMonth,
          category_id: Number(categoryId),
          subcategory_id: Number(subcategoryId),
        });
        if (row) {
          setPreview({
            budget_amount: Number(row.budget_amount || 0),
            realised_monthly: Number(row.realised_monthly || 0),
            realised_cumulative: Number(row.realised_cumulative || 0),
            remaining: Number(row.remaining || 0),
            realisation_pct: row.realisation_pct === null ? null : Number(row.realisation_pct),
          });
        } else {
          setPreview({ budget_amount: 0, realised_monthly: 0, realised_cumulative: 0, remaining: 0, realisation_pct: null });
        }
      } catch { /* ignore */ }
    })();
  }, [periodMonth, categoryId, subcategoryId]);

  // prefill vendor when choose PO (only if vendor is empty)
  useEffect(() => {
    if (pickPO && !vendor) {
      setVendor({ id: pickPO.vendor_id, name: pickPO.vendor_name });
    }
    // set default alloc amount to unallocated if empty
    if (pickPO && (!allocAmt || Number(allocAmt) <= 0)) {
      setAllocAmt(String(unallocated || pickPO.outstanding || 0));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickPO]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(amount);
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return toast.error('Tanggal wajib (YYYY-MM-DD)');
    if (!Number.isFinite(amt) || amt <= 0) return toast.error('Amount harus > 0');
    if (!categoryId) return toast.error('Category wajib');
    if (!subcategoryId) return toast.error('Subcategory wajib');
    if (source === 'RAB' && !shareholderId) return toast.error('Shareholder wajib untuk Source: RAB');
    if (source === 'PETTY' && !cashbox) return toast.error('Cash Box wajib untuk Source: PETTY');
    if (!vendor) return toast.error('Vendor wajib');

    setSaving(true);
    try {
      await updateExpense(Number(id), {
        source,
        shareholder_id: source === 'RAB' ? Number(shareholderId) : null,
        cashbox_id: source === 'PETTY' ? (cashbox?.id ?? null) : null,
        expense_date: date,
        amount: amt,
        category_id: Number(categoryId),
        subcategory_id: Number(subcategoryId),
        vendor_id: vendor.id,
        invoice_no: invoiceNo || null,
        note: note || null,
        status,
      });

      toast.success('Perubahan disimpan', {
        action: { label: 'Lihat detail', onClick: () => router.push(`/finance/expenses/${id}`) },
      });
    } catch (e:any) {
      toast.error(e.message || 'Gagal menyimpan perubahan');
    } finally {
      setSaving(false);
    }
  }

  // allocate handler
  async function onAllocate() {
    if (!pickPO) return toast.error('Pilih PO terlebih dahulu');
    const a = Number(allocAmt);
    if (!Number.isFinite(a) || a <= 0) return toast.error('Amount allocation harus > 0');
    if (a > unallocated) return toast.error('Amount allocation melebihi unallocated');

    try {
      await allocateExpenseToPO(Number(id), pickPO.id, a);
      toast.success('Berhasil dialokasikan ke PO');
      setPickPO(null);
      setAllocAmt('');
      await reloadAllocations();
    } catch (e:any) {
      toast.error(e.message || 'Gagal allocate ke PO');
    }
  }

  const statusTone =
    status === 'posted' ? 'bg-emerald-600'
    : status === 'draft' ? 'bg-amber-500' : 'bg-gray-500';

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Edit Expense</h2>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={()=>router.push(`/finance/expenses/${id}`)}>Lihat Detail</Button>
          <Button type="button" variant="outline" onClick={()=>router.push('/finance/expenses')}>Back to List</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: form */}
        <Card className="lg:col-span-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <span>Rp {amount ? fmtID.format(Number(amount)) : (row ? fmtID.format(row.amount) : '—')}</span>
              <Badge className={statusTone}>{status}</Badge>
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Row 1 */}
              <div className="md:col-span-3 space-y-2">
                <Label>Source<span className="text-red-600">*</span></Label>
                <Select value={source} onValueChange={(v:any)=>setSource(v)}>
                  <SelectTrigger><SelectValue placeholder="Pilih sumber" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RAB">RAB</SelectItem>
                    <SelectItem value="PT">PT</SelectItem>
                    <SelectItem value="PETTY">PETTY</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-4 space-y-2">
                <Label>Date<span className="text-red-600">*</span></Label>
                <Input type="date" value={date} onChange={(e)=>setDate(e.target.value)} required />
              </div>

              <div className="md:col-span-5 space-y-2">
                <Label>Amount (IDR)<span className="text-red-600">*</span></Label>
                <Input inputMode="numeric" value={amount} onChange={(e)=>setAmount(e.target.value)} placeholder="25000000" required />
              </div>

              {/* Row 2 (conditional) */}
              {source === 'RAB' && (
                <div className="md:col-span-6 space-y-2">
                  <Label>Shareholder<span className="text-red-600">*</span></Label>
                  <Select value={shareholderId} onValueChange={setShareholderId}>
                    <SelectTrigger><SelectValue placeholder="Pilih shareholder" /></SelectTrigger>
                    <SelectContent>
                      {shs.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {source === 'PETTY' && (
                <div className="md:col-span-6 space-y-2">
                  <Label>Cash Box<span className="text-red-600">*</span></Label>
                  <ComboboxCashbox value={cashbox} onChange={setCashbox} />
                </div>
              )}

              {/* Row 3 */}
              <div className="md:col-span-6 space-y-2">
                <Label>Category<span className="text-red-600">*</span></Label>
                <Select value={categoryId} onValueChange={(v)=>setCategoryId(v)}>
                  <SelectTrigger><SelectValue placeholder="Pilih category" /></SelectTrigger>
                  <SelectContent>
                    {cats.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-6 space-y-2">
                <Label>Subcategory<span className="text-red-600">*</span></Label>
                <Select value={subcategoryId} onValueChange={(v)=>setSubcategoryId(v)} disabled={!categoryId}>
                  <SelectTrigger><SelectValue placeholder={categoryId ? 'Pilih subcategory' : 'Pilih category dulu'} /></SelectTrigger>
                  <SelectContent>
                    {subs.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Row 4 */}
              <div className="md:col-span-12 space-y-2">
                <Label>Vendor<span className="text-red-600">*</span></Label>
                <ComboboxVendor value={vendor} onChange={setVendor} />
              </div>

              {/* Row 5 */}
              <div className="md:col-span-4 space-y-2">
                <Label>Invoice No (optional)</Label>
                <Input value={invoiceNo} onChange={(e)=>setInvoiceNo(e.target.value)} placeholder="INV-001" />
              </div>

              <div className="md:col-span-3 space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v:any)=>setStatus(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="posted">Posted</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="void">Void</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* spacer */}
              <div className="md:col-span-5" />

              {/* Row 6 */}
              <div className="md:col-span-12 space-y-2">
                <Label>Note</Label>
                <Textarea value={note} onChange={(e)=>setNote(e.target.value)} placeholder="Catatan..." />
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={()=>router.push(`/finance/expenses/${id}`)}>Batal</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Menyimpan…' : 'Save Changes'}</Button>
          </CardFooter>
        </Card>

        {/* RIGHT: preview */}
        <Card className="lg:col-span-4 h-fit lg:sticky lg:top-20">
          <CardHeader><CardTitle>Budget Context</CardTitle></CardHeader>
          <CardContent>
            {!periodMonth || !categoryId || !subcategoryId ? (
              <div className="text-sm text-muted-foreground">
                Lengkapi <b>Date</b>, <b>Category</b>, dan <b>Subcategory</b> untuk preview.
              </div>
            ) : preview ? (
              <div className="grid grid-cols-1 gap-4">
                <Stat label="TOTAL BUDGET" value={preview.budget_amount} />
                <Stat label="REALISASI (Bulan ini)" value={preview.realised_monthly} />
                <Stat label="REALISASI (Kumulatif)" value={preview.realised_cumulative} />
                <div>
                  <div className="text-xs text-muted-foreground">SISA</div>
                  <div className={`text-lg font-semibold ${preview.remaining < 0 ? 'text-red-600' : ''}`}>
                    Rp {fmtID.format(preview.remaining || 0)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Memuat…</div>
            )}
          </CardContent>
        </Card>

        {/* LEFT (below form): PO Allocation */}
        <Card className="lg:col-span-8">
          <CardHeader><CardTitle>PO Allocation</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-6 space-y-2">
                <Label>Pilih PO</Label>
                <ComboboxPO value={pickPO} onChange={setPickPO} />
              </div>
              <div className="md:col-span-3 space-y-2">
                <Label>Amount</Label>
                <Input inputMode="numeric" value={allocAmt} onChange={(e)=>setAllocAmt(e.target.value)} placeholder={String(unallocated || 0)} />
              </div>
              <div className="md:col-span-3">
                <Button type="button" onClick={onAllocate} className="w-full">Allocate</Button>
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              Allocated: <b>Rp {fmtID.format(allocatedTotal)}</b> • Unallocated: <b>Rp {fmtID.format(unallocated)}</b>
            </div>

            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-3 py-2">PO Number</th>
                    <th className="text-right px-3 py-2">Amount</th>
                    <th className="text-left px-3 py-2">Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {allocLoading && (
                    <tr><td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">Memuat…</td></tr>
                  )}
                  {!allocLoading && allocs.length === 0 && (
                    <tr><td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">Belum ada alokasi ke PO</td></tr>
                  )}
                  {!allocLoading && allocs.map((a) => (
                    <tr key={a.id} className="border-t">
                      <td className="px-3 py-2">
                        <Link href={`/purchase-orders/${a.purchase_order_id}`} className="underline underline-offset-4">
                          {a.purchase_orders?.po_number || `PO #${a.purchase_order_id}`}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-right">Rp {fmtID.format(Number(a.amount || 0))}</td>
                      <td className="px-3 py-2">{String(a.created_at).slice(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  const fmtID = new Intl.NumberFormat('id-ID');
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">Rp {fmtID.format(value || 0)}</div>
    </div>
  );
}

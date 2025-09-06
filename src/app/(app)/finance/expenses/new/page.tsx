'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  listCategories,
  listSubcategories,
  listActiveShareholders,
  createExpense,
  getBudgetProgress,
  type Category,
  type Subcategory,
  type Shareholder,
} from '@/features/expenses/api';

import ComboboxPayable, { type PayableOpt } from '@/components/ComboboxPayable';
import ComboboxVendor, { type VendorOpt } from '@/components/ComboboxVendor';
import ComboboxCashbox, { type CashboxOpt } from '@/components/ComboboxCashbox';

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const fmtID = new Intl.NumberFormat('id-ID');
const toMonthStart = (d: string) => (/^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d.slice(0, 7)}-01` : '');
const today = () => new Date().toISOString().slice(0, 10);

export default function NewExpensePage() {
  const router = useRouter();
  const search = useSearchParams();

  // form state
  const [source, setSource] = useState<'RAB' | 'PT' | 'PETTY'>('RAB');
  const [shareholderId, setShareholderId] = useState<string>('');
  const [cashbox, setCashbox] = useState<CashboxOpt | null>(null);
  const [date, setDate] = useState<string>(search?.get('date') || '');
  const [amount, setAmount] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [subcategoryId, setSubcategoryId] = useState<string>('');
  const [vendor, setVendor] = useState<VendorOpt | null>(null);
  const [invoiceNo, setInvoiceNo] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [status, setStatus] = useState<'posted' | 'draft'>('posted');

  // Payable (opsional)
  const [payable, setPayable] = useState<PayableOpt | null>(null);

  // options
  const [cats, setCats] = useState<Category[]>([]);
  const [subs, setSubs] = useState<Subcategory[]>([]);
  const [shs, setShs] = useState<Shareholder[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // flag: lagi prefill dari payable → blok efek loader subcategory
  const prefillingRef = useRef(false);
  const prefillSubIdRef = useRef<string|null>(null);  // ⬅️ baru


  // preview
  const [preview, setPreview] = useState<{
    budget_amount: number;
    realised_monthly: number;
    realised_cumulative: number;
    remaining: number;
    realisation_pct: number | null;
  } | null>(null);
  const periodMonth = useMemo(() => (date ? toMonthStart(date) : ''), [date]);

  /* ===== masters ===== */
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [c, sh] = await Promise.all([listCategories(), listActiveShareholders()]);
        setCats(c);
        setShs(sh);
      } catch (e: any) {
        toast.error(e.message || 'Gagal memuat master data');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ===== load subcategory saat category berubah (skip kalau sedang prefill) ===== */
useEffect(() => {
  (async () => {
    if (prefillingRef.current) return;     // ⬅️ penting
    setSubcategoryId('');
    if (!categoryId) { setSubs([]); return; }
    try {
      const list = await listSubcategories(Number(categoryId));
      setSubs(list);
    } catch { /* toast kalau perlu */ }
  })();
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [categoryId]);



  /* ===== preview budget ===== */
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
        setPreview(
          row
            ? {
                budget_amount: Number(row.budget_amount || 0),
                realised_monthly: Number(row.realised_monthly || 0),
                realised_cumulative: Number(row.realised_cumulative || 0),
                remaining: Number(row.remaining || 0),
                realisation_pct: row.realisation_pct === null ? null : Number(row.realisation_pct),
              }
            : { budget_amount: 0, realised_monthly: 0, realised_cumulative: 0, remaining: 0, realisation_pct: null }
        );
      } catch {
        /* ignore preview error */
      }
    })();
  }, [periodMonth, categoryId, subcategoryId]);

useEffect(() => {
  if (!payable) return;

  (async () => {
    prefillingRef.current = true;

    setSource(((payable.source as any) || 'PT') as 'PT'|'RAB'|'PETTY');
    setVendor({ id: payable.vendor_id, name: payable.vendor_name });
    setAmount((prev) => (prev && Number(prev) > 0 ? prev : String(payable.amount || 0)));
    setInvoiceNo((prev) => (prev?.trim() ? prev : payable.invoice_no || ''));
    setNote((prev) => (prev?.trim() ? prev : `Payment for invoice ${payable.invoice_no}`));
    setDate((d) => d || payable.invoice_date || today());

    const catId = payable.category_id ?? null;
    const subId = payable.subcategory_id ?? null;

    if (catId) {
      setCategoryId(String(catId));
      prefillSubIdRef.current = subId != null ? String(subId) : null;  // ⬅️ simpan target subId

      try {
        const list = await listSubcategories(Number(catId));
        setSubs(list);                          // biarkan efek di bawah yang set value
      } catch {
        setSubs([]);
      }
    } else {
      setCategoryId('');
      setSubs([]);
      prefillSubIdRef.current = null;
      setSubcategoryId('');
    }

    prefillingRef.current = false;
  })();
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [payable]);
useEffect(() => {
  const target = prefillSubIdRef.current;
  if (!target) return;
  if (subs.some(s => String(s.id) === target)) {
    setSubcategoryId(target);          // ⬅️ baru benar-benar set ke Select
    prefillSubIdRef.current = null;    // bersihkan sekali pakai
  }
}, [subs]);


  /* ===== submit ===== */
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(amount);

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return toast.error('Tanggal wajib (YYYY-MM-DD)');
    if (!Number.isFinite(amt) || amt <= 0) return toast.error('Amount harus > 0');
    if (!categoryId) return toast.error('Category wajib');
    if (!subcategoryId) return toast.error('Subcategory wajib');
    if (!vendor) return toast.error('Vendor wajib');
    if (source === 'RAB' && !shareholderId) return toast.error('Shareholder wajib untuk Source: RAB');
    if (source === 'PETTY' && !cashbox) return toast.error('Cash Box wajib untuk Source: PETTY');

    setSaving(true);
    try {
      await createExpense({
        source,
        shareholder_id: source === 'RAB' ? Number(shareholderId) : null,
        cashbox_id: source === 'PETTY' ? cashbox?.id ?? null : null,
        expense_date: date,
        amount: Math.round(amt),
        category_id: Number(categoryId),
        subcategory_id: Number(subcategoryId),
        vendor_id: vendor.id,
        invoice_no: invoiceNo || null,
        note: note || null,
        status,
        // NOTE: kalau kamu mau auto-link by payable id, tambahkan field ini di API createExpense
        // atau biarkan sisi server/client lakukan linking berdasarkan invoice/vendor
        // payable_id: payable?.id ?? null,
      } as any);

      toast.success('Expense tersimpan');
      router.push('/finance/expenses');
    } catch (e: any) {
      toast.error(e.message || 'Gagal menyimpan expense');
    } finally {
      setSaving(false);
    }
  }

  /* ===== UI ===== */
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">New Expense</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT */}
        <Card className="lg:col-span-8">
          <CardHeader><CardTitle>Primary</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Payable (opsional) */}
              <div className="md:col-span-12 space-y-2">
                <Label>Payable (opsional)</Label>
                <ComboboxPayable value={payable} onChange={setPayable} />
                <div className="text-xs text-muted-foreground">
                  Jika dipilih: Vendor/Category/Subcategory/Amount &amp; Note otomatis terisi.
                </div>
              </div>

              <div className="md:col-span-3 space-y-2">
                <Label>Source<span className="text-red-600">*</span></Label>
                <Select value={source} onValueChange={(v: any) => setSource(v)}>
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
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>

              <div className="md:col-span-5 space-y-2">
                <Label>Amount (IDR)<span className="text-red-600">*</span></Label>
                <Input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="25000000" required />
              </div>

              {/* RAB only */}
              {source === 'RAB' && (
                <div className="md:col-span-6 space-y-2">
                  <Label>Shareholder<span className="text-red-600">*</span></Label>
                  <Select value={shareholderId} onValueChange={setShareholderId}>
                    <SelectTrigger><SelectValue placeholder="Pilih shareholder" /></SelectTrigger>
                    <SelectContent>
                      {shs.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="md:col-span-6 space-y-2">
                <Label>Category<span className="text-red-600">*</span></Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger><SelectValue placeholder="Pilih category" /></SelectTrigger>
                  <SelectContent>
                    {cats.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-6 space-y-2">
                <Label>Subcategory<span className="text-red-600">*</span></Label>
                <Select value={subcategoryId} onValueChange={setSubcategoryId} disabled={!categoryId}>
                  <SelectTrigger><SelectValue placeholder={categoryId ? 'Pilih subcategory' : 'Pilih category dulu'} /></SelectTrigger>
                  <SelectContent>
                    {subs.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* PETTY only */}
              {source === 'PETTY' && (
                <div className="md:col-span-6 space-y-2">
                  <Label>Cash Box<span className="text-red-600">*</span></Label>
                  <ComboboxCashbox value={cashbox} onChange={setCashbox} />
                </div>
              )}

              <div className="md:col-span-12 space-y-2">
                <Label>Vendor<span className="text-red-600">*</span></Label>
                <ComboboxVendor value={vendor} onChange={setVendor} />
              </div>

              <div className="md:col-span-4 space-y-2">
                <Label>Invoice No (optional)</Label>
                <Input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} placeholder="INV-001" />
              </div>

              <div className="md:col-span-3 space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="posted">Posted</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-12 space-y-2">
                <Label>Note</Label>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Catatan..." />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => history.back()}>Batal</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Menyimpan…' : 'Save Expense'}</Button>
          </CardFooter>
        </Card>

        {/* RIGHT */}
        <Card className="lg:col-span-4 h-fit lg:sticky lg:top-20 self-start">
          <CardHeader><CardTitle>Budget Progress (Preview)</CardTitle></CardHeader>
          <CardContent>
            {!periodMonth || !categoryId || !subcategoryId ? (
              <div className="text-sm text-muted-foreground">
                Pilih <b>Date</b>, <b>Category</b>, dan <b>Subcategory</b> untuk menampilkan preview.
              </div>
            ) : preview ? (
              <div className="grid grid-cols-1 gap-4">
                <div><div className="text-xs text-muted-foreground">TOTAL BUDGET</div><div className="text-lg font-semibold">Rp {fmtID.format(preview.budget_amount || 0)}</div></div>
                <div><div className="text-xs text-muted-foreground">REALISASI (Bulan ini)</div><div className="text-lg font-semibold">Rp {fmtID.format(preview.realised_monthly || 0)}</div></div>
                <div><div className="text-xs text-muted-foreground">REALISASI (Kumulatif)</div><div className="text-lg font-semibold">Rp {fmtID.format(preview.realised_cumulative || 0)}</div></div>
                <div><div className="text-xs text-muted-foreground">SISA</div><div className={`text-lg font-semibold ${preview.remaining < 0 ? 'text-red-600' : ''}`}>Rp {fmtID.format(preview.remaining || 0)}</div></div>
              </div>
            ) : <div className="text-sm text-muted-foreground">Memuat…</div>}
          </CardContent>
        </Card>
      </div>
    </form>
  );
}

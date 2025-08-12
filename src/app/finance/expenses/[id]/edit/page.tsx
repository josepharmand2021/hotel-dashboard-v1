'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  getExpense, updateExpense,
  listCategories, listSubcategories, listActiveShareholders, getBudgetProgress
} from '@/features/expenses/api';
import type { ExpenseDetail } from '@/features/expenses/types';
import type { Category, Subcategory, Shareholder } from '@/features/expenses/api';

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

import ComboboxVendor, { VendorOpt } from '@/components/ComboboxVendor';
import ComboboxCashbox, { CashboxOpt } from '@/components/ComboboxCashbox'; // ✅ NEW

const fmtID = new Intl.NumberFormat('id-ID');
const toMonthStart = (d: string) => (/^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d.slice(0,7)}-01` : '');

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
  const [cashbox, setCashbox] = useState<CashboxOpt | null>(null);        // ✅ NEW
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

        // 1) load subcategories untuk category row
        const s = await listSubcategories(r.category_id);
        const ensured = s.some(x => x.id === r.subcategory_id)
          ? s
          : [{ id: r.subcategory_id, name: r.subcategories?.name ?? '(Unknown)', category_id: r.category_id }, ...s];
        setSubs(ensured);

        // 2) isi value form
        setSource(r.source);
        setShareholderId(r.shareholder_id ? String(r.shareholder_id) : '');
        setCashbox(
          r.cashbox_id
            ? { id: r.cashbox_id as unknown as number, name: (r as any).petty_cash_boxes?.name ?? '(Unknown)' }
            : null
        ); // ✅ NEW (fallback Unknown)
        setDate(r.expense_date);
        setAmount(String(r.amount ?? ''));
        setCategoryId(String(r.category_id));
        setSubcategoryId(String(r.subcategory_id));
        setVendor(r.vendors ? { id: r.vendor_id, name: r.vendors.name } : { id: r.vendor_id, name: '(Unknown)' });
        setInvoiceNo(r.invoice_no || '');
        setNote(r.note || '');
        setStatus(r.status);

        setBooting(false); // ✅ penting
      } catch (e:any) {
        toast.error(e.message || 'Gagal memuat data');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // reload subcats saat category berubah
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

  // clear field yang tidak relevan saat ganti source
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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(amount);
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return toast.error('Tanggal wajib (YYYY-MM-DD)');
    if (!Number.isFinite(amt) || amt <= 0) return toast.error('Amount harus > 0');
    if (!categoryId) return toast.error('Category wajib');
    if (!subcategoryId) return toast.error('Subcategory wajib');
    if (source === 'RAB' && !shareholderId) return toast.error('Shareholder wajib untuk Source: RAB');
    if (source === 'PETTY' && !cashbox) return toast.error('Cash Box wajib untuk Source: PETTY'); // ✅ NEW
    if (!vendor) return toast.error('Vendor wajib');

    setSaving(true);
    try {
      await updateExpense(Number(id), {
        source,
        shareholder_id: source === 'RAB' ? Number(shareholderId) : null,
        cashbox_id: source === 'PETTY' ? (cashbox?.id ?? null) : null,     // ✅ NEW
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

  const statusTone =
    status === 'posted' ? 'bg-emerald-600'
    : status === 'draft' ? 'bg-amber-500' : 'bg-gray-500';

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Edit Expense</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={()=>router.push(`/finance/expenses/${id}`)}>Lihat Detail</Button>
          <Button variant="outline" onClick={()=>router.push('/finance/expenses')}>Back to List</Button>
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

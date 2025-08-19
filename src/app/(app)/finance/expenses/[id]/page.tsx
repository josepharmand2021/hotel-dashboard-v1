'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  getExpense, setExpenseStatus, deleteExpense, getBudgetProgress,
} from '@/features/expenses/api';
import type { ExpenseDetail } from '@/features/expenses/types';

const fmtID = new Intl.NumberFormat('id-ID');
const toMonthStart = (d: string) => (/^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d.slice(0,7)}-01` : '');

export default function ExpenseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [row, setRow] = useState<ExpenseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const [preview, setPreview] = useState<{
    budget_amount: number; realised_monthly: number; realised_cumulative: number; remaining: number; realisation_pct: number | null;
  } | null>(null);

  const periodMonth = useMemo(() => row?.expense_date ? toMonthStart(row.expense_date) : '', [row?.expense_date]);

  async function load() {
    try {
      setLoading(true);
      const data = await getExpense(Number(id));
      setRow(data);
    } catch (e:any) {
      toast.error(e.message || 'Gagal memuat expense');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  useEffect(() => {
    (async () => {
      setPreview(null);
      if (!row) return;
      try {
        const res = await getBudgetProgress({
          period_month: toMonthStart(row.expense_date),
          category_id: row.category_id,
          subcategory_id: row.subcategory_id,
        });
        setPreview(res ? {
          budget_amount: Number(res.budget_amount || 0),
          realised_monthly: Number(res.realised_monthly || 0),
          realised_cumulative: Number(res.realised_cumulative || 0),
          remaining: Number(res.remaining || 0),
          realisation_pct: res.realisation_pct === null ? null : Number(res.realisation_pct),
        } : { budget_amount: 0, realised_monthly: 0, realised_cumulative: 0, remaining: 0, realisation_pct: null });
      } catch {}
    })();
  }, [row?.expense_date, row?.category_id, row?.subcategory_id]);

  async function handleSetStatus(s: 'posted'|'draft'|'void') {
    if (!row) return;
    setActing(true);
    try {
      await setExpenseStatus(row.id, s);
      toast.success(`Status diubah ke ${s}`);
      await load();
    } catch (e:any) {
      toast.error(e.message || 'Gagal update status');
    } finally { setActing(false); }
  }

  async function handleDelete() {
    if (!row) return;
    if (!confirm('Hapus expense ini?')) return;
    setActing(true);
    try {
      await deleteExpense(row.id);
      toast.success('Expense dihapus');
      router.push('/finance/expenses');
    } catch (e:any) {
      toast.error(e.message || 'Gagal menghapus');
    } finally { setActing(false); }
  }

  const statusTone = row?.status === 'posted' ? 'bg-emerald-600'
                    : row?.status === 'draft' ? 'bg-amber-500' : 'bg-gray-500';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Expense Detail</h2>

        <div className="flex gap-2">
        <Button variant="outline" onClick={()=>router.push(`/finance/expenses/${id}/edit`)}>Edit</Button>
        <Button variant="outline" onClick={()=>router.push('/finance/expenses')}>Back</Button>
        {row?.status !== 'posted' && <Button onClick={()=>handleSetStatus('posted')}>Post</Button>}
        {row?.status === 'posted' && <Button variant="secondary" onClick={()=>handleSetStatus('draft')}>Set Draft</Button>}
        <Button variant="destructive" onClick={handleDelete}>Delete</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT */}
        <Card className="lg:col-span-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <span>Rp {row ? fmtID.format(row.amount) : '—'}</span>
              {row && (
                <>
                  <Badge className={statusTone}>{row.status}</Badge>
                  <Badge variant="secondary">{row.source}</Badge>
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading && <div className="text-sm text-muted-foreground">Memuat…</div>}
            {!loading && row && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Date" value={row.expense_date} />
                  <Field label="Invoice" value={row.invoice_no || '—'} />
                  <Field label="Vendor" value={row.vendors?.name || '—'} />
                  {row.source === 'RAB' && <Field label="Shareholder" value={row.shareholders?.name || '—'} />}
                  <Field label="Category" value={row.categories?.name || '—'} />
                  <Field label="Subcategory" value={row.subcategories?.name || '—'} />
                </div>

                <Separator />
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Note</div>
                  <div className="whitespace-pre-wrap">{row.note || '—'}</div>
                </div>
                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <Field label="Created at" value={new Date(row.created_at).toLocaleString()} />
                  <Field label="Updated at" value={new Date(row.updated_at).toLocaleString()} />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* RIGHT */}
        <Card className="lg:col-span-4 h-fit lg:sticky lg:top-20">
          <CardHeader><CardTitle>Budget Context</CardTitle></CardHeader>
          <CardContent>
            {!row ? (
              <div className="text-sm text-muted-foreground">—</div>
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
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
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

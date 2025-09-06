'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import { supabase } from '@/lib/supabase/client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import Breadcrumbs from '@/components/layout/Breadcrumbs';

/* ================= Helpers ================= */
const round0 = (n: number) => Math.round(Number(n) || 0);

function deriveAmountsFromPO(opts: {
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  tax_percent: number;
  is_tax_included: boolean;
  targetGross?: number; // kalau diisi, lakukan prorata ke outstanding
}) {
  const { subtotal, tax_amount, total_amount, tax_percent, is_tax_included, targetGross } = opts;

  let gross = Number(targetGross ?? total_amount);
  if (gross <= 0) return { dpp: 0, ppn: 0, gross: 0 };

  // tanpa prorata (sama dengan total_amount)
  if (!targetGross || Math.abs(gross - total_amount) < 0.5) {
    return { dpp: round0(subtotal), ppn: round0(tax_amount), gross: round0(total_amount) };
  }

  // prorata ke outstanding
  if (is_tax_included) {
    const ratio = gross / Math.max(total_amount, 1);
    const dpp = round0(subtotal * ratio);
    const ppn = round0(gross - dpp);
    return { dpp, ppn, gross: round0(gross) };
  } else {
    const pct = Number(tax_percent || 0) / 100;
    const dpp = round0(gross / (1 + pct));
    const ppn = round0(gross - dpp);
    return { dpp, ppn, gross: round0(gross) };
  }
}

const iso = (d?: Date | string | null) => {
  if (!d) return '';
  const obj = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(+obj)) return '';
  return new Date(obj).toISOString().slice(0, 10);
};

/* ================= Schema ================= */
const schema = z.object({
  po_id: z.number().int().positive().nullable().optional(),
  vendor_id: z.coerce.number().int().positive({ message: 'Vendor is required' }),
  invoice_no: z.string().min(1, 'Invoice No is required'),
  invoice_date: z.string().min(1, 'Invoice Date is required'),
  due_date: z.string().optional().or(z.literal('')),
  dpp: z.coerce.number().nonnegative().default(0),
  ppn: z.coerce.number().nonnegative().default(0),
  gross: z.coerce.number().nonnegative().default(0),
  note: z.string().optional().or(z.literal('')),
});
type FormVals = z.infer<typeof schema>;

type POOpt = { id: number; po_number: string; vendor_id: number; vendor_name: string };

export default function NewPayableClient() {
  const router = useRouter();
  const search = useSearchParams();

  const [poOpts, setPoOpts] = useState<POOpt[]>([]);
  const [poMeta, setPoMeta] = useState<{
    id: number;
    po_number: string;
    vendor_id: number;
    vendor_name: string;
  } | null>(null);

  // info pajak dari PO utk ditampilkan setelah import
  const [poTaxInfo, setPoTaxInfo] = useState<{ included: boolean; percent: number } | null>(null);
  const [importing, setImporting] = useState(false);

  const form = useForm<FormVals>({
    resolver: zodResolver(schema),
    defaultValues: {
      po_id: null,
      vendor_id: undefined as unknown as number,
      invoice_no: '',
      invoice_date: iso(new Date()),
      due_date: '',
      dpp: 0,
      ppn: 0,
      gross: 0,
      note: '',
    },
    mode: 'onChange',
  });

  const poId = useWatch({ control: form.control, name: 'po_id' }) as number | null;

  /* ====== Prefill dari URL ?po_id=xxx ====== */
  useEffect(() => {
    const pid = Number(search.get('po_id') || 0);
    if (pid > 0) {
      form.setValue('po_id', pid, { shouldDirty: true, shouldValidate: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  /* ====== Load pilihan PO (ringkas) ====== */
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('v_po_with_terms')
        .select('id, po_number, vendor_id, vendor_name')
        .order('id', { ascending: false })
        .limit(100);
      if (error) return;

      setPoOpts(
        (data ?? []).map((r: any) => ({
          id: Number(r.id),
          po_number: String(r.po_number ?? ''),
          vendor_id: Number(r.vendor_id ?? 0),
          vendor_name: String(r.vendor_name ?? ''),
        }))
      );
    })();
  }, []);

  /* ====== Saat PO berubah: kunci vendor & due-date dasar ====== */
  useEffect(() => {
    if (!poId) {
      setPoMeta(null);
      setPoTaxInfo(null);
      return;
    }

    (async () => {
      const { data: po, error } = await supabase
        .from('v_po_with_terms')
        .select('id, po_number, vendor_id, vendor_name, due_date_effective')
        .eq('id', poId)
        .maybeSingle();

      if (error || !po) return;

      setPoMeta({
        id: Number(po.id),
        po_number: String(po.po_number ?? ''),
        vendor_id: Number(po.vendor_id ?? 0),
        vendor_name: String(po.vendor_name ?? ''),
      });

      form.setValue('vendor_id', Number(po.vendor_id ?? 0), { shouldValidate: true });
      form.setValue('due_date', po.due_date_effective ? iso(po.due_date_effective) : '');
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poId]);

  /* ====== Handler tombol: Import dari PO ====== */
  const importFromPO = async () => {
    if (!poId) {
      toast.error('Pilih PO dulu.');
      return;
    }
    setImporting(true);
    try {
      // 1) Detail pajak & angka di PO
      const { data: po, error: poErr } = await supabase
        .from('v_po_with_terms')
        .select('is_tax_included, tax_percent, subtotal, tax_amount, total_amount')
        .eq('id', poId)
        .maybeSingle();
      if (poErr || !po) throw poErr || new Error('PO tidak ditemukan');

      // 2) Outstanding dari finance view
      const { data: fin } = await supabase
        .from('v_po_finance')
        .select('outstanding')
        .eq('id', poId)
        .maybeSingle();

      const outstanding = Number(fin?.outstanding ?? po.total_amount ?? 0);

      // 3) Hitung dan set ke form
      const calc = deriveAmountsFromPO({
        subtotal: Number(po.subtotal ?? 0),
        tax_amount: Number(po.tax_amount ?? 0),
        total_amount: Number(po.total_amount ?? 0),
        tax_percent: Number(po.tax_percent ?? 0),
        is_tax_included: !!po.is_tax_included,
        targetGross: outstanding,
      });

      form.setValue('dpp', calc.dpp, { shouldDirty: true, shouldValidate: true });
      form.setValue('ppn', calc.ppn, { shouldDirty: true, shouldValidate: true });
      form.setValue('gross', calc.gross, { shouldDirty: true, shouldValidate: true });

      setPoTaxInfo({ included: !!po.is_tax_included, percent: Number(po.tax_percent ?? 0) });
      toast.success('DPP/PPN/Gross di-import dari PO (outstanding).');
    } catch (e: any) {
      toast.error(e.message || 'Gagal import dari PO');
    } finally {
      setImporting(false);
    }
  };

  /* ====== Submit (sesuaikan kolom di DB) ====== */
  const onSubmit = async (vals: FormVals) => {
    try {
      const payload = {
        po_id: vals.po_id,
        vendor_id: vals.vendor_id,
        invoice_no: vals.invoice_no,
        invoice_date: vals.invoice_date,
        due_date: vals.due_date || null,
        amount_dpp: vals.dpp,
        amount_ppn: vals.ppn,
        amount_gross: vals.gross,
        note: vals.note || null,
      };

      const { error } = await supabase.from('payables').insert(payload);
      if (error) throw error;

      toast.success('Payable created');
      router.push('/payables');
    } catch (e: any) {
      toast.error(e.message || 'Failed to create payable');
    }
  };

  return (
    <div className="max-w-5xl space-y-4">
      <Breadcrumbs
        className="mb-2"
        items={[
          { label: 'Dashboard', href: '/dashboard/overview' },
          { label: 'Payables', href: '/payables' },
          { label: 'New', current: true },
        ]}
      />
      <h1 className="text-2xl font-semibold">New Payable</h1>

      {poMeta && (
        <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm">
          From PO <span className="font-medium">{poMeta.po_number}</span> · Vendor:{' '}
          <span className="font-medium">{poMeta.vendor_name}</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Payable Information</CardTitle>
        </CardHeader>
        <Separator />

        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="grid gap-6 md:grid-cols-2 pb-6">
            {/* PO (opsional) + tombol import */}
            <div className="md:col-span-2">
              <Label htmlFor="po_id">PO (optional)</Label>
              <div className="mt-2 flex gap-2">
                <select
                  id="po_id"
                  className="block w-full rounded-md border px-3 py-2 text-sm bg-background"
                  value={poId ?? ''}
                  onChange={(e) =>
                    form.setValue(
                      'po_id',
                      e.target.value ? Number(e.target.value) : (null as any),
                      { shouldDirty: true, shouldValidate: true }
                    )
                  }
                >
                  <option value="">— Without PO —</option>
                  {poOpts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.po_number} — {p.vendor_name}
                    </option>
                  ))}
                </select>

                <Button
                  type="button"
                  variant="secondary"
                  disabled={!poId || importing}
                  onClick={importFromPO}
                  title="Import amount outstanding & tax dari PO"
                >
                  {importing ? 'Mengambil…' : 'Import dari PO'}
                </Button>
              </div>
              {poTaxInfo && (
                <p className="text-xs text-muted-foreground mt-1">
                  Tax PO: <span className="font-medium">{poTaxInfo.percent}%</span>{' '}
                  {poTaxInfo.included ? '(included)' : '(added)'}
                </p>
              )}
            </div>

            {/* Vendor */}
            <div>
              <Label htmlFor="vendor_id">Vendor *</Label>
              <Input
                id="vendor_id"
                type="number"
                className="mt-2"
                {...form.register('vendor_id', { valueAsNumber: true })}
                readOnly={!!poMeta}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {poMeta ? `Locked by PO (${poMeta.vendor_name})` : 'Isi ID vendor (atau ganti ke combobox vendor kamu)'}
              </p>
            </div>

            {/* Invoice No / Date */}
            <div>
              <Label htmlFor="invoice_no">Invoice No *</Label>
              <Input id="invoice_no" className="mt-2" {...form.register('invoice_no')} />
            </div>

            <div>
              <Label htmlFor="invoice_date">Invoice Date *</Label>
              <Input id="invoice_date" type="date" className="mt-2" {...form.register('invoice_date')} />
            </div>

            {/* Due Date */}
            <div>
              <Label htmlFor="due_date">Due Date</Label>
              <Input id="due_date" type="date" className="mt-2" {...form.register('due_date')} />
            </div>

            {/* Amounts */}
            <div>
              <Label htmlFor="dpp">DPP</Label>
              <Input id="dpp" type="number" inputMode="numeric" className="mt-2" {...form.register('dpp', { valueAsNumber: true })} />
            </div>

            <div>
              <Label htmlFor="ppn">PPN</Label>
              <Input id="ppn" type="number" inputMode="numeric" className="mt-2" {...form.register('ppn', { valueAsNumber: true })} />
            </div>

            <div>
              <Label htmlFor="gross">Gross Amount *</Label>
              <Input id="gross" type="number" inputMode="numeric" className="mt-2" {...form.register('gross', { valueAsNumber: true })} />
              <p className="text-xs text-muted-foreground mt-1">
                Server akan memastikan konsistensi (mis. DPP+PPN = Gross untuk sumber PT).
              </p>
            </div>

            {/* Notes */}
            <div className="md:col-span-2">
              <Label htmlFor="note">Notes</Label>
              <Input id="note" className="mt-2" {...form.register('note')} />
            </div>

            {/* Actions */}
            <div className="md:col-span-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit">Save Payable</Button>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}

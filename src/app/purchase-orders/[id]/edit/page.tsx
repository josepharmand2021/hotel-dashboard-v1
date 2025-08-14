'use client';

import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Breadcrumbs from '@/components/layout/Breadcrumbs';

import { listVendors } from '@/features/vendors/api';
import { getPurchaseOrder, updatePurchaseOrder } from '@/features/purchase-orders/api';

/* =========================
   Helpers
========================= */
function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-xs text-red-600 mt-1">{msg}</p>;
}
const asNum = (v: unknown) => {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
};
type VendorRow = { id: number; name: string; payment_type?: 'CBD'|'COD'|'NET'; term_days?: number };

/* compute due date seperti fungsi SQL compute_due_date */
function computeDueDate(po_date?: string|null, delivery_date?: string|null, term_code?: string|null, term_days?: number|null) {
  const p = po_date ? new Date(po_date) : null;
  const d = delivery_date ? new Date(delivery_date) : null;
  const code = (term_code || 'NET').toUpperCase();
  const days = term_days ?? 0;
  const base = (code === 'COD') ? (d || p) : p; // COD pakai delivery/PO, CBD/NET pakai PO
  if (!base) return '';
  const dt = new Date(base);
  if (code === 'NET') dt.setDate(dt.getDate() + days);
  return dt.toISOString().slice(0,10);
}

/* =========================
   Schema
========================= */
const itemSchema = z.object({
  id: z.number().optional(),
  description: z.string().min(1, 'Required'),
  qty: z.coerce.number().positive('Qty must be > 0'),
  unit: z.string().optional().or(z.literal('')),
  unit_price: z.coerce.number().min(0, '>= 0'),
});

const schema = z.object({
  po_number: z.string().min(1, 'Required'),
  vendor_id: z.coerce.number().min(1, 'Vendor is required'),
  po_date: z.string().optional().or(z.literal('')),
  delivery_date: z.string().optional().or(z.literal('')),
  is_tax_included: z.coerce.boolean(),
  tax_percent: z.coerce.number().default(11),
  note: z.string().optional().or(z.literal('')),

  term_code: z.enum(['CBD','COD','NET']).optional().or(z.literal('')),
  term_days: z.coerce.number().min(0).optional(),
  auto_due: z.coerce.boolean().default(true),
  due_date_override: z.string().optional().or(z.literal('')),

  items: z.array(itemSchema).min(1, 'Add at least one item'),
});
type FormVals = z.infer<typeof schema>;

// tipe longgar agar boleh akses vendor_id bila API mengembalikan kolom itu
type PurchaseOrderForEdit = Awaited<ReturnType<typeof getPurchaseOrder>> & {
  vendor_id?: number | null;
};

export default function EditPOPage() {
  const router = useRouter();
  const { id: idParam } = useParams<{ id: string }>();
  const id = Number(idParam);

  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [loading, setLoading] = useState(true);

  /* form */
  const form = useForm<FormVals>({
    resolver: zodResolver(schema),
    defaultValues: {
      po_number: '',
      vendor_id: undefined as unknown as number,
      po_date: '',
      delivery_date: '',
      is_tax_included: true,
      tax_percent: 11,
      note: '',

      term_code: '',
      term_days: undefined,
      auto_due: true,
      due_date_override: '',

      items: [{ description: '', qty: 1, unit: 'pcs', unit_price: 0 }],
    },
    mode: 'onChange',
  });
  const { fields, append, remove, replace } = useFieldArray({ control: form.control, name: 'items' });

  /* vendors */
  useEffect(() => {
    (async () => {
      try {
        const { rows } = await listVendors({ q: '', page: 1, pageSize: 200 });
        setVendors((rows as any[]).map(v => ({ id: v.id, name: v.name, payment_type: v.payment_type, term_days: v.term_days })));
      } catch (e: any) {
        toast.error(e.message || 'Failed load vendors');
      }
    })();
  }, []);

  /* load PO */
  useEffect(() => {
    if (!Number.isFinite(id)) return;
    (async () => {
      try {
        setLoading(true);

        const po = (await getPurchaseOrder(id)) as PurchaseOrderForEdit;

        const effectiveVendorCode = (po.term_code ?? po.vendor?.payment_type ?? 'NET') as 'CBD'|'COD'|'NET';
        const effectiveVendorDays = effectiveVendorCode === 'NET'
          ? Number(po.term_days ?? po.vendor?.term_days ?? 0)
          : 0;

        const autoDue = !po.due_date_override;

        const vendorId = (po.vendor?.id ?? po.vendor_id ?? undefined) as number | undefined;

        form.reset({
          po_number: po.po_number ?? '',
          vendor_id: (vendorId ?? (undefined as unknown as number)),
          po_date: po.po_date ?? '',
          delivery_date: po.delivery_date ?? '',
          is_tax_included: !!po.is_tax_included,
          tax_percent: Number(po.tax_percent ?? 11),
          note: po.note ?? '',

          term_code: effectiveVendorCode,
          term_days: effectiveVendorCode === 'NET' ? effectiveVendorDays : undefined,
          auto_due: autoDue,
          due_date_override: po.due_date_override ?? '',

          items: (po.items ?? []).map((it: any) => ({
            id: it.id,
            description: it.description ?? '',
            qty: Number(it.qty ?? 0),
            unit: it.unit ?? '',
            unit_price: Number(it.unit_price ?? 0),
          })),
        });

        if (!po.items || po.items.length === 0) {
          replace([{ description: '', qty: 1, unit: 'pcs', unit_price: 0 }]);
        }
      } catch (e: any) {
        toast.error(e.message || 'Failed to load PO');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /* watch untuk totals & terms */
  const watchedItems = useWatch({ control: form.control, name: 'items' }) ?? [];
  const taxPct = useWatch({ control: form.control, name: 'tax_percent' }) ?? 0;
  const incl = useWatch({ control: form.control, name: 'is_tax_included' }) ?? true;

  const poDate = useWatch({ control: form.control, name: 'po_date' });
  const delivDate = useWatch({ control: form.control, name: 'delivery_date' });
  const termCode = (useWatch({ control: form.control, name: 'term_code' }) || 'NET').toUpperCase();
  const termDays = useWatch({ control: form.control, name: 'term_days' }) ?? 0;
  const autoDue = useWatch({ control: form.control, name: 'auto_due' });
  const dueOverride = useWatch({ control: form.control, name: 'due_date_override' });

  const subtotal = useMemo(
    () => watchedItems.reduce((sum: number, it: any) => sum + asNum(it?.qty) * asNum(it?.unit_price), 0),
    [watchedItems]
  );
  const total = incl ? subtotal : subtotal * (1 + asNum(taxPct) / 100);

  const dueFormula = computeDueDate(poDate, delivDate, termCode, termCode === 'NET' ? termDays : 0);
  const dueEffective = autoDue ? dueFormula : (dueOverride || '');

  async function onSubmit(values: FormVals) {
    try {
      await updatePurchaseOrder(id, {
        ...values,
        term_code: values.term_code ? (values.term_code as any) : null,
        term_days: values.term_code === 'NET' ? (values.term_days ?? 0) : null,
        due_date_override: values.auto_due ? null : (values.due_date_override || null),
      });
      toast.success('Purchase Order updated');
      router.push(`/purchase-orders/${id}`);
    } catch (e: any) {
      toast.error(e.message || 'Failed to update PO');
    }
  }

  if (loading) return <div>Loading…</div>;

  return (
    <div className="max-w-5xl space-y-4">
      <Breadcrumbs
        className="mb-2"
        items={[
          { label: 'Dashboard', href: '/dashboard/overview' },
          { label: 'Purchase Orders', href: '/purchase-orders' },
          { label: 'Edit', current: true },
        ]}
      />
      <h1 className="text-2xl font-semibold">Edit Purchase Order</h1>
      <p className="text-sm text-muted-foreground">Update PO information and items</p>

      <Card>
        <CardHeader><CardTitle>PO Information</CardTitle></CardHeader>
        <Separator />
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="grid gap-6 md:grid-cols-2 pb-6">
            <div>
              <Label htmlFor="po_number">PO Number *</Label>
              <Input id="po_number" {...form.register('po_number')} />
              <FieldError msg={form.formState.errors.po_number?.message} />
            </div>

            <div>
              <Label htmlFor="vendor_id">Vendor *</Label>
              <select
                id="vendor_id"
                className="mt-2 block w-full rounded-md border px-3 py-2 text-sm bg-background"
                {...form.register('vendor_id', { valueAsNumber: true })}
                defaultValue=""
              >
                <option value="" disabled>Choose vendor…</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
              <FieldError msg={form.formState.errors.vendor_id?.message as any} />
            </div>

            <div>
              <Label htmlFor="po_date">PO Date</Label>
              <Input id="po_date" type="date" {...form.register('po_date')} />
            </div>

            <div>
              <Label htmlFor="delivery_date">Delivery Date</Label>
              <Input id="delivery_date" type="date" {...form.register('delivery_date')} />
            </div>

            <div>
              <Label htmlFor="is_tax_included">Tax Included?</Label>
              <select
                id="is_tax_included"
                className="mt-2 block w-full rounded-md border px-3 py-2 text-sm bg-background"
                {...form.register('is_tax_included', { setValueAs: (v) => v === 'true' || v === true })}
                defaultValue="true"
              >
                <option value="true">Yes (prices include tax)</option>
                <option value="false">No (tax added on top)</option>
              </select>
            </div>

            <div>
              <Label htmlFor="tax_percent">Tax %</Label>
              <Input id="tax_percent" type="number" step="0.01"
                     {...form.register('tax_percent', { valueAsNumber: true })}/>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="note">Note</Label>
              <Input id="note" {...form.register('note')} />
            </div>

            {/* Payment Terms */}
            <div>
              <Label htmlFor="term_code">Payment Term</Label>
              <select
                id="term_code"
                className="mt-2 block w-full rounded-md border px-3 py-2 text-sm bg-background"
                {...form.register('term_code')}
                defaultValue=""
              >
                <option value="">Follow Vendor</option>
                <option value="CBD">CBD (Cash Before Delivery)</option>
                <option value="COD">COD (Cash On Delivery)</option>
                <option value="NET">NET</option>
              </select>
            </div>

            <div>
              <Label htmlFor="term_days">Term Days (NET)</Label>
              <Input
                id="term_days"
                type="number"
                min={0}
                {...form.register('term_days', { valueAsNumber: true })}
                disabled={termCode !== 'NET'}
              />
            </div>

            {/* Due date */}
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="col-span-1">
                <Label htmlFor="auto_due">Auto Due Date?</Label>
                <select
                  id="auto_due"
                  className="mt-2 block w-full rounded-md border px-3 py-2 text-sm bg-background"
                  {...form.register('auto_due', { setValueAs: (v)=> v === 'true' || v === true })}
                  defaultValue="true"
                >
                  <option value="true">Yes (use formula)</option>
                  <option value="false">No (manual)</option>
                </select>
              </div>
              <div className="col-span-1">
                <Label htmlFor="due_date_override">Manual Due Date</Label>
                <Input
                  id="due_date_override"
                  type="date"
                  {...form.register('due_date_override')}
                  disabled={autoDue}
                />
              </div>
              <div className="col-span-1">
                <Label>Due Date (Effective)</Label>
                <Input value={dueEffective || ''} readOnly className="bg-muted/50" />
              </div>
            </div>
          </CardContent>

          <Separator />

          <CardHeader><CardTitle>Items</CardTitle></CardHeader>
          <CardContent className="pb-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Description</TableHead>
                  <TableHead className="w-[10%] text-right">Qty</TableHead>
                  <TableHead className="w-[15%]">Unit</TableHead>
                  <TableHead className="w-[15%] text-right">Unit Price</TableHead>
                  <TableHead className="w-[15%] text-right">Amount</TableHead>
                  <TableHead className="w-[5%]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field, idx) => {
                  const row = watchedItems[idx] ?? {};
                  const amount = asNum(row.qty) * asNum(row.unit_price);
                  return (
                    <TableRow key={field.id}>
                      <TableCell>
                        <Input placeholder="Item description" {...form.register(`items.${idx}.description` as const)} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input type="number" min={0} step="1"
                               {...form.register(`items.${idx}.qty` as const, { valueAsNumber: true })}/>
                      </TableCell>
                      <TableCell>
                        <Input placeholder="pcs" {...form.register(`items.${idx}.unit` as const)} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input type="number" min={0} step="0.01"
                               {...form.register(`items.${idx}.unit_price` as const, { valueAsNumber: true })}/>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {amount.toLocaleString('id-ID')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button type="button" variant="ghost" onClick={() => remove(idx)}>Remove</Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <div className="mt-3">
              <Button type="button" variant="outline"
                      onClick={() => append({ description: '', qty: 1, unit: 'pcs', unit_price: 0 })}>
                + Add Item
              </Button>
            </div>

            <div className="mt-6 flex flex-col items-end gap-1 text-sm">
              <div className="w-full sm:w-80 flex justify-between"><span>Subtotal</span><span>{subtotal.toLocaleString('id-ID')}</span></div>
              <div className="w-full sm:w-80 flex justify-between text-muted-foreground">
                <span>Tax {asNum(taxPct)}% {incl ? '(included)' : ''}</span>
                <span>{incl ? '—' : (subtotal * (asNum(taxPct) / 100)).toLocaleString('id-ID')}</span>
              </div>
              <div className="w-full sm:w-80 flex justify-between font-semibold text-base">
                <span>Total</span><span>{(incl ? subtotal : subtotal * (1 + asNum(taxPct)/100)).toLocaleString('id-ID')}</span>
              </div>
            </div>
          </CardContent>

          <Separator />
          <CardFooter className="justify-end gap-2 mt-4 pb-6">
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Saving…' : 'Save Changes'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

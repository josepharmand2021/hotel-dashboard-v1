'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import {
  Form as UIForm,
  FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription,
} from '@/components/ui/form';

import { getVendor, updateVendor } from '@/features/vendors/api';

const schema = z.object({
  name: z.string().min(2, 'Minimal 2 karakter'),
  email: z.string().email('Format email tidak valid').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  npwp: z.string().optional().or(z.literal('')),
  payment_type: z.enum(['CBD', 'COD', 'NET']),
  term_days: z.coerce.number().int().min(0).nullable().optional(),
  payment_term_label: z.string().optional().or(z.literal('')),
});
type FormVals = z.infer<typeof schema>;

export default function EditVendorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const form = useForm<FormVals>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '', email: '', phone: '', address: '',
      npwp: '', payment_type: 'CBD', term_days: 0, payment_term_label: '',
    },
    mode: 'onChange',
  });

  const payType = form.watch('payment_type');

  useEffect(() => {
    (async () => {
      const v = await getVendor(Number(id));
      form.reset({
        name: v.name ?? '',
        email: v.email ?? '',
        phone: v.phone ?? '',
        address: v.address ?? '',
        npwp: v.npwp ?? '',
        payment_type: (v.payment_type as any) || 'CBD',
        term_days: (v.term_days ?? 0) as any,
        payment_term_label: v.payment_term_label ?? '',
      });
    })();
  }, [id]); // eslint-disable-line

  async function onSubmit(values: FormVals) {
    try {
      await updateVendor(Number(id), {
        ...values,
        // jaga-jaga: bila bukan NET, kosongkan term_days
        term_days: values.payment_type === 'NET' ? Number(values.term_days || 0) : 0,
      });
      toast.success('Vendor updated');
      router.push(`/vendors/${id}`);
    } catch (e: any) {
      toast.error(e.message || 'Failed to update vendor');
    }
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Edit Vendor</h1>
        <p className="text-sm text-muted-foreground">Update supplier profile</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Vendor Information</CardTitle></CardHeader>
        <Separator />

        <UIForm {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="grid gap-6 md:grid-cols-2 pb-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl><Input {...field} placeholder="0812-3456-7890" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input {...field} placeholder="vendor@email.com" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Address</FormLabel>
                    <FormControl><Textarea rows={3} {...field} placeholder="Alamat lengkap" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="npwp"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>NPWP</FormLabel>
                    <FormControl><Input {...field} placeholder="00.000.000.0-000.000" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Payment term */}
              <FormField
                control={form.control}
                name="payment_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Type</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={(v: any) => field.onChange(v)}
                      >
                        <SelectTrigger><SelectValue placeholder="Pilih tipe" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CBD">CBD</SelectItem>
                          <SelectItem value="COD">COD</SelectItem>
                          <SelectItem value="NET">NET</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormDescription>Pilih cara bayar default vendor.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="term_days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Term (days)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        placeholder={payType === 'NET' ? 'contoh: 30' : '—'}
                        disabled={payType !== 'NET'}
                        value={field.value ?? 0}
                        onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      {payType === 'NET'
                        ? `Label otomatis: ${(() => {
                            const d = Number(field.value ?? 0);
                            return d > 0 ? `NET ${d} days` : 'NET';
                          })()}`
                        : 'Tidak berlaku untuk CBD/COD'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="payment_term_label"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Custom Term Label</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Opsional (override label otomatis)" />
                    </FormControl>
                    <FormDescription>
                      Kosongkan untuk pakai label otomatis (mis. <b>NET 30 days</b>).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>

            <Separator />
            <CardFooter className="justify-end gap-2 mt-4 pb-6">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving…' : 'Save Changes'}
              </Button>
            </CardFooter>
          </form>
        </UIForm>
      </Card>
    </div>
  );
}

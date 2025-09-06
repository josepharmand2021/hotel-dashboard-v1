'use client';

import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form as UIForm,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

const schema = z.object({
  name: z.string().min(2, 'Minimal 2 karakter'),
  email: z
    .string()
    .email('Format email tidak valid')
    .optional()
    .or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  npwp: z.string().optional().or(z.literal('')),

  payment_type: z.enum(['CBD', 'COD', 'NET']).default('CBD'),
  term_days: z
    .union([z.coerce.number().int().min(0, 'Harus ≥ 0'), z.null()])
    .optional(),
}).refine(
  (v) => (v.payment_type === 'NET' ? Number(v.term_days ?? 0) >= 0 : true),
  { path: ['term_days'], message: 'Isi term days untuk NET (boleh 0).' }
);

type FormVals = z.infer<typeof schema>;

export default function NewVendorPage() {
  const router = useRouter();

  const form = useForm<FormVals>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
      npwp: '',
      payment_type: 'CBD',
      term_days: 0,
    },
    mode: 'onChange',
  });

  const payType = form.watch('payment_type');

  function paymentLabel(type: 'CBD' | 'COD' | 'NET', term?: number | null) {
    if (type === 'NET') {
      const d = Number(term ?? 0);
      return d > 0 ? `NET ${d} days` : 'NET';
    }
    return type;
  }

  async function onSubmit(values: FormVals) {
    try {
      const { createVendor } = await import('@/features/vendors/api');

      const payload = {
        name: values.name,
        email: values.email || null,
        phone: values.phone || null,
        address: values.address || null,
        npwp: values.npwp || null,
        payment_type: values.payment_type,
        term_days: values.payment_type === 'NET' ? Number(values.term_days ?? 0) : null,
        payment_term_label: paymentLabel(values.payment_type, Number(values.term_days ?? 0)),
      } as const;

      await createVendor(payload as any);
      toast.success('Vendor created');
      router.push('/vendors');
    } catch (e: any) {
      toast.error(e.message || 'Failed to create vendor');
    }
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">New Vendor</h1>
          <p className="text-sm text-muted-foreground">Create a supplier profile</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vendor Information</CardTitle>
        </CardHeader>
        <Separator />
        <UIForm {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="grid gap-6 md:grid-cols-2 pb-6">
              {/* Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl><Input placeholder="PT Contoh Abadi" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Phone */}
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl><Input placeholder="08xx xxxx xxxx" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input placeholder="vendor@email.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* NPWP */}
              <FormField
                control={form.control}
                name="npwp"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>NPWP</FormLabel>
                    <FormControl><Input placeholder="xx.xxx.xxx.x-xxx.xxx" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Address */}
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Address</FormLabel>
                    <FormControl><Textarea placeholder="Alamat lengkap" rows={3} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Payment Type */}
              <FormField
                control={form.control}
                name="payment_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Type</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger><SelectValue placeholder="Pilih tipe" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CBD">CBD (Cash Before Delivery)</SelectItem>
                          <SelectItem value="COD">COD (Cash On Delivery)</SelectItem>
                          <SelectItem value="NET">NET (Kredit)</SelectItem>
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
          disabled={payType !== 'NET'}
          placeholder={payType === 'NET' ? 'contoh: 30' : '—'}
          // ⬇️ Perbaikan penting:
          value={field.value ?? ''}                              // null -> '' (string kosong)
          onChange={(e) => {
            const v = e.target.value.trim();
            field.onChange(v === '' ? null : Number(v));         // string -> number | null
          }}
          onBlur={field.onBlur}
          name={field.name}
          ref={field.ref}
        />
      </FormControl>

      <FormDescription>
        {payType === 'NET'
          ? (() => {
              const d = Number(field.value ?? 0);
              return d > 0 ? `Label otomatis: NET ${d} days` : 'Label otomatis: NET';
            })()
          : 'Tidak berlaku untuk CBD/COD'}
      </FormDescription>
      <FormMessage />
    </FormItem>
  )}
/>

            </CardContent>

            <Separator />
            <CardFooter className="justify-end gap-2 pb-6 mt-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving…' : 'Save'}
              </Button>
            </CardFooter>
          </form>
        </UIForm>
      </Card>
    </div>
  );
}

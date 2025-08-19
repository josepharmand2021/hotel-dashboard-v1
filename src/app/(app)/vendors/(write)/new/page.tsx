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

const schema = z.object({
  name: z.string().min(2, 'Minimal 2 karakter'),
  email: z.string().email('Format email tidak valid').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
});
type FormVals = z.infer<typeof schema>;

export default function NewVendorPage() {
  const router = useRouter();
  const form = useForm<FormVals>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', phone: '', address: '' },
    mode: 'onChange',
  });

  async function onSubmit(values: FormVals) {
    try {
      const { createVendor } = await import('@/features/vendors/api');
      await createVendor(values);
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

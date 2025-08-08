'use client';

import { z } from 'zod';
import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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

import { getVendor, updateVendor } from '@/features/vendors/api';

const schema = z.object({
  name: z.string().min(2, 'Minimal 2 karakter'),
  email: z.string().email('Format email tidak valid').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
});
type FormVals = z.infer<typeof schema>;

export default function EditVendorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const form = useForm<FormVals>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', phone: '', address: '' },
    mode: 'onChange',
  });

  useEffect(() => {
    (async () => {
      const v = await getVendor(Number(id));
      form.reset({
        name: v.name ?? '',
        email: v.email ?? '',
        phone: v.phone ?? '',
        address: v.address ?? '',
      });
    })();
  }, [id]);

  async function onSubmit(values: FormVals) {
    try {
      await updateVendor(Number(id), values);
      toast.success('Vendor updated');
      router.push(`/vendors/${id}`);
    } catch (e: any) {
      toast.error(e.message || 'Failed to update vendor');
    }
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Edit Vendor</h1>
          <p className="text-sm text-muted-foreground">Update supplier profile</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vendor Information</CardTitle>
        </CardHeader>
        <Separator />

        <UIForm {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            {/* padding bawah agar tidak nabrak separator */}
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
                    <FormControl><Input {...field} /></FormControl>
                    <FormDescription>Contoh: 0812-3456-7890</FormDescription>
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
                    <FormControl><Input {...field} /></FormControl>
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
                    <FormControl><Textarea rows={3} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>

            <Separator />

            {/* kasih jarak dari garis di atas + padding bawah */}
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

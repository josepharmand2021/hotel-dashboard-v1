import { z } from 'zod';

export const vendorSchema = z.object({
  name: z.string().min(2, 'Minimal 2 karakter'),
  email: z.string().email('Email tidak valid').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  npwp: z.string().optional().or(z.literal('')),
});
export type VendorForm = z.infer<typeof vendorSchema>;
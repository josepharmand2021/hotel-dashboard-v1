import { z } from 'zod';

export const vendorSchema = z.object({
  name: z.string().min(2, 'Minimal 2 karakter'),
  email: z.string().email('Email tidak valid').optional().or(z.literal('')),
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

export type VendorForm = z.infer<typeof vendorSchema>;

'use server';

import { supabaseServer } from '@/lib/supabase/server';

export type VendorRow = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  npwp: string | null;
  payment_type: 'CBD' | 'COD' | 'NET';
  term_days: number | null;
  payment_term_label: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export async function getVendorServer(id: number): Promise<VendorRow> {
  const sb = await supabaseServer();
  const { data, error } = await sb
    .from('vendors')
    .select(
      'id,name,email,phone,address,npwp,payment_type,term_days,payment_term_label,created_at,updated_at'
    )
    .eq('id', id)
    .single(); // kalau tidak ada row -> error

  if (error) throw error;
  return data as VendorRow;
}

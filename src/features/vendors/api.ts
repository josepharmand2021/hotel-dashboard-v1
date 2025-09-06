// src/features/vendors/api.ts
'use client';

import { supabase } from '@/lib/supabase/client';
import type { VendorForm } from './forms'; // atau ganti path sesuai punyamu


export type VendorRow = {
  id: number; name: string;
  email: string|null; phone: string|null; address: string|null;
  npwp: string|null;
  payment_type: 'CBD'|'COD'|'NET';
  term_days: number|null;
  payment_term_label: string|null;
  created_at: string|null; updated_at?: string|null;
};

export async function getVendor(id: number): Promise<VendorRow> {
  const { data, error } = await supabase
    .from('vendors')
    .select('id,name,email,phone,address,npwp,payment_type,term_days,payment_term_label,created_at,updated_at')
    .eq('id', id)
    .single();               // ⬅️ bukan maybeSingle
  if (error) throw error;    // biar 404/permission error bubbling
  return data as VendorRow;
}


function asNum(n: any) {
  const v = typeof n === 'string' ? parseFloat(n) : Number(n);
  return Number.isFinite(v) ? v : 0;
}

/** LIST (dengan pencarian & pagination) */
export async function listVendors(params?: {
  q?: string;
  page?: number;
  pageSize?: number;
}) {
  const q = params?.q?.trim() ?? '';
  const page = Math.max(1, params?.page ?? 1);
  const pageSize = Math.max(1, Math.min(100, params?.pageSize ?? 10));
  const from = (page - 1) * pageSize;
  const to = page * pageSize - 1;

  let query = supabase
    .from('vendors')
    .select(
      'id,name,email,phone,address,npwp,payment_type,term_days,payment_term_label,created_at,updated_at',
      { count: 'exact' }
    )
    .order('name', { ascending: true })
    .range(from, to);

  if (q) {
    // cari di name / email / phone
    query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  const rows: VendorRow[] = (data || []).map((r: any) => ({
    id: Number(r.id),
    name: String(r.name),
    email: r.email ?? null,
    phone: r.phone ?? null,
    address: r.address ?? null,
    npwp: r.npwp ?? null,
    payment_type: (r.payment_type as any) ?? 'CBD',
    term_days: r.term_days ?? null,
    payment_term_label: r.payment_term_label ?? null,
    created_at: r.created_at ?? null,
    updated_at: r.updated_at ?? null,
  }));

  return { rows, total: count ?? 0, page, pageSize };
}


/** CREATE */
export async function createVendor(payload: VendorForm & {
  // opsional—kalau ada form lanjutan soal term
  payment_type?: 'CBD' | 'COD' | 'NET';
  term_days?: number | null;
  payment_term_label?: string | null;
}) {
  const body: any = {
    name: payload.name.trim(),
    email: payload.email?.trim() || null,
    phone: payload.phone?.trim() || null,
    address: payload.address?.trim() || null,
    npwp: payload.npwp?.trim() || null,
  };

  // kolom term (opsional; tabel kamu udah ada default)
  if (payload.payment_type) body.payment_type = payload.payment_type;
  if (payload.term_days != null) body.term_days = asNum(payload.term_days);
  if (payload.payment_term_label != null) body.payment_term_label = payload.payment_term_label || null;

  const { data, error } = await supabase
    .from('vendors')
    .insert(body)
    .select('id')
    .single();

  if (error) throw error;
  return { id: Number(data.id) };
}

/** UPDATE */
export async function updateVendor(id: number, payload: Partial<VendorForm> & {
  payment_type?: 'CBD' | 'COD' | 'NET';
  term_days?: number | null;
  payment_term_label?: string | null;
}) {
  const patch: any = {};
  if (payload.name != null) patch.name = payload.name.trim();
  if (payload.email !== undefined) patch.email = payload.email?.trim() || null;
  if (payload.phone !== undefined) patch.phone = payload.phone?.trim() || null;
  if (payload.address !== undefined) patch.address = payload.address?.trim() || null;
  if (payload.npwp !== undefined) patch.npwp = payload.npwp?.trim() || null;

  if (payload.payment_type) patch.payment_type = payload.payment_type;
  if (payload.term_days !== undefined) patch.term_days = payload.term_days == null ? null : asNum(payload.term_days);
  if (payload.payment_term_label !== undefined)
    patch.payment_term_label = payload.payment_term_label || null;

  const { error } = await supabase.from('vendors').update(patch).eq('id', id);
  if (error) throw error;
}

/** DELETE */
export async function deleteVendor(id: number) {
  const { error } = await supabase.from('vendors').delete().eq('id', id);
  if (error) throw error;
}

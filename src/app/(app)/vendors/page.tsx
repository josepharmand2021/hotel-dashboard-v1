// src/app/(app)/vendors/page.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';

import Breadcrumbs from '@/components/layout/Breadcrumbs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

import { RoleGate } from '@/lib/supabase/acl';
import { listVendors, deleteVendor } from '@/features/vendors/api';

type Row = {
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
};

const fmtDate = (s?: string | null) => (s && /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : '—');

function termLabelOf(r: Row) {
  if (r.payment_term_label?.trim()) return r.payment_term_label;
  if (r.payment_type === 'NET') {
    const d = Number(r.term_days || 0);
    return d > 0 ? `NET ${d} days` : 'NET';
  }
  return r.payment_type; // CBD/COD
}

export default function VendorsListPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const pageSize = 10;

  const pages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total]);

  async function load() {
    setLoading(true);
    try {
      const { rows, total } = await listVendors({ q, page, pageSize });
      setRows(rows as Row[]);
      setTotal(total);
    } catch (e: any) {
      toast.error(e.message || 'Failed load vendors');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, page]);

  const onDelete = async (id: number) => {
    try {
      await deleteVendor(id);
      toast.success('Vendor deleted');
      // refresh halaman / mundurkan page bila list jadi kosong
      if (rows.length === 1 && page > 1) setPage((p) => p - 1);
      else load();
    } catch (e: any) {
      toast.error(e.message || 'Delete failed');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="mb-3">
            <Breadcrumbs
              items={[
                { label: 'Dashboard', href: '/dashboard/overview' },
                { label: 'Vendors', current: true },
              ]}
            />
          </div>
          <h1 className="text-2xl font-semibold">Vendors</h1>
          <p className="text-sm text-muted-foreground">Approved suppliers list for procurement</p>
        </div>

        <RoleGate admin>
          <Button asChild>
            <Link href="/vendors/new">New Vendor</Link>
          </Button>
        </RoleGate>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <Input
          placeholder="Search name / email / phone / NPWP…"
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
        />
      </div>

      {/* Table */}
      <div className="border rounded-xl overflow-x-auto">
        <div className="min-w-[980px] divide-y">
          {/* Header row */}
          <div className="p-3 grid grid-cols-[2.1fr_1.2fr_1.2fr_1fr_1.6fr_140px] gap-3 font-medium text-sm bg-muted/50">
            <div>Vendor</div>
            <div>NPWP</div>
            <div>Payment Term</div>
            <div>Created</div>
            <div>Address</div>
            <div className="text-right">Actions</div>
          </div>

          {/* Rows */}
          {rows.map((v) => (
            <div
              key={v.id}
              className="p-3 grid grid-cols-[2.1fr_1.2fr_1.2fr_1fr_1.6fr_140px] gap-3 items-center hover:bg-muted/30 transition-colors"
            >
              {/* Vendor + contact */}
              <div>
                <div className="font-medium">{v.name}</div>
                <div className="text-xs text-muted-foreground">
                  {(v.email || '—')} • {(v.phone || '—')}
                </div>
              </div>

              {/* NPWP */}
              <div className="text-sm">{v.npwp || '—'}</div>

              {/* Payment Term */}
              <div>
                <Badge variant="outline">{termLabelOf(v)}</Badge>
              </div>

              {/* Created */}
              <div className="text-sm text-muted-foreground">{fmtDate(v.created_at)}</div>

              {/* Address */}
              <div className="truncate text-sm">{v.address || '—'}</div>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <Link className="underline text-sm" href={`/vendors/${v.id}`}>
                  Detail
                </Link>

                <RoleGate admin>
                  <Link className="underline text-sm" href={`/vendors/${v.id}/edit`}>
                    Edit
                  </Link>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="text-sm text-red-600 underline">Delete</button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Vendor</AlertDialogTitle>
                        <AlertDialogDescription>
                          Hapus <b>{v.name}</b>? Tindakan ini tidak bisa dibatalkan.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDelete(v.id)}
                          className="bg-red-600 text-white hover:bg-red-700"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </RoleGate>
              </div>
            </div>
          ))}

          {/* Empty / Loading */}
          {loading && (
            <div className="p-6 text-sm text-muted-foreground">Loading…</div>
          )}
          {!loading && rows.length === 0 && (
            <div className="p-6 text-sm text-muted-foreground">No vendors.</div>
          )}
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Prev
        </Button>
        <div className="text-sm">Page {page} / {pages}</div>
        <Button variant="outline" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}

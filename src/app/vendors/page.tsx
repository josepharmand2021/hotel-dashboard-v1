'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { listVendors, deleteVendor } from '@/features/vendors/api';
import { toast } from 'sonner';
import Breadcrumbs from '@/components/layout/Breadcrumbs';

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

type Row = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  created_at: string | null;
};

export default function VendorsListPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  const load = async () => {
    try {
      const { rows, total } = await listVendors({ q, page, pageSize });
      setRows(rows as Row[]);
      setTotal(total);
    } catch (e: any) {
      toast.error(e.message || 'Failed load vendors');
    }
  };

  useEffect(() => {
    load();
  }, [q, page]);

  const pages = Math.max(1, Math.ceil(total / pageSize));

  const handleDelete = async (id: number) => {
    try {
      await deleteVendor(id);
      toast.success('Vendor deleted');
      load();
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
          <p className="text-sm text-muted-foreground">
            Approved suppliers list for procurement
          </p>
        </div>
        <Button asChild>
          <Link href="/vendors/new">New Vendor</Link>
        </Button>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <Input
          placeholder="Search vendor name…"
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
        />
      </div>

      {/* List */}
      <div className="border rounded-xl divide-y">
        {rows.map((v) => (
          <div key={v.id} className="p-3 grid grid-cols-12 gap-2 items-center">
            <div className="col-span-6">
              <div className="font-medium">{v.name}</div>
              <div className="text-xs text-muted-foreground">
                {v.email || '—'} • {v.phone || '—'}
              </div>
            </div>
            <div className="col-span-4 truncate">{v.address || '—'}</div>
            <div className="col-span-2 flex justify-end gap-3">
              <Link className="underline text-sm" href={`/vendors/${v.id}`}>
                Detail
              </Link>
              <Link className="underline text-sm" href={`/vendors/${v.id}/edit`}>
                Edit
              </Link>

              {/* AlertDialog Delete */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="text-sm text-red-600 underline">Delete</button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Vendor</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete <strong>{v.name}</strong>? 
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDelete(v.id)}
                      className="bg-red-600 text-white hover:bg-red-700"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <div className="p-6 text-sm text-muted-foreground">No vendors.</div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
        >
          Prev
        </Button>
        <div className="text-sm">
          Page {page} / {pages}
        </div>
        <Button
          variant="outline"
          disabled={page >= pages}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

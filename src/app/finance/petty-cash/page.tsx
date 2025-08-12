'use client';

import { useEffect, useState } from 'react';
import { getBoxesSummary, createCashBox, type BoxSummary } from '@/features/petty/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const fmt = new Intl.NumberFormat('id-ID');

export default function PettyCashListPage() {
  const [rows, setRows] = useState<BoxSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false); // NEW: state untuk tombol Create
  const [newName, setNewName] = useState('');

  async function load() {
    setLoading(true);
    try {
      const data = await getBoxesSummary();
      setRows(data);
    } catch (e: any) {
      toast.error(e.message || 'Gagal memuat');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function onCreate() {
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    try {
      await createCashBox(name);
      setNewName('');
      toast.success('Cash box dibuat');
      await load();
    } catch (e: any) {
      toast.error(e.message || 'Gagal membuat');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-semibold">Kas Kecil</h2>
        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nama cash box baru"
            className="w-60"
          />
          <Button onClick={onCreate} disabled={!newName.trim() || saving}>
            {saving ? 'Menyimpan…' : 'Create'}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Memuat…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {rows.map((r) => (
            <Card key={r.id} className="border">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{r.name}</span>
                  <span className={`text-lg font-semibold ${r.balance < 0 ? 'text-red-600' : ''}`}>
                    Rp {fmt.format(r.balance || 0)}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-1">
                <div>In: Rp {fmt.format(r.in_amount || 0)}</div>
                <div>Out: Rp {fmt.format(r.out_amount || 0)}</div>
                <div>Spent: Rp {fmt.format(r.spent_amount || 0)}</div>
                <div>Last: {r.last_activity ?? '—'}</div>
                <div className="pt-3">
                  <Button asChild size="sm">
                    <Link href={`/finance/petty-cash/${r.id}`}>Open</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {rows.length === 0 && (
            <div className="text-muted-foreground">Belum ada cash box.</div>
          )}
        </div>
      )}
    </div>
  );
}

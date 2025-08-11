'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { createPlan } from '@/features/capital-injections/api';

export default function NewPlanPage() {
  const router = useRouter();
  const [period, setPeriod] = useState(''); // e.g. 2025-09
  const [target, setTarget] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{4}-\d{2}$/.test(period)) return toast.error('Format period YYYY-MM');
    const amt = Number(target);
    if (!Number.isFinite(amt) || amt <= 0) return toast.error('Target harus > 0');
    setSaving(true);
    try {
      const { id } = await createPlan({ period, target_total: Math.round(amt), note });
      toast.success('Plan dibuat');
      router.push(`/finance/capital-injections/${id}`);
    } catch (e: any) {
      toast.error(e.message || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-6">
      <Card>
        <CardHeader><CardTitle>New Capital Injection Plan</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Period (YYYY-MM)</Label>
            <Input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="2025-09" />
          </div>
          <div className="space-y-2">
            <Label>Target Total (IDR)</Label>
            <Input inputMode="numeric" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="4000000000" />
          </div>
          <div className="space-y-2">
            <Label>Note</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Keterangan (opsional)" />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => history.back()}>Batal</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan'}</Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
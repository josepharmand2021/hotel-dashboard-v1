'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { listMonthGrid } from '@/features/rab/api';
import type { RabMonthGridRow } from '@/features/rab/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { toast } from 'sonner';

const fmtID3 = new Intl.NumberFormat('id-ID');

export default function RabMonthDetailPage(){
  const params = useParams();
  const month = String(params?.month);
  const [rows, setRows] = useState<RabMonthGridRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    (async()=>{
      setLoading(true);
      try{ setRows(await listMonthGrid(month)); }
      catch(e:any){ toast.error(e.message||'Gagal memuat'); }
      finally{ setLoading(false); }
    })();
  },[month]);

  if (loading) return <div>Memuat…</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>RAB — {month}</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shareholder</TableHead>
                  <TableHead className="text-right">Ownership %</TableHead>
                  <TableHead className="text-right">Allocated ({month})</TableHead>
                  <TableHead className="text-right">Allocated Cum.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(r => (
                  <TableRow key={r.shareholder_id}>
                    <TableCell className="font-medium">{r.shareholder_name}</TableCell>
                    <TableCell className="text-right">{(r.ownership_percent||0).toFixed(2)}%</TableCell>
                    <TableCell className="text-right">Rp {fmtID3.format(r.allocated_this_month)}</TableCell>
                    <TableCell className="text-right">Rp {fmtID3.format(r.allocated_cumulative)}</TableCell>
                  </TableRow>
                ))}
                {rows.length===0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-10">Belum ada data shareholder aktif / alokasi</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

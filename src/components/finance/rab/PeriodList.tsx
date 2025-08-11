// 'use client';
// import { useEffect, useState } from 'react';
// import Link from 'next/link';
// import { listRabPeriods } from '@/features/rab/api';
// import type { RabPeriodSummary } from '@/features/rab/types';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
// import { Button } from '@/components/ui/button';
// import { Badge } from '@/components/ui/badge';
// import { toast } from 'sonner';

// const fmtID = new Intl.NumberFormat('id-ID');

// export default function PeriodList() {
//   const [rows, setRows] = useState<RabPeriodSummary[]>([]);
//   const [loading, setLoading] = useState(false);

//   useEffect(() => {
//     (async () => {
//       setLoading(true);
//       try { setRows(await listRabPeriods()); }
//       catch (e:any) { toast.error(e.message||'Gagal memuat'); }
//       finally { setLoading(false); }
//     })();
//   }, []);

//   return (
//     <div className="space-y-4">
//       <div className="flex items-center justify-between">
//         <h2 className="text-xl font-semibold">RAB Allocations</h2>
//         <Button asChild><Link href="/finance/rab/new">New Period</Link></Button>
//       </div>
//       <Card>
//         <CardHeader><CardTitle>Periode</CardTitle></CardHeader>
//         <CardContent>
//           <div className="overflow-x-auto">
//             <Table>
//               <TableHeader>
//                 <TableRow>
//                   <TableHead>Period</TableHead>
//                   <TableHead className="text-right">Total Allocated</TableHead>
//                   <TableHead className="text-right">Spent-to-date</TableHead>
//                   <TableHead>Status</TableHead>
//                   <TableHead className="w-[80px]"></TableHead>
//                 </TableRow>
//               </TableHeader>
//               <TableBody>
//                 {rows.map(r => (
//                   <TableRow key={r.id}>
//                     <TableCell>{r.period_month.slice(0,7)}</TableCell>
//                     <TableCell className="text-right">Rp {fmtID.format(r.total_allocated)}</TableCell>
//                     <TableCell className="text-right">Rp {fmtID.format(r.total_spent_to_date)}</TableCell>
//                     <TableCell><Badge variant={r.status==='active'? 'default': r.status==='closed'? 'secondary':'outline'}>{r.status}</Badge></TableCell>
//                     <TableCell className="text-right">
//                       <Button variant="ghost" asChild><Link href={`/finance/rab/${r.id}`}>Open</Link></Button>
//                     </TableCell>
//                   </TableRow>
//                 ))}
//                 {rows.length===0 && (
//                   <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-10">{loading?'Memuat…':'Belum ada periode'}</TableCell></TableRow>
//                 )}
//               </TableBody>
//             </Table>
//           </div>
//         </CardContent>
//       </Card>
//     </div>
//   );
// }
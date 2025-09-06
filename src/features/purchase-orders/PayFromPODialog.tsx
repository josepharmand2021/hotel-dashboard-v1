// // src/features/purchase-orders/PayFromPODialog.tsx
// 'use client';

// import { useEffect, useMemo, useState } from 'react';
// import { toast } from 'sonner';

// import {
//   payPO,
//   getPOFinance,                         // ← fetch fresh total/paid/outstanding
//   listExpenseCategories,
//   listExpenseSubcategories,
//   filterSubcatsByCategory,
//   type ExpenseCategory,
//   type ExpenseSubcategory,
// } from '@/features/purchase-orders/api.client';

// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { Label } from '@/components/ui/label';
// import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// const fmtID = new Intl.NumberFormat('id-ID');
// type Source = 'PT' | 'RAB' | 'PETTY';

// type PODialogPO = {
//   id: number;
//   po_number: string;
//   vendor: { id: number; name?: string | null } | null;
//   paid?: number;
//   outstanding?: number;
//   total?: number;
// };

// export default function PayFromPODialog({
//   open,
//   onOpenChange,
//   po,
//   defaultAmount = 0,
//   onSuccess,
// }: {
//   open: boolean;
//   onOpenChange: (v: boolean) => void;
//   po: PODialogPO;
//   defaultAmount?: number;
//   onSuccess?: () => void;
// }) {
//   const vendorId = po.vendor?.id ?? 0;

//   // ===== Outstanding (1 source of truth) =====
//   // base from props (fallback), then refresh from server when dialog opens
//   const propRemaining = useMemo(() => {
//     if (typeof po.outstanding === 'number') return Math.max(po.outstanding, 0);
//     if (typeof po.total === 'number' && typeof po.paid === 'number') {
//       return Math.max(po.total - po.paid, 0);
//     }
//     return Math.max(defaultAmount, 0);
//   }, [po, defaultAmount]);

//   const [remaining, setRemaining] = useState<number>(propRemaining);

//   // ===== Form state =====
//   const [submitting, setSubmitting] = useState(false);
//   const [source, setSource] = useState<Source>('PT');
//   const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10));
//   const [amount, setAmount] = useState<number>(propRemaining);
//   const [invoiceNo, setInvoiceNo] = useState('');
//   const [note, setNote] = useState('');
//   const [shareholderId, setShareholderId] = useState<number | ''>('');
//   const [cashboxId, setCashboxId] = useState<number | ''>('');

//   // ===== Categories =====
//   const [cats, setCats] = useState<ExpenseCategory[]>([]);
//   const [allSubs, setAllSubs] = useState<ExpenseSubcategory[]>([]);
//   const [categoryId, setCategoryId] = useState<number | null>(null);
//   const subs = useMemo(() => filterSubcatsByCategory(allSubs, categoryId), [allSubs, categoryId]);
//   const [subcategoryId, setSubcategoryId] = useState<number | null>(null);

//   // Load lists when dialog opens (NO auto-pick)
//   useEffect(() => {
//     if (!open) return;
//     let cancelled = false;

//     (async () => {
//       try {
//         const [catRows, subRows] = await Promise.all([
//           listExpenseCategories(),
//           listExpenseSubcategories(),
//         ]);
//         if (cancelled) return;
//         setCats(catRows);
//         setAllSubs(subRows);
//         setCategoryId(null);
//         setSubcategoryId(null);
//       } catch (e: any) {
//         if (!cancelled) toast.error(e?.message || 'Failed to load categories');
//       }
//     })();

//     return () => {
//       cancelled = true;
//     };
//   }, [open]);

//   // Reset subcategory when category changes
//   useEffect(() => {
//     setSubcategoryId(null);
//   }, [categoryId]);

//   // When dialog opens, sync amount & fetch fresh outstanding
//   useEffect(() => {
//     if (!open) return;
//     let cancelled = false;

//     // reset to propRemaining first (snappy)
//     setRemaining(propRemaining);
//     setAmount(propRemaining);

//     // then refresh from server
//     (async () => {
//       try {
//         const fin = await getPOFinance(po.id);
//         if (cancelled) return;

//         // ✅ Perbaikan: fallback di operand, bukan di hasil pengurangan
//         const total = fin.total ?? 0;
//         const paid  = fin.paid  ?? 0;
//         const base  = total - paid;                  // selalu number
//         const fresh = Math.max(fin.outstanding ?? base, 0);

//         setRemaining(fresh);
//         setAmount(prev => Math.min(prev, fresh));    // clamp ke fresh remaining
//       } catch {
//         // keep the prop fallback if fetch fails
//       }
//     })();

//     return () => {
//       cancelled = true;
//     };
//   }, [open, po.id, propRemaining]);

//   const valid =
//     vendorId > 0 &&
//     amount > 0 &&
//     amount <= Math.max(remaining, 0) &&
//     !!expenseDate &&
//     !!categoryId &&
//     !!subcategoryId;

//   async function onSubmit() {
//     if (!valid) {
//       toast.error('Lengkapi data dan pastikan amount tidak melebihi outstanding.');
//       return;
//     }
//     try {
//       setSubmitting(true);
//       await payPO(po.id, {
//         source,
//         expense_date: expenseDate,
//         amount: Number(amount),
//         vendor_id: vendorId,
//         category_id: Number(categoryId),       // user-picked
//         subcategory_id: Number(subcategoryId), // filtered by category
//         status: 'posted',
//         shareholder_id: source === 'RAB' ? (shareholderId ? Number(shareholderId) : null) : null,
//         cashbox_id: source === 'PETTY' ? (cashboxId ? Number(cashboxId) : null) : null,
//         invoice_no: invoiceNo || null,
//         note: note || null,
//       });
//       toast.success('Payment recorded');
//       onOpenChange(false);
//       onSuccess?.();
//     } catch (e: any) {
//       toast.error(e?.message || 'Failed to record payment');
//     } finally {
//       setSubmitting(false);
//     }
//   }

//   return (
//     <Dialog open={open} onOpenChange={(v) => !submitting && onOpenChange(v)}>
//       <DialogContent className="sm:max-w-[560px]">
//         <DialogHeader>
//           <DialogTitle>
//             Pay Purchase Order <span className="font-semibold">{po.po_number}</span>
//           </DialogTitle>
//         </DialogHeader>

//         <div className="grid gap-4">
//           {/* Source */}
//           <div className="grid gap-2">
//             <Label>Source</Label>
//             <Select value={source} onValueChange={(v) => setSource(v as Source)} disabled={submitting}>
//               <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
//               <SelectContent>
//                 <SelectItem value="PT">PT (Company)</SelectItem>
//                 <SelectItem value="RAB">RAB (Shareholder)</SelectItem>
//                 <SelectItem value="PETTY">Petty Cash</SelectItem>
//               </SelectContent>
//             </Select>
//           </div>

//           {/* Date & Amount */}
//           <div className="grid grid-cols-2 gap-3">
//             <div className="grid gap-2">
//               <Label>Expense Date</Label>
//               <Input
//                 type="date"
//                 value={expenseDate}
//                 onChange={(e) => setExpenseDate(e.target.value)}
//                 disabled={submitting}
//               />
//             </div>
//             <div className="grid gap-2">
//               <Label>Amount</Label>
//               <div className="flex gap-2">
//                 <Input
//                   type="number"
//                   min={1}
//                   max={Math.max(remaining, 0)}
//                   value={amount}
//                   onChange={(e) => setAmount(Number(e.target.value || 0))}
//                   disabled={submitting}
//                 />
//                 <Button
//                   type="button"
//                   variant="outline"
//                   onClick={() => setAmount(Math.max(remaining, 0))}
//                   disabled={submitting}
//                 >
//                   Max
//                 </Button>
//               </div>
//               <div className="text-xs text-muted-foreground">
//                 Outstanding: <b>Rp {fmtID.format(Math.max(remaining, 0))}</b>
//               </div>
//             </div>
//           </div>

//           {/* Category & Subcategory */}
//           <div className="grid grid-cols-2 gap-3">
//             <div className="grid gap-2">
//               <Label>Category</Label>
//               <Select
//                 value={categoryId ? String(categoryId) : undefined}
//                 onValueChange={(v) => setCategoryId(Number(v))}
//                 disabled={submitting || cats.length === 0}
//               >
//                 <SelectTrigger>
//                   <SelectValue placeholder="Choose category" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   {cats.map((c) => (
//                     <SelectItem key={c.id} value={String(c.id)}>
//                       {c.name}
//                     </SelectItem>
//                   ))}
//                 </SelectContent>
//               </Select>
//             </div>

//             <div className="grid gap-2">
//               <Label>Subcategory</Label>
//               <Select
//                 value={subcategoryId ? String(subcategoryId) : undefined}
//                 onValueChange={(v) => setSubcategoryId(Number(v))}
//                 disabled={submitting || !categoryId || subs.length === 0}
//               >
//                 <SelectTrigger>
//                   <SelectValue placeholder={categoryId ? 'Choose subcategory' : 'Pick category first'} />
//                 </SelectTrigger>
//                 <SelectContent>
//                   {subs.map((s) => (
//                     <SelectItem key={s.id} value={String(s.id)}>
//                       {s.name}
//                     </SelectItem>
//                   ))}
//                 </SelectContent>
//               </Select>
//             </div>
//           </div>

//           {/* Optional fields */}
//           <div className="grid gap-2">
//             <Label>Invoice No (optional)</Label>
//             <Input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} disabled={submitting} />
//           </div>
//           <div className="grid gap-2">
//             <Label>Note (optional)</Label>
//             <Input value={note} onChange={(e) => setNote(e.target.value)} disabled={submitting} />
//           </div>

//           {/* Conditional extras */}
//           {source === 'RAB' && (
//             <div className="grid gap-2">
//               <Label>Shareholder ID</Label>
//               <Input
//                 type="number"
//                 value={shareholderId}
//                 onChange={(e) => setShareholderId(e.target.value ? Number(e.target.value) : '')}
//                 disabled={submitting}
//               />
//             </div>
//           )}
//           {source === 'PETTY' && (
//             <div className="grid gap-2">
//               <Label>Cashbox ID</Label>
//               <Input
//                 type="number"
//                 value={cashboxId}
//                 onChange={(e) => setCashboxId(e.target.value ? Number(e.target.value) : '')}
//                 disabled={submitting}
//               />
//             </div>
//           )}
//         </div>

//         <DialogFooter className="mt-4">
//           <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
//             Cancel
//           </Button>
//           <Button onClick={onSubmit} disabled={submitting || !valid}>
//             {submitting ? 'Saving…' : 'Record Payment'}
//           </Button>
//         </DialogFooter>
//       </DialogContent>
//     </Dialog>
//   );
// }

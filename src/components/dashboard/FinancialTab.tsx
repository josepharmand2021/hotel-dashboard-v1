'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Wallet, Banknote, RefreshCcw } from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from 'recharts';

const fmt = new Intl.NumberFormat('id-ID');

/* ---------- Types ---------- */
type Expense = {
  expense_date: string;
  amount: number;
  source: 'PT'|'RAB'|'PETTY'|string;
  status: string;
  cashbox_id: number | null;
  shareholder_id: number | null;
};
type PettyTxn = { type: 'topup'|'settlement'|'adjust_in'|'adjust_out'; amount: number; txn_date: string };
type PTTopup  = { amount: number; topup_date: string };
type RABAlloc = { shareholder_id: number; amount: number; alloc_date: string };
type Contribution = { shareholder_id: number; amount: number; transfer_date: string; status: string };
type Obligation  = { shareholder_id: number; obligation_amount: number };
type Shareholder = { id: number; name: string };

type CashflowRow = { month: string; in: number; out: number; net: number };
type RABShareRow = { shareholder: string; allocated: number; actual: number; balance: number };
type UnpaidRow    = { shareholder: string; obligation: number; paid: number; outstanding: number; last_payment?: string | null };

/* ---------- Helpers ---------- */
const sum = (xs:number[]) => xs.reduce((a,b)=>a+b,0);
const startOfMonth = (d=new Date()) => new Date(d.getFullYear(), d.getMonth(), 1);
const addMonths = (d:Date,n:number)=>{const x=new Date(d);x.setMonth(x.getMonth()+n);return x;};
const isTransferToPetty = (e:Expense) => (e.cashbox_id !== null) && (e.source === 'PT' || e.source === 'RAB');

/* ---------- Component ---------- */
export default function FinancialTab({ refreshKey=0 }: { refreshKey?: number }) {
  const [loading, setLoading] = useState(true);

  // raw data
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [pettyTxns, setPettyTxns] = useState<PettyTxn[]>([]);
  const [ptTopups, setPtTopups]   = useState<PTTopup[]>([]);
  const [rabAllocs, setRabAllocs] = useState<RABAlloc[]>([]);
  const [contribs, setContribs]   = useState<Contribution[]>([]);
  const [obligs, setObligs]       = useState<Obligation[]>([]);
  const [holders, setHolders]     = useState<Shareholder[]>([]);

  async function load() {
    setLoading(true);
    try {
      const [
        { data: ex, error: e1 },
        { data: px, error: e2 },
        { data: pt, error: e3 },
        { data: ra, error: e4 },
        { data: cc, error: e5 },
        { data: ob, error: e6 },
        { data: sh, error: e7 },
      ] = await Promise.all([
        supabase.from('expenses')
          .select('expense_date,amount,source,status,cashbox_id,shareholder_id')
          .eq('status','posted'),
        supabase.from('petty_cash_txns').select('type,amount,txn_date'),
        supabase.from('pt_topups').select('amount,topup_date'),
        supabase.from('rab_allocations').select('shareholder_id,amount,alloc_date'),
        supabase.from('capital_contributions').select('shareholder_id,amount,transfer_date,status'),
        supabase.from('ci_obligations').select('shareholder_id,obligation_amount'),
        supabase.from('shareholders').select('id,name'),
      ]);
      if (e1||e2||e3||e4||e5||e6||e7) throw (e1||e2||e3||e4||e5||e6||e7);

      setExpenses((ex||[]) as Expense[]);
      setPettyTxns((px||[]) as PettyTxn[]);
      setPtTopups((pt||[]) as PTTopup[]);
      setRabAllocs((ra||[]) as RABAlloc[]);
      setContribs((cc||[]) as Contribution[]);
      setObligs((ob||[]) as Obligation[]);
      setHolders((sh||[]) as Shareholder[]);
    } finally { setLoading(false); }
  }
  useEffect(()=>{ load(); /* eslint-disable-next-line */ },[refreshKey]);

  const posted = expenses; // sudah difilter posted di query

  /* ---------- Totals (lifetime) ---------- */
  // In
  const ptIn = useMemo(()=>{
    const topups = sum(ptTopups.map(t=>+t.amount));
    const contributions = sum(contribs.filter(c=>c.status==='posted').map(c=>+c.amount));
    const settlements = sum(pettyTxns.filter(t=>t.type==='settlement').map(t=>+t.amount));
    return topups + contributions + settlements;
  },[ptTopups, contribs, pettyTxns]);

  const rabIn = useMemo(()=> sum(rabAllocs.map(a=>+a.amount)), [rabAllocs]);

  const pettyIn = useMemo(()=>{
    const pettyTopup = sum(pettyTxns.filter(t=>t.type==='topup' || t.type==='adjust_in').map(t=>+t.amount));
    const transferExp = sum(posted.filter(isTransferToPetty).map(e=>+e.amount));
    return pettyTopup + transferExp;
  },[pettyTxns, posted]);

  // Out (exclude transfer-to-petty agar tak double count)
  const outPT    = useMemo(()=> sum(posted.filter(e=>e.source==='PT'    && !isTransferToPetty(e)).map(e=>+e.amount)), [posted]);
  const outRAB   = useMemo(()=> sum(posted.filter(e=>e.source==='RAB'   && !isTransferToPetty(e)).map(e=>+e.amount)), [posted]);
  const outPetty = useMemo(()=>{
    const pettySpend = sum(posted.filter(e=>e.source==='PETTY').map(e=>+e.amount));
    const settleOut  = sum(pettyTxns.filter(t=>t.type==='settlement' || t.type==='adjust_out').map(t=>+t.amount));
    return pettySpend + settleOut;
  },[posted, pettyTxns]);

  const ioRows = [
    { name: 'PT',    in: ptIn,  out: outPT },
    { name: 'RAB',   in: rabIn, out: outRAB },
    { name: 'Petty', in: pettyIn, out: outPetty },
  ];
  const ioTotal = {
    in: sum(ioRows.map(r=>r.in)),
    out: sum(ioRows.map(r=>r.out)),
  };

  /* ---------- KPI ---------- */
  const ptBalance = ptIn - outPT;
  const pettyBalance = pettyIn - outPetty;
  const rabBalanceTotal = rabIn - outRAB;
  const cashTotal = ptBalance + pettyBalance;

  /* ---------- Cashflow 6 bulan ---------- */
  const today = new Date();
  const monthStart = addMonths(startOfMonth(today), -5);
  const flow: CashflowRow[] = useMemo(()=>{
    const rows: CashflowRow[] = [];
    for (let i=0;i<6;i++){
      const d = addMonths(monthStart, i);
      rows.push({ month: new Intl.DateTimeFormat('id-ID',{month:'short'}).format(d), in:0, out:0, net:0 });
    }
    const idx = (ds:string)=> {
      const d=new Date(ds);
      return (d.getFullYear()*12 + d.getMonth()) - (monthStart.getFullYear()*12 + monthStart.getMonth());
    };

    // In side
    for (const t of ptTopups){ const i=idx(t.topup_date); if(i>=0&&i<6) rows[i].in += +t.amount; }
    for (const c of contribs.filter(c=>c.status==='posted')){ const i=idx(c.transfer_date); if(i>=0&&i<6) rows[i].in += +c.amount; }
    for (const t of pettyTxns){ if(t.type==='settlement' || t.type==='topup' || t.type==='adjust_in'){ const i=idx(t.txn_date); if(i>=0&&i<6) rows[i].in += +t.amount; } }
    for (const a of rabAllocs){ const i=idx(a.alloc_date); if(i>=0&&i<6) rows[i].in += +a.amount; }

    // Out side (exclude transfer-to-petty)
    for (const e of posted){ if(isTransferToPetty(e)) continue; const i=idx(e.expense_date); if(i>=0&&i<6) rows[i].out += +e.amount; }
    for (const t of pettyTxns){ if(t.type==='settlement' || t.type==='adjust_out'){ const i=idx(t.txn_date); if(i>=0&&i<6) rows[i].out += +t.amount; } }

    for (const r of rows) r.net = r.in - r.out;
    return rows;
  },[ptTopups, contribs, pettyTxns, rabAllocs, posted]);

  /* ---------- RAB per shareholder ---------- */
  const rabPerHolder: RABShareRow[] = useMemo(()=>{
    const name = new Map(holders.map(h=>[h.id,h.name]));
    const allocBy = new Map<number, number>();
    const actualBy= new Map<number, number>();
    for (const a of rabAllocs) allocBy.set(a.shareholder_id,(allocBy.get(a.shareholder_id)||0)+ +a.amount);
    for (const e of posted){
      if (e.source==='RAB' && !isTransferToPetty(e) && e.shareholder_id){
        actualBy.set(e.shareholder_id,(actualBy.get(e.shareholder_id)||0)+ +e.amount);
      }
    }
    const ids = new Set<number>([...allocBy.keys(), ...actualBy.keys()]);
    return [...ids].map(id=>({
      shareholder: name.get(id)||`#${id}`,
      allocated: allocBy.get(id)||0,
      actual: actualBy.get(id)||0,
      balance: (allocBy.get(id)||0) - (actualBy.get(id)||0),
    })).sort((a,b)=>a.balance-b.balance);
  },[holders, rabAllocs, posted]);

  /* ---------- Unpaid summary ---------- */
  const unpaid: UnpaidRow[] = useMemo(()=>{
    const name = new Map(holders.map(h=>[h.id,h.name]));
    const obligBy = new Map<number, number>();
    const paidBy  = new Map<number, number>();
    const lastPay = new Map<number, string|null>();
    for (const o of obligs) obligBy.set(o.shareholder_id,(obligBy.get(o.shareholder_id)||0)+ +o.obligation_amount);
    for (const c of contribs.filter(c=>c.status==='posted')){
      paidBy.set(c.shareholder_id,(paidBy.get(c.shareholder_id)||0)+ +c.amount);
      const lp = lastPay.get(c.shareholder_id);
      if (!lp || new Date(c.transfer_date) > new Date(lp)) lastPay.set(c.shareholder_id,c.transfer_date);
    }
    const ids = new Set<number>([...obligBy.keys(), ...paidBy.keys()]);
    return [...ids].map(id=>{
      const obligation = obligBy.get(id)||0;
      const paid = paidBy.get(id)||0;
      return {
        shareholder: name.get(id)||`#${id}`,
        obligation, paid, outstanding: Math.max(0, obligation-paid),
        last_payment: lastPay.get(id)||null,
      };
    }).sort((a,b)=>b.outstanding-a.outstanding);
  },[holders, obligs, contribs]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Financial</div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCcw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* KPI: Cash & RAB */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <KPI title="Cash & Equivalents"
             value={`Rp ${fmt.format(cashTotal)}`}
             hint={`PT Rp ${fmt.format(ptBalance)} • Petty Rp ${fmt.format(pettyBalance)}`}
             icon={<Wallet className="h-5 w-5" />} />
        <SaldoRABCard total={`Rp ${fmt.format(rabBalanceTotal)}`} rows={rabPerHolder} loading={loading} />
      </div>

      {/* Cashflow (6 bulan) */}
      <Card>
        <CardHeader><CardTitle>Cashflow (6 bulan)</CardTitle></CardHeader>
        <CardContent className="h-72">
          {loading ? <div className="text-sm text-muted-foreground">Loading…</div> : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={flow} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeOpacity={0.2} />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis tickFormatter={(v)=>`Rp ${fmt.format(Number(v))}`} fontSize={12} width={84} />
                <Tooltip formatter={(v:number,n:string)=>[`Rp ${fmt.format(v)}`, n.toUpperCase()]} />
                <Legend />
                <Area type="monotone" dataKey="in"  name="In"  stroke="#10b981" fill="#10b981" fillOpacity={0.18} strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="out" name="Out" stroke="#ef4444" fill="#ef4444" fillOpacity={0.18} strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="net" name="Balance" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.10} strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Summary In/Out/Balance */}
      <Card>
        <CardHeader><CardTitle>Summary Pemasukan & Pengeluaran</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full table-fixed">
              <colgroup>
                <col className="w-[28%]" /><col className="w-[24%]" /><col className="w-[24%]" /><col className="w-[24%]" />
              </colgroup>
              <thead className="bg-muted/50 text-sm">
                <tr>
                  <th className="text-left px-3 py-2">Source</th>
                  <th className="text-right px-3 py-2">In</th>
                  <th className="text-right px-3 py-2">Out</th>
                  <th className="text-right px-3 py-2">Balance</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {ioRows.map((r)=>(
                  <tr key={r.name} className="border-t">
                    <td className="px-3 py-2">{r.name}</td>
                    <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">Rp {fmt.format(r.in)}</td>
                    <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">Rp {fmt.format(r.out)}</td>
                    <td className={`px-3 py-2 text-right tabular-nums whitespace-nowrap ${(r.in-r.out)<0?'text-red-600':''}`}>
                      Rp {fmt.format(r.in - r.out)}
                    </td>
                  </tr>
                ))}
                <tr className="border-t bg-muted/30 font-medium">
                  <td className="px-3 py-2">Total</td>
                  <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">Rp {fmt.format(ioTotal.in)}</td>
                  <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">Rp {fmt.format(ioTotal.out)}</td>
                  <td className={`px-3 py-2 text-right tabular-nums whitespace-nowrap ${(ioTotal.in-ioTotal.out)<0?'text-red-600':''}`}>
                    Rp {fmt.format(ioTotal.in - ioTotal.out)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            * In = <b>PT</b>: Contributions (posted) + PT Topups + Petty Settlement; <b>RAB</b>: Allocations; <b>Petty</b>: Topup/Adjust In + transfer ke petty (dari PT/RAB).
            Out = Expenses posted (transfer ke petty dikecualikan) + Petty Settlement/Adjust Out.
          </div>
        </CardContent>
      </Card>

      {/* Unpaid Summary */}
      <Card>
        <CardHeader><CardTitle>Unpaid Summary (Belum Setor ke PT)</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full table-fixed">
              <colgroup>
                <col className="w-[28%]" /><col className="w-[18%]" /><col className="w-[18%]" />
                <col className="w-[18%]" /><col className="w-[8%]" /><col className="w-[20%]" />
              </colgroup>
              <thead className="bg-muted/50 text-sm">
                <tr>
                  <th className="text-left px-3 py-2">Shareholder</th>
                  <th className="text-right px-3 py-2">Obligation</th>
                  <th className="text-right px-3 py-2">Paid</th>
                  <th className="text-right px-3 py-2">Outstanding</th>
                  <th className="text-right px-3 py-2">%</th>
                  <th className="text-left px-3 py-2">Last Payment</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {unpaid.map((r, i) => {
                  const pct = r.obligation > 0 ? Math.round((r.paid / r.obligation) * 100) : 100;
                  return (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-2">{r.shareholder}</td>
                      <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">Rp {fmt.format(r.obligation)}</td>
                      <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">Rp {fmt.format(r.paid)}</td>
                      <td className={`px-3 py-2 text-right tabular-nums whitespace-nowrap ${r.outstanding>0?'text-red-600':''}`}>
                        Rp {fmt.format(r.outstanding)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{pct}%</td>
                      <td className="px-3 py-2">{r.last_payment ?? '—'}</td>
                    </tr>
                  );
                })}
                {unpaid.length===0 && (
                  <tr><td colSpan={6} className="text-center text-muted-foreground py-10">Tidak ada data</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------- Mini Components ---------- */
function KPI({ title, value, hint, icon }: { title: string; value: string; hint?: string; icon?: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">{icon}{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums whitespace-nowrap">{value}</div>
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function SaldoRABCard({ total, rows, loading }: { total: string; rows: RABShareRow[]; loading: boolean }) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Banknote className="h-5 w-5" /> Saldo RAB (Total)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-2xl font-bold tabular-nums whitespace-nowrap">{total}</div>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="mt-1">Rincian per shareholder</Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[740px] sm:w-[800px]">
            <SheetHeader><SheetTitle>RAB per Shareholder</SheetTitle></SheetHeader>
            <div className="mt-4 overflow-x-auto rounded-md border">
              <table className="w-full table-fixed min-w-[720px]">
                <colgroup>
                  <col className="w-[32%]" /><col className="w-[22%]" /><col className="w-[22%]" /><col className="w-[24%]" />
                </colgroup>
                <thead className="bg-muted/50 text-sm">
                  <tr>
                    <th className="text-left px-3 py-2">Shareholder</th>
                    <th className="text-right px-3 py-2">Allocated</th>
                    <th className="text-right px-3 py-2">Actual</th>
                    <th className="text-right px-3 py-2">Balance</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {(loading ? [] : rows).map((r, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-2 truncate">{r.shareholder}</td>
                      <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">Rp {fmt.format(r.allocated)}</td>
                      <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">Rp {fmt.format(r.actual)}</td>
                      <td className={`px-3 py-2 text-right tabular-nums whitespace-nowrap ${r.balance<0?'text-red-600':''}`}>
                        Rp {fmt.format(r.balance)}
                      </td>
                    </tr>
                  ))}
                  {!loading && rows.length===0 && (
                    <tr><td colSpan={4} className="text-center text-muted-foreground py-10">Tidak ada data</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </SheetContent>
        </Sheet>
      </CardContent>
    </Card>
  );
}

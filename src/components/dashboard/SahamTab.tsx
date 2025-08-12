'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCcw } from 'lucide-react';

const fmt = new Intl.NumberFormat('id-ID');

// ---------- Types ----------
type Shareholder = { id: number; name: string; ownership_percent: number };
type Injection = { id: number; period: string | null; created_at: string; target_total: number };
type Obligation = { capital_injection_id: number; shareholder_id: number; obligation_amount: number };
type Contribution = { shareholder_id: number; amount: number; transfer_date: string; status: string };
type RABAlloc = { shareholder_id: number; amount: number; alloc_date: string };
type Expense = { source: 'RAB'|'PT'|'PETTY'|string; status: string; expense_date: string; amount: number; shareholder_id: number|null };

// ---------- Helpers ----------
const mkey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
const toMonthKey = (isoDate: string) => isoDate.slice(0,7);
const labelID = (ym: string) => {
  const [y,m] = ym.split('-').map(Number);
  return new Date(y, m-1, 1).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
};
const addMonths = (d: Date, n: number) => { const x = new Date(d); x.setMonth(x.getMonth()+n); return x; };
const monthRange = (fromYM: string, toYM: string) => {
  const [fy,fm] = fromYM.split('-').map(Number);
  const [ty,tm] = toYM.split('-').map(Number);
  const from = new Date(fy, fm-1, 1);
  const to = new Date(ty, tm-1, 1);
  const out: string[] = [];
  for (let cur = new Date(from); cur <= to; cur = addMonths(cur,1)) out.push(mkey(cur));
  return out;
};
const monthFromInjection = (inj: Injection) => (inj.period && /^\d{4}-\d{2}$/.test(inj.period)) ? inj.period : toMonthKey(inj.created_at);

// ---------- Component ----------
export default function SahamTab({ refreshKey = 0 }: { refreshKey?: number }) {
  // Default 6 bulan terakhir (termasuk bulan ini)
  const thisMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const [fromYM, setFromYM] = useState<string>(mkey(addMonths(thisMonth, -5)));
  const [toYM, setToYM] = useState<string>(mkey(thisMonth));

  const months = useMemo(()=> monthRange(fromYM, toYM), [fromYM, toYM]);
  const [loading, setLoading] = useState(true);

  const [holders, setHolders] = useState<Shareholder[]>([]);
  const [injections, setInjections] = useState<Injection[]>([]);
  const [obligs, setObligs] = useState<Obligation[]>([]);
  const [contribs, setContribs] = useState<Contribution[]>([]);
  const [rabAllocs, setRabAllocs] = useState<RABAlloc[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  async function load() {
    setLoading(true);
    try {
      const [
        { data: sh,  error: e1 },
        { data: inj, error: e2 },
        { data: ob,  error: e3 },
        { data: cc,  error: e4 },
        { data: ra,  error: e5 },
        { data: ex,  error: e6 },
      ] = await Promise.all([
        supabase.from('shareholders').select('id,name,ownership_percent').order('id'),
        supabase.from('capital_injections').select('id,period,created_at,target_total'),
        supabase.from('ci_obligations').select('capital_injection_id,shareholder_id,obligation_amount'),
        supabase.from('capital_contributions').select('shareholder_id,amount,transfer_date,status'),
        supabase.from('rab_allocations').select('shareholder_id,amount,alloc_date'),
        supabase.from('expenses').select('source,status,expense_date,amount,shareholder_id'),
      ]);
      if (e1||e2||e3||e4||e5||e6) throw (e1||e2||e3||e4||e5||e6);

      setHolders((sh||[]) as Shareholder[]);
      setInjections((inj||[]) as Injection[]);
      setObligs((ob||[]) as Obligation[]);
      setContribs((cc||[]) as Contribution[]);
      setRabAllocs((ra||[]) as RABAlloc[]);
      setExpenses((ex||[]) as Expense[]);
    } finally { setLoading(false); }
  }
  useEffect(()=>{ load(); /* eslint-disable-next-line */ }, [refreshKey, fromYM, toYM]);

  // PT: Nominal (total target_total per bulan)
  const nominalPerMonth = useMemo(()=>{
    const perMonth = new Map<string, number>();
    for (const inj of injections) {
      const ym = monthFromInjection(inj);
      if (!months.includes(ym)) continue;
      perMonth.set(ym, (perMonth.get(ym)||0) + +(inj.target_total||0));
    }
    return months.map(ym => perMonth.get(ym) || 0);
  }, [injections, months]);

  // PT: Obligation per bulan per SH (buat unpaid)
  const obligPerMonthPerSH = useMemo(()=>{
    const injMonth = new Map<number,string>(injections.map(i=>[i.id, monthFromInjection(i)]));
    const map = new Map<string, Map<number, number>>();
    for (const o of obligs) {
      const ym = injMonth.get(o.capital_injection_id);
      if (!ym || !months.includes(ym)) continue;
      if (!map.has(ym)) map.set(ym, new Map());
      const m = map.get(ym)!;
      m.set(o.shareholder_id, (m.get(o.shareholder_id)||0) + +o.obligation_amount);
    }
    return map;
  }, [injections, obligs, months]);

  // PT: Terbayar per bulan per SH
  const paidPerMonthPerSH = useMemo(()=>{
    const map = new Map<string, Map<number, number>>();
    for (const c of contribs.filter(c=>c.status==='posted')) {
      const ym = toMonthKey(c.transfer_date);
      if (!months.includes(ym)) continue;
      if (!map.has(ym)) map.set(ym, new Map());
      const m = map.get(ym)!;
      m.set(c.shareholder_id, (m.get(c.shareholder_id)||0) + +c.amount);
    }
    return map;
  }, [contribs, months]);

  // PT: Belum Terbayar = obligation - paid (bucket per bulan)
  const unpaidPerMonthPerSH = useMemo(()=>{
    const map = new Map<string, Map<number, number>>();
    for (const ym of months) {
      const ob = obligPerMonthPerSH.get(ym) || new Map<number,number>();
      const pd = paidPerMonthPerSH.get(ym) || new Map<number,number>();
      const row = new Map<number, number>();
      const sids = new Set<number>([...ob.keys(), ...pd.keys()]);
      for (const sid of sids) {
        const val = (ob.get(sid)||0) - (pd.get(sid)||0);
        row.set(sid, Math.max(0, val));
      }
      map.set(ym, row);
    }
    return map;
  }, [months, obligPerMonthPerSH, paidPerMonthPerSH]);

  // totals paid/unpaid per SH
  const totalPaidPerSH = useMemo(()=>{
    const t = new Map<number, number>();
    for (const m of paidPerMonthPerSH.values()) for (const [sid, val] of m) t.set(sid, (t.get(sid)||0)+val);
    return t;
  }, [paidPerMonthPerSH]);

  const totalUnpaidPerSH = useMemo(()=>{
    const t = new Map<number, number>();
    for (const m of unpaidPerMonthPerSH.values()) for (const [sid, val] of m) t.set(sid, (t.get(sid)||0)+val);
    return t;
  }, [unpaidPerMonthPerSH]);

  // RAB Balance
  const rabAllocPerMonth = useMemo(()=>{
    const perMonth = new Map<string, number>();
    for (const a of rabAllocs) {
      const ym = toMonthKey(a.alloc_date);
      if (!months.includes(ym)) continue;
      perMonth.set(ym, (perMonth.get(ym)||0) + +a.amount);
    }
    return perMonth;
  }, [rabAllocs, months]);

  const rabAllocTotalPerSH = useMemo(()=>{
    const t = new Map<number, number>();
    for (const a of rabAllocs) t.set(a.shareholder_id, (t.get(a.shareholder_id)||0) + +a.amount);
    return t;
  }, [rabAllocs]);

  const rabActualPerSH = useMemo(()=>{
    const t = new Map<number, number>();
    for (const e of expenses) {
      if (e.source!=='RAB' || e.status!=='posted' || !e.shareholder_id) continue;
      t.set(e.shareholder_id, (t.get(e.shareholder_id)||0) + +e.amount);
    }
    return t;
  }, [expenses]);

  const rabBalancePerSH = useMemo(()=>{
    const ids = new Set<number>([...rabAllocTotalPerSH.keys(), ...rabActualPerSH.keys()]);
    const res = new Map<number, number>();
    for (const id of ids) res.set(id, (rabAllocTotalPerSH.get(id)||0) - (rabActualPerSH.get(id)||0));
    return res;
  }, [rabAllocTotalPerSH, rabActualPerSH]);

  // ---------- UI ----------
  return (
    <div className="space-y-6">
      <div className="flex items-end gap-2 flex-wrap">
        <div>
          <div className="text-xs text-muted-foreground">From (bulan)</div>
          <Input type="month" value={fromYM} onChange={(e)=>setFromYM(e.target.value)} className="w-[170px]" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">To (bulan)</div>
          <Input type="month" value={toYM} onChange={(e)=>setToYM(e.target.value)} className="w-[170px]" />
        </div>
        <Button variant="outline" onClick={load}><RefreshCcw className="h-4 w-4 mr-2" />Refresh</Button>
      </div>

      {/* PT – Terbayar */}
      <Card>
        <CardHeader><CardTitle>PT – Terbayar</CardTitle></CardHeader>
        <CardContent>
          <PivotTable
            loading={loading}
            months={months}
            rows={[
              {
                label: 'Nominal',
                values: months.map((ym)=> nominalPerMonth[months.indexOf(ym)] || 0),
                rightLabel: 'TOTAL SETOR',
                rightValue: nominalPerMonth.reduce((a,b)=>a+b,0),
                isMuted: true,
              },
              ...holders.map(h=>({
                label: `${h.name} ${h.ownership_percent ? `(${Math.round(h.ownership_percent)}%)` : ''}`,
                values: months.map((ym)=> paidPerMonthPerSH.get(ym)?.get(h.id) || 0),
                rightLabel: '',
                rightValue: totalPaidPerSH.get(h.id) || 0,
              })),
            ]}
            rightHeader="TOTAL SETOR"
          />
        </CardContent>
      </Card>

      {/* PT – Belum Terbayar */}
      <Card>
        <CardHeader><CardTitle>PT – Belum Terbayar</CardTitle></CardHeader>
        <CardContent>
          <PivotTable
            loading={loading}
            months={months}
            rows={[
              {
                label: 'Nominal',
                values: months.map((ym)=> nominalPerMonth[months.indexOf(ym)] || 0),
                rightLabel: 'TOTAL BELUM DIBAYARKAN',
                rightValue: nominalPerMonth.reduce((a,b)=>a+b,0),
                isMuted: true,
              },
              ...holders.map(h=>({
                label: `${h.name} ${h.ownership_percent ? `(${Math.round(h.ownership_percent)}%)` : ''}`,
                values: months.map((ym)=> unpaidPerMonthPerSH.get(ym)?.get(h.id) || 0),
                rightLabel: '',
                rightValue: totalUnpaidPerSH.get(h.id) || 0,
                dangerRight: (totalUnpaidPerSH.get(h.id)||0) > 0,
              })),
            ]}
            rightHeader="TOTAL BELUM DIBAYARKAN"
          />
        </CardContent>
      </Card>

      {/* RAB – Balance */}
      <Card>
        <CardHeader><CardTitle>RAB – Balance</CardTitle></CardHeader>
        <CardContent>
          <PivotTable
            loading={loading}
            months={months}
            rows={[
              {
                label: 'Nominal',
                values: months.map((ym)=> rabAllocPerMonth.get(ym) || 0),
                rightLabel: 'TOTAL RAB',
                rightValue: Array.from(rabAllocPerMonth.values()).reduce((a,b)=>a+b,0),
                isMuted: true,
              },
              ...holders.map(h=>{
                const total = rabAllocTotalPerSH.get(h.id)||0;
                const balance = rabBalancePerSH.get(h.id)||0;
                return {
                  label: `${h.name} ${h.ownership_percent ? `(${Math.round(h.ownership_percent)}%)` : ''}`,
                  values: months.map(()=> 0),
                  rightLabel: `Rp ${fmt.format(total)}`,
                  rightValue: balance,
                  rightValueLabel: 'DANA TERSEDIA',
                };
              }),
            ]}
            rightHeader="TOTAL RAB / DANA TERSEDIA"
            showTwoRightColumns
          />
        </CardContent>
      </Card>
    </div>
  );
}

// ---------- Reusable table ----------
function PivotTable({
  loading, months, rows, rightHeader, showTwoRightColumns = false,
}: {
  loading: boolean;
  months: string[];
  rightHeader: string;
  showTwoRightColumns?: boolean;
  rows: Array<{
    label: string;
    values: number[];
    rightLabel?: string;
    rightValue?: number;
    rightValueLabel?: string;
    isMuted?: boolean;
    dangerRight?: boolean;
  }>;
}) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="min-w-[900px] w-full table-fixed">
        <colgroup>
          <col className="w-[24%]" />
          {months.map((_,i)=>(<col key={i} className="w-[9%]" />))}
          {showTwoRightColumns ? (<><col className="w-[18%]" /><col className="w-[18%]" /></>) : (<col className="w-[18%]" />)}
        </colgroup>
        <thead className="bg-muted/50 text-sm">
          <tr>
            <th className="text-left px-3 py-2">Shareholder / Nominal</th>
            {months.map(m=>(
              <th key={m} className="text-right px-3 py-2">{labelID(m)}</th>
            ))}
            {showTwoRightColumns ? (
              <>
                <th className="text-right px-3 py-2">Total</th>
                <th className="text-right px-3 py-2">{rightHeader}</th>
              </>
            ) : (<th className="text-right px-3 py-2">{rightHeader}</th>)}
          </tr>
        </thead>
        <tbody className="text-sm">
          {loading ? (
            <tr><td colSpan={months.length + (showTwoRightColumns?3:2)} className="py-10 text-center text-muted-foreground">Loading…</td></tr>
          ) : rows.map((r,idx)=>(
            <tr key={idx} className={r.isMuted ? 'bg-muted/20 border-t' : 'border-t'}>
              <td className="px-3 py-2">{r.label}</td>
              {r.values.map((v,i)=>(
                <td key={i} className="px-3 py-2 text-right tabular-nums whitespace-nowrap">Rp {fmt.format(v||0)}</td>
              ))}
              {showTwoRightColumns ? (
                <>
                  <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">{r.rightLabel || '—'}</td>
                  <td className={cnRight(r)}>
                    {`Rp ${fmt.format(r.rightValue||0)}`}
                    {r.rightValueLabel ? <div className="text-xs text-muted-foreground">{r.rightValueLabel}</div> : null}
                  </td>
                </>
              ) : (
                <td className={cnRight(r)}>{`Rp ${fmt.format(r.rightValue||0)}`}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="text-xs text-muted-foreground px-3 py-2">
        * “Nominal” = total <code>capital_injections.target_total</code> per bulan. “Terbayar” = contributions (posted). “Belum Terbayar” = obligation − paid. RAB Balance = Alloc − Realisasi.
      </div>
    </div>
  );
}

function cnRight(r: { dangerRight?: boolean }) {
  return `px-3 py-2 text-right tabular-nums whitespace-nowrap ${r.dangerRight ? 'text-red-600' : ''}`;
}

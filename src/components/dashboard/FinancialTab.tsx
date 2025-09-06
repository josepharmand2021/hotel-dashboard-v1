// src/components/dashboard/FinancialTab.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Wallet, AlarmClock, TimerReset, FileWarning } from 'lucide-react';

const fmtIDR = (n: number | null | undefined) =>
  `Rp ${new Intl.NumberFormat('id-ID').format(Number(n || 0))}`;

/* ---------- VIEW types ---------- */
type KPIViewRow = {
  outstanding_amount: number;
  outstanding_count: number;
  overdue_amount: number;
  overdue_count: number;
  due7_amount: number;
  due7_count: number;
};

type BalanceViewRow = {
  source: 'PT' | 'Petty' | 'RAB' | string;
  in_amount: number;
  out_amount: number;
  balance: number;
};

type BudgetViewRow = {
  category_id: number;
  category_name: string;
  subcategory_id: number;
  subcategory_name: string;
  budget: number;
  terpakai: number;
  sisa: number;
};

/* ---------- Shareholders table types ---------- */
type Shareholder = { id: number; name: string; ownership_percent: number };
type Obligation  = { shareholder_id: number; obligation_amount: number };
type Contribution = { shareholder_id: number; amount: number; status: string };
type RABAlloc    = { shareholder_id: number; amount: number };
type ExpRow      = { shareholder_id: number | null; amount: number; source: string; status: string; cashbox_id: number | null };

type ShareRow = {
  id: number;
  name: string;
  percent: number;
  // PT
  totalSetor: number;   // kewajiban (obligation)
  paidPT: number;       // contributions (posted)
  unpaidPT: number;     // obligation - paid
  // RAB
  saldoRAB: number;     // total allocation
  terpakaiRAB: number;  // expenses RAB (posted, bukan transfer ke petty)
  belumTerpakaiRAB: number;
};

export default function FinancialTab({ refreshKey = 0 }: { refreshKey?: number }) {
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState<string | undefined>();

  // VIEW data
  const [kpi, setKpi] = useState<KPIViewRow | null>(null);
  const [balances, setBalances] = useState<BalanceViewRow[]>([]);
  const [budgetRows, setBudgetRows] = useState<BudgetViewRow[]>([]);

  // Shareholders table data
  const [shareRows, setShareRows] = useState<ShareRow[]>([]);

  async function load() {
    setLoading(true);
    setErrMsg(undefined);
    try {
      const [
        { data: kpiRow, error: e1 },
        { data: balRows, error: e2 },
        { data: budRows, error: e3 },

        // Tambahan untuk tabel saham
        { data: sh, error: e4 },
        { data: ob, error: e5 },
        { data: cc, error: e6 },
        { data: ra, error: e7 },
        { data: ex, error: e8 },
      ] = await Promise.all([
        supabase.from('v_payables_kpi').select('*').single(),
        supabase.from('v_fin_balances_sources').select('*'),
        supabase
          .from('v_budget_vs_payables_rab')
          .select('category_id,category_name,subcategory_id,subcategory_name,budget,terpakai,sisa'),

        // tabel dasar
        supabase.from('shareholders').select('id,name,ownership_percent').order('id', { ascending: true }),
        supabase.from('ci_obligations').select('shareholder_id,obligation_amount'),
        supabase.from('capital_contributions').select('shareholder_id,amount,status'),
        supabase.from('rab_allocations').select('shareholder_id,amount'),
        supabase
          .from('expenses')
          .select('shareholder_id,amount,source,status,cashbox_id')
          .eq('status', 'posted')
          .eq('source', 'RAB'),
      ]);

      if (e1 || e2 || e3 || e4 || e5 || e6 || e7 || e8) {
        throw (e1 || e2 || e3 || e4 || e5 || e6 || e7 || e8);
      }

      // VIEWs
      setKpi((kpiRow || null) as KPIViewRow | null);
      setBalances((balRows || []) as BalanceViewRow[]);
      setBudgetRows((budRows || []) as BudgetViewRow[]);

      // Build tabel saham (mirip sheet)
      const holders = (sh ?? []) as Shareholder[];
      const obligs  = (ob ?? []) as Obligation[];
      const contrib = (cc ?? []) as Contribution[];
      const allocs  = (ra ?? []) as RABAlloc[];
      const exps    = (ex ?? []) as ExpRow[];

      const obBy = new Map<number, number>();
      obligs.forEach(o => obBy.set(o.shareholder_id, (obBy.get(o.shareholder_id) || 0) + Number(o.obligation_amount)));

      const paidBy = new Map<number, number>();
      contrib.filter(c => c.status === 'posted').forEach(c => {
        paidBy.set(c.shareholder_id, (paidBy.get(c.shareholder_id) || 0) + Number(c.amount));
      });

      const allocBy = new Map<number, number>();
      allocs.forEach(a => {
        allocBy.set(a.shareholder_id, (allocBy.get(a.shareholder_id) || 0) + Number(a.amount));
      });

      // exclude transfer-ke-petty: di expenses RAB, anggap baris yang punya cashbox_id ≠ null adalah transfer
      const rabActualBy = new Map<number, number>();
      exps.filter(e => e.cashbox_id === null).forEach(e => {
        if (!e.shareholder_id) return;
        rabActualBy.set(e.shareholder_id, (rabActualBy.get(e.shareholder_id) || 0) + Number(e.amount));
      });

      const builtRows: ShareRow[] = holders.map(h => {
        const totalSetor = Math.round(obBy.get(h.id) || 0);
        const paidPT     = Math.round(paidBy.get(h.id) || 0);
        const unpaidPT   = Math.max(0, totalSetor - paidPT);

        const saldoRAB    = Math.round(allocBy.get(h.id) || 0);
        const terpakaiRAB = Math.round(rabActualBy.get(h.id) || 0);
        const belumTerpakaiRAB = Math.max(0, saldoRAB - terpakaiRAB);

        return {
          id: h.id,
          name: h.name,
          percent: Number(h.ownership_percent) || 0,
          totalSetor, paidPT, unpaidPT,
          saldoRAB, terpakaiRAB, belumTerpakaiRAB,
        };
      });

      setShareRows(builtRows);
    } catch (e: any) {
      setErrMsg(e?.message || 'Gagal memuat data (cek VIEW & akses RLS)');
      setKpi(null);
      setBalances([]);
      setBudgetRows([]);
      setShareRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(); // eslint-disable-next-line
  }, [refreshKey]);

  const saldoPT    = useMemo(() => balances.find(b => b.source === 'PT')?.balance || 0, [balances]);
  const saldoPetty = useMemo(() => balances.find(b => b.source === 'Petty')?.balance || 0, [balances]);
  const saldoRAB   = useMemo(() => balances.find(b => b.source === 'RAB')?.balance || 0, [balances]);
  const saldoTotal = useMemo(() => saldoPT + saldoPetty, [saldoPT, saldoPetty]);

  const budgetTotals = useMemo(() => ({
    budget:   budgetRows.reduce((a,b)=>a + Number(b.budget||0), 0),
    terpakai: budgetRows.reduce((a,b)=>a + Number(b.terpakai||0), 0),
    sisa:     budgetRows.reduce((a,b)=>a + Number(b.sisa||0), 0),
  }), [budgetRows]);

  const shareTotals = useMemo(() => {
    return shareRows.reduce((acc, x) => {
      acc.percent += x.percent;
      acc.totalSetor += x.totalSetor;
      acc.paidPT += x.paidPT;
      acc.unpaidPT += x.unpaidPT;
      acc.saldoRAB += x.saldoRAB;
      acc.terpakaiRAB += x.terpakaiRAB;
      acc.belumTerpakaiRAB += x.belumTerpakaiRAB;
      return acc;
    }, {
      percent: 0, totalSetor: 0, paidPT: 0, unpaidPT: 0,
      saldoRAB: 0, terpakaiRAB: 0, belumTerpakaiRAB: 0,
    });
  }, [shareRows]);

  return (
    <div className="space-y-6">
      {/* header mini */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Financial</div>
        {errMsg && <span className="text-xs text-red-600">{errMsg}</span>}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPI
          title="Outstanding (Unpaid)"
          icon={<FileWarning className="h-5 w-5" />}
          value={loading ? 'Loading…' : fmtIDR(kpi?.outstanding_amount || 0)}
          hint={loading ? '' : `${kpi?.outstanding_count ?? 0} invoice`}
        />
        <KPI
          title="Overdue"
          icon={<AlarmClock className="h-5 w-5" />}
          value={loading ? 'Loading…' : fmtIDR(kpi?.overdue_amount || 0)}
          hint={loading ? '' : `${kpi?.overdue_count ?? 0} invoice lewat jatuh tempo`}
        />
        <KPI
          title="Due ≤ 7 hari"
          icon={<TimerReset className="h-5 w-5" />}
          value={loading ? 'Loading…' : fmtIDR(kpi?.due7_amount || 0)}
          hint={loading ? '' : `${kpi?.due7_count ?? 0} invoice akan jatuh tempo`}
        />
        <KPI
          title="Saldo (Cash & Eq.)"
          icon={<Wallet className="h-5 w-5" />}
          value={loading ? 'Loading…' : fmtIDR(saldoTotal)}
          hint={loading ? '' : `PT ${fmtIDR(saldoPT)} • Petty ${fmtIDR(saldoPetty)} • RAB ${fmtIDR(saldoRAB)}`}
        />
      </div>

      {/* Budget Lines vs Payables (RAB) */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Budget Lines vs Payables (RAB)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full table-fixed">
            <colgroup>
              {['w-[28%]','w-[28%]','w-[18%]','w-[18%]','w-[18%]'].map((w, i) => (
                <col key={i} className={w} />
              ))}
            </colgroup>
              <thead className="bg-muted/50 text-sm">
                <tr>
                  <th className="text-left px-3 py-2">Kategori</th>
                  <th className="text-left px-3 py-2">Subkategori</th>
                  <th className="text-right px-3 py-2">Budget</th>
                  <th className="text-right px-3 py-2">Terpakai</th>
                  <th className="text-right px-3 py-2">Sisa</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {(loading ? [] : budgetRows).map((r) => (
                  <tr key={`${r.category_id}-${r.subcategory_id}`} className="border-t">
                    <td className="px-3 py-2 truncate">{r.category_name}</td>
                    <td className="px-3 py-2 truncate">{r.subcategory_name}</td>
                    <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">{fmtIDR(r.budget)}</td>
                    <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">{fmtIDR(r.terpakai)}</td>
                    <td className={`px-3 py-2 text-right tabular-nums whitespace-nowrap ${Number(r.sisa)<0?'text-red-600':''}`}>
                      {fmtIDR(r.sisa)}
                    </td>
                  </tr>
                ))}
                {!loading && budgetRows.length === 0 && (
                  <tr><td colSpan={5} className="text-center text-muted-foreground py-10">Tidak ada data</td></tr>
                )}
                {!loading && budgetRows.length > 0 && (
                  <tr className="border-t bg-muted/30 font-medium">
                    <td className="px-3 py-2" colSpan={2}>Total</td>
                    <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">{fmtIDR(budgetTotals.budget)}</td>
                    <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">{fmtIDR(budgetTotals.terpakai)}</td>
                    <td className={`px-3 py-2 text-right tabular-nums whitespace-nowrap ${budgetTotals.sisa<0?'text-red-600':''}`}>
                      {fmtIDR(budgetTotals.sisa)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            * Data diambil dari VIEW: <code>v_payables_kpi</code>, <code>v_fin_balances_sources</code>, dan <code>v_budget_vs_payables_rab</code>.
          </div>
        </CardContent>
      </Card>

      {/* Pemegang Saham (PT & RAB) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pemegang Saham (PT & RAB)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm table-fixed">
<colgroup>
  {[
    'w-[60px]',   // No
    'w-[220px]',  // Nama
    'w-[110px]',  // Porsi
    // PT
    'w-[160px]',
    'w-[140px]',
    'w-[160px]',
    // RAB
    'w-[160px]',
    'w-[160px]',
    'w-[180px]',
  ].map((w, i) => <col key={i} className={w} />)}
</colgroup>


              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left">NO</th>
                  <th className="px-3 py-2 text-left">PEMEGANG SAHAM</th>
                  <th className="px-3 py-2 text-right">PORSI SAHAM</th>

                  <th className="px-3 py-2 text-right bg-blue-50">TOTAL SETOR (PT)</th>
                  <th className="px-3 py-2 text-right bg-blue-50">PAID (PT)</th>
                  <th className="px-3 py-2 text-right bg-red-50">UNPAID (PT)</th>

                  <th className="px-3 py-2 text-right bg-emerald-50">SALDO (RAB)</th>
                  <th className="px-3 py-2 text-right bg-emerald-50">TERPAKAI</th>
                  <th className="px-3 py-2 text-right bg-yellow-50">BELUM TERPAKAI</th>
                </tr>
              </thead>

              <tbody>
                {loading && (
                  <tr><td className="px-3 py-6 text-center text-muted-foreground" colSpan={9}>Loading…</td></tr>
                )}
                {!loading && shareRows.length === 0 && (
                  <tr><td className="px-3 py-6 text-center text-muted-foreground" colSpan={9}>Tidak ada data</td></tr>
                )}
                {!loading && shareRows.map((r, idx) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-2">{idx + 1}</td>
                    <td className="px-3 py-2">{r.name}</td>
                    <td className="px-3 py-2 text-right">{Math.round(r.percent)}%</td>

                    <td className="px-3 py-2 text-right tabular-nums bg-blue-50">{fmtIDR(r.totalSetor)}</td>
                    <td className="px-3 py-2 text-right tabular-nums bg-blue-50">{fmtIDR(r.paidPT)}</td>
                    <td className={`px-3 py-2 text-right tabular-nums bg-red-50 ${r.unpaidPT>0?'text-red-600':''}`}>
                      {fmtIDR(r.unpaidPT)}
                    </td>

                    <td className="px-3 py-2 text-right tabular-nums bg-emerald-50">{fmtIDR(r.saldoRAB)}</td>
                    <td className="px-3 py-2 text-right tabular-nums bg-emerald-50">{fmtIDR(r.terpakaiRAB)}</td>
                    <td className="px-3 py-2 text-right tabular-nums bg-yellow-50">{fmtIDR(r.belumTerpakaiRAB)}</td>
                  </tr>
                ))}

                {!loading && shareRows.length > 0 && (
                  <tr className="border-t bg-muted/30 font-medium">
                    <td className="px-3 py-2" />
                    <td className="px-3 py-2">TOTAL</td>
                    <td className="px-3 py-2 text-right">{Math.round(shareTotals.percent)}%</td>

                    <td className="px-3 py-2 text-right tabular-nums bg-blue-50">{fmtIDR(shareTotals.totalSetor)}</td>
                    <td className="px-3 py-2 text-right tabular-nums bg-blue-50">{fmtIDR(shareTotals.paidPT)}</td>
                    <td className={`px-3 py-2 text-right tabular-nums bg-red-50 ${(shareTotals.unpaidPT>0)?'text-red-600':''}`}>
                      {fmtIDR(shareTotals.unpaidPT)}
                    </td>

                    <td className="px-3 py-2 text-right tabular-nums bg-emerald-50">{fmtIDR(shareTotals.saldoRAB)}</td>
                    <td className="px-3 py-2 text-right tabular-nums bg-emerald-50">{fmtIDR(shareTotals.terpakaiRAB)}</td>
                    <td className="px-3 py-2 text-right tabular-nums bg-yellow-50">{fmtIDR(shareTotals.belumTerpakaiRAB)}</td>
                  </tr>
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

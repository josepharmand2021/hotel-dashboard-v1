// src/app/(app)/payables/page.tsx
import Link from 'next/link';
import { listPayables } from './actions';

type SP = Record<string, string | string[] | undefined>;

function fmtIDR(n: number | string | null | undefined) {
  const v = typeof n === 'string' ? parseFloat(n) : (n ?? 0);
  return new Intl.NumberFormat('id-ID').format(v as number);
}

function StatusBadge({ s }: { s: string }) {
  const cls =
    s === 'paid'
      ? 'bg-green-100 text-green-700'
      : s === 'unpaid'
      ? 'bg-amber-100 text-amber-700'
      : 'bg-gray-100 text-gray-700';
  return <span className={`px-2 py-0.5 rounded text-xs ${cls}`}>{s.toUpperCase()}</span>;
}

function Tabs({ searchParams }: { searchParams: SP }) {
  const base = (patch: Record<string, string>) => {
    const sp = new URLSearchParams();
    const keep = ['q', 'withPO', 'from', 'to', 'sort', 'limit', 'source'];
    keep.forEach((k) => {
      const v = searchParams[k];
      if (typeof v === 'string' && v) sp.set(k, v);
    });
    Object.entries(patch).forEach(([k, v]) => sp.set(k, v));
    return `/payables?${sp.toString()}`;
  };
  const cur = typeof searchParams.status === 'string' ? searchParams.status : 'unpaid';
  const tab = (val: string, label: string) => (
    <Link
      href={base({ status: val })}
      className={`px-3 py-1.5 rounded border ${cur === val ? 'bg-black text-white' : 'bg-white'}`}
    >
      {label}
    </Link>
  );
  return (
    <div className="flex gap-2">
      {tab('unpaid', 'Unpaid')}
      {tab('paid', 'Paid')}
      {tab('all', 'All')}
    </div>
  );
}

function POChips({ searchParams }: { searchParams: SP }) {
  const cur = typeof searchParams.withPO === 'string' ? searchParams.withPO : 'all';
  const make = (v: string, label: string) => {
    const sp = new URLSearchParams();
    ['q', 'status', 'from', 'to', 'sort', 'limit', 'source'].forEach((k) => {
      const val = searchParams[k];
      if (typeof val === 'string' && val) sp.set(k, val);
    });
    sp.set('withPO', v);
    return (
      <Link
        href={`/payables?${sp.toString()}`}
        className={`px-2 py-1 rounded border text-xs ${
          cur === v ? 'bg-slate-900 text-white' : 'bg-white'
        }`}
      >
        {label}
      </Link>
    );
  };
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500">PO:</span>
      {make('all', 'All')}
      {make('with', 'With PO')}
      {make('without', 'Non-PO')}
    </div>
  );
}

function SourceChips({ searchParams }: { searchParams: SP }) {
  const cur =
    typeof searchParams.source === 'string'
      ? (searchParams.source as 'all' | 'PT' | 'RAB' | 'Petty')
      : 'all';
  const chip = (v: 'all' | 'PT' | 'RAB' | 'Petty') => {
    const sp = new URLSearchParams();
    ['q', 'status', 'withPO', 'from', 'to', 'sort', 'limit'].forEach((k) => {
      const val = searchParams[k];
      if (typeof val === 'string' && val) sp.set(k, val);
    });
    sp.set('source', v);
    return (
      <Link
        href={`/payables?${sp.toString()}`}
        className={`px-2 py-1 rounded border text-xs ${
          cur === v ? 'bg-slate-900 text-white' : 'bg-white'
        }`}
      >
        {v.toUpperCase()}
      </Link>
    );
  };
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500">Source:</span>
      {chip('all')}
      {chip('PT')}
      {chip('RAB')}
      {chip('Petty')}
    </div>
  );
}

function buildHref(searchParams: SP, patch: Record<string, string | number>) {
  const sp = new URLSearchParams();
  ['q', 'status', 'withPO', 'from', 'to', 'sort', 'limit', 'source'].forEach((k) => {
    const v = searchParams[k];
    if (typeof v === 'string' && v) sp.set(k, v);
  });
  Object.entries(patch).forEach(([k, v]) => sp.set(k, String(v)));
  return `/payables?${sp.toString()}`;
}

export default async function Page({
  searchParams,
}: {
  // Next.js 15: searchParams is a Promise
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;

  const q = typeof sp.q === 'string' ? sp.q : undefined;
  const status = (['unpaid', 'paid', 'all'] as const).includes(String(sp.status) as any)
    ? (sp.status as any)
    : 'unpaid';
  const withPO = (['with', 'without', 'all'] as const).includes(String(sp.withPO) as any)
    ? (sp.withPO as any)
    : 'all';
  const source = (['all', 'PT', 'RAB', 'Petty'] as const).includes(String(sp.source) as any)
    ? (sp.source as any)
    : 'all';
  const from = typeof sp.from === 'string' ? sp.from : undefined;
  const to = typeof sp.to === 'string' ? sp.to : undefined;
  const page = Number(sp.page ?? 1) || 1;
  const limit = Number(sp.limit ?? 20) || 20;
  const sort = ([
    'date_desc',
    'date_asc',
    'due_desc',
    'due_asc',
    'amount_desc',
    'amount_asc',
  ] as const).includes(String(sp.sort) as any)
    ? (sp.sort as any)
    : 'date_desc';

  // NOTE: kalau listPayables belum support 'source', variabel 'source' memang belum dipakai.
  const { rows, count } = await listPayables({ q, status, withPO, from, to, page, limit, sort });

  const totalPages = Math.max(1, Math.ceil(count / limit));

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Payables</h1>
        <Link href="/payables/new" className="px-3 py-2 rounded-md border">
          New Payable
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Tabs searchParams={sp} />
        <POChips searchParams={sp} />
        <SourceChips searchParams={sp} />
        <form className="flex items-center gap-2 ml-auto" action="/payables" method="get">
          {/* keep params */}
          <input type="hidden" name="status" value={status} />
          <input type="hidden" name="withPO" value={withPO} />
          <input type="hidden" name="sort" value={sort} />
          <input type="hidden" name="source" value={source} />
          <input
            type="date"
            name="from"
            defaultValue={from}
            className="border rounded px-2 py-1 text-sm"
          />
          <span className="text-slate-400">→</span>
          <input type="date" name="to" defaultValue={to} className="border rounded px-2 py-1 text-sm" />
          <input
            name="q"
            placeholder="Search invoice/vendor..."
            defaultValue={q}
            className="border rounded px-2 py-1 text-sm"
          />
          <button className="px-3 py-1.5 rounded bg-black text-white text-sm" type="submit">
            Filter
          </button>
        </form>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">Sort:</span>
        {(
          [
            'date_desc',
            'date_asc',
            'due_desc',
            'due_asc',
            'amount_desc',
            'amount_asc',
          ] as const
        ).map((s) => (
          <Link
            key={s}
            href={buildHref(sp, { sort: s })}
            className={`text-xs px-2 py-1 rounded border ${
              sort === s ? 'bg-slate-900 text-white' : 'bg-white'
            }`}
          >
            {s.replace('_', ' ').toUpperCase()}
          </Link>
        ))}
      </div>

      <div className="overflow-x-auto border rounded">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">Invoice</th>
              <th className="p-2 text-left">Vendor</th>
              <th className="p-2 text-left">PO</th>
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-left">Due</th>
              <th className="p-2 text-right">Amount</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.id} className="border-t">
                <td className="p-2">
                  <div className="font-medium">{r.invoice_no}</div>
                  {r.note && <div className="text-xs text-slate-500">{r.note}</div>}
                </td>
                <td className="p-2">{r.vendor_name ?? r.vendor_id}</td>
                <td className="p-2">{r.po_id ?? '-'}</td>
                <td className="p-2">{r.invoice_date}</td>
                <td className="p-2">{r.due_date ?? '-'}</td>
                <td className="p-2 text-right">{fmtIDR(r.amount)}</td>
                <td className="p-2">
                  <StatusBadge s={r.status} />
                </td>
                <td className="p-2">
                  <div className="flex items-center gap-3">
                    <Link href={`/payables/${r.id}`} className="text-blue-600 hover:underline">
                      Detail
                    </Link>
                    {/* <Link
                      href={`/payables/${r.id}#docs`}
                      className="text-indigo-600 hover:underline"
                      aria-label={`Open documents for payable ${r.id}`}
                    >
                      Docs
                    </Link> */}
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td className="p-6 text-center text-slate-500" colSpan={8}>
                  No data
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-slate-500">
          Total: {count} • Page {page} / {totalPages}
        </div>
        <div className="flex items-center gap-2">
          <Link
            aria-disabled={page <= 1}
            className={`px-3 py-1.5 rounded border ${
              page <= 1 ? 'opacity-40 pointer-events-none' : ''
            }`}
            href={buildHref(sp, { page: Math.max(1, page - 1) })}
          >
            Prev
          </Link>
          <Link
            aria-disabled={page >= totalPages}
            className={`px-3 py-1.5 rounded border ${
              page >= totalPages ? 'opacity-40 pointer-events-none' : ''
            }`}
            href={buildHref(sp, { page: Math.min(totalPages, page + 1) })}
          >
            Next
          </Link>
        </div>
      </div>
    </div>
  );
}

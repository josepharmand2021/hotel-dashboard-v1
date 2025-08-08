'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

import {
  LayoutDashboard,
  Building2,
  FileText,
  Package,
  Folder,
  Users,
  Search,
  PiggyBank,
} from 'lucide-react';

import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';

// ===== Static sections (non-Finance)
const primaryItems = [
  { label: 'Overview', href: '/dashboard/overview', icon: LayoutDashboard },
  { label: 'Vendors', href: '/vendors', icon: Building2 },
  { label: 'Purchase Orders', href: '/purchase-orders', icon: FileText },
];

const receivingItems = [
  { label: 'GRN', href: '/receiving/grn' },
  { label: 'Service Acceptance', href: '/receiving/service-acceptance' },
];

// ===== Finance groups
const financeGroups = [
  {
    label: 'Reports',
    links: [
      { label: 'Dashboard', href: '/finance/reports/dashboard' },
      { label: 'Income Report', href: '/finance/reports/income' },
      { label: 'Expenses Report', href: '/finance/reports/expenses' },
    ],
  },
  {
    label: 'Income',
    links: [
      { label: 'Capital Injections', href: '/finance/income/capital-injections' },
      { label: 'RAB Allocations', href: '/finance/income/rab-allocations' },
    ],
  },
  {
    label: 'Expenses',
    links: [{ label: 'All Expenses', href: '/finance/expenses' }],
  },
  {
    label: 'Petty-Cash',
    links: [
      { label: 'Dashboard', href: '/finance/petty-cash/dashboard' },
      { label: 'Topups', href: '/finance/petty-cash/topups' },
      { label: 'Expenses', href: '/finance/petty-cash/expenses' },
    ],
  },
];

export default function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 border-r min-h-screen p-3">
      {/* Brand */}
      <div className="font-semibold text-lg mb-4">Tammu</div>

      {/* Primary */}
      <nav className="space-y-2">
        {primaryItems.map((it) => {
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent',
                pathname === it.href && 'bg-accent'
              )}
            >
              <Icon className="h-4 w-4" />
              {it.label}
            </Link>
          );
        })}

        {/* Receiving (simple group) */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-3">
            <Package className="h-4 w-4" />
            <span className="font-medium">Receiving</span>
          </div>
          <div className="ml-6 space-y-1">
            {receivingItems.map((c) => (
              <Link
                key={c.href}
                href={c.href}
                className={cn(
                  'block rounded-md px-2 py-1.5 text-sm hover:bg-accent',
                  pathname === c.href && 'bg-accent'
                )}
              >
                {c.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Finance (accordion groups) */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-3">
            <PiggyBank className="h-4 w-4" />
            <span className="font-medium">Finance</span>
          </div>

          <Accordion type="multiple" className="ml-2">
            {financeGroups.map((g) => (
              <AccordionItem key={g.label} value={g.label}>
                <AccordionTrigger className="py-1 text-sm">{g.label}</AccordionTrigger>
                <AccordionContent className="space-y-1">
                  {g.links.map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      className={cn(
                        'block rounded-md px-2 py-1.5 text-sm hover:bg-accent ml-4',
                        pathname === l.href && 'bg-accent'
                      )}
                    >
                      {l.label}
                    </Link>
                  ))}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Others */}
        <Link
          href="/documents/uploads"
          className={cn(
            'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent mt-3',
            pathname?.startsWith('/documents') && 'bg-accent'
          )}
        >
          <Folder className="h-4 w-4" />
          Documents
        </Link>

        <Link
          href="/shareholders"
          className={cn(
            'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent',
            pathname?.startsWith('/shareholders') && 'bg-accent'
          )}
        >
          <Users className="h-4 w-4" />
          Shareholders
        </Link>

        <Link
          href="/search"
          className={cn(
            'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent',
            pathname === '/search' && 'bg-accent'
          )}
        >
          <Search className="h-4 w-4" />
          Search
        </Link>
      </nav>
    </aside>
  );
}

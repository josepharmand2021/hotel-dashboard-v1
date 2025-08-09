'use client';

import Image from 'next/image';
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
  ChevronRight,
  BookOpen,
  Wallet,
  ListPlus,
  BarChart3,
} from 'lucide-react';

import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';

const primaryItems = [
  { label: 'Overview', href: '/dashboard/overview', icon: LayoutDashboard },
  { label: 'Vendors', href: '/vendors', icon: Building2 },
  { label: 'Purchase Orders', href: '/purchase-orders', icon: FileText },
];

const receivingItems = [
  { label: 'GRN', href: '/receiving/grn' },
  { label: 'Service Acceptance', href: '/receiving/service-acceptance' },
];

const budgetItems = [
  { label: 'Budget Lines', href: '/budget-lines', icon: Wallet },
  { label: 'Budget Report', href: '/reports/budgets', icon: BarChart3 },
];

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
];

const mastersItems = [
  { label: 'Categories', href: '/masters/categories' },
  { label: 'Subcategories', href: '/masters/subcategories' },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + '/');
}

function NavItem({
  href, label, icon: Icon, active, depth = 0,
}: {
  href: string;
  label: string;
  icon?: React.ComponentType<any>;
  active: boolean;
  depth?: number;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'group flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors',
        active
          ? 'bg-accent/60 text-foreground ring-1 ring-border'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
      )}
      style={{ paddingLeft: 8 + depth * 12 }}
    >
      {Icon ? <Icon className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 opacity-60" />}
      <span className="truncate">{label}</span>
    </Link>
  );
}

export default function AppSidebar() {
  const pathname = usePathname();

  const openFinance = financeGroups
    .filter((g) => g.links.some((l) => isActive(pathname, l.href)))
    .map((g) => g.label);

  return (
    <aside className="w-64 shrink-0 border-r bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/40">
      {/* Brand (logo) */}
      <div className="sticky top-0 z-10 border-b bg-background/80 px-3 py-3">
        <Link href="/dashboard/overview" className="flex items-center gap-2">
          {/* Taruh logo di /public/brand/logo.png atau ganti path di bawah */}
          <span className="font-semibold tracking-tight">IAK Dashboard</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="p-3 space-y-4 overflow-y-auto max-h-[calc(100vh-56px)]">
        {/* Primary */}
        <div className="space-y-1">
          <div className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80">
            Primary
          </div>
          {primaryItems.map((it) => (
            <NavItem
              key={it.href}
              href={it.href}
              label={it.label}
              icon={it.icon}
              active={isActive(pathname, it.href)}
            />
          ))}
        </div>

        {/* Receiving */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 px-2 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80">
            <Package className="h-3.5 w-3.5" />
            Receiving
          </div>
          <div className="space-y-1">
            {receivingItems.map((c) => (
              <NavItem
                key={c.href}
                href={c.href}
                label={c.label}
                active={isActive(pathname, c.href)}
                depth={1}
              />
            ))}
          </div>
        </div>

        {/* Budget */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 px-2 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80">
            <Wallet className="h-3.5 w-3.5" />
            Budget
          </div>
          <div className="space-y-1">
            {budgetItems.map((b) => (
              <NavItem
                key={b.href}
                href={b.href}
                label={b.label}
                icon={b.icon}
                active={isActive(pathname, b.href)}
                depth={1}
              />
            ))}
          </div>
        </div>

        {/* Finance */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 px-2 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80">
            <PiggyBank className="h-3.5 w-3.5" />
            Finance
          </div>
          <Accordion type="multiple" defaultValue={openFinance} className="ml-1 space-y-1">
            {financeGroups.map((g) => (
              <AccordionItem key={g.label} value={g.label} className="rounded-lg border">
                <AccordionTrigger className="px-2 py-2 text-sm hover:no-underline">
                  {g.label}
                </AccordionTrigger>
                <AccordionContent className="space-y-1 pb-2">
                  {g.links.map((l) => (
                    <NavItem
                      key={l.href}
                      href={l.href}
                      label={l.label}
                      active={isActive(pathname, l.href)}
                      depth={2}
                    />
                  ))}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Masters */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 px-2 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80">
            <BookOpen className="h-3.5 w-3.5" />
            Masters
          </div>
          <div className="space-y-1">
            {mastersItems.map((m) => (
              <NavItem
                key={m.href}
                href={m.href}
                label={m.label}
                active={isActive(pathname, m.href)}
                depth={1}
              />
            ))}
          </div>
        </div>

        {/* Others */}
        <div className="space-y-1">
          <div className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80">
            Others
          </div>
          <NavItem
            href="/documents/uploads"
            label="Documents"
            icon={Folder}
            active={pathname?.startsWith('/documents') ?? false}
          />
          <NavItem
            href="/shareholders"
            label="Shareholders"
            icon={Users}
            active={pathname?.startsWith('/shareholders') ?? false}
          />
          <NavItem
            href="/search"
            label="Search"
            icon={Search}
            active={pathname === '/search'}
          />
        </div>
      </nav>
    </aside>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Menu, ChevronLeft, ChevronRight, LayoutDashboard, FileText,
  PackageCheck, Wallet, BarChart3, Settings2, Users as UsersIcon,
} from 'lucide-react';

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

type NavLink = { label: string; href: string };
type NavGroup = {
  key: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  href?: string;
  items?: NavLink[];
};

const BASE_NAV: NavGroup[] = [
  { key: 'dashboard', label: 'Overview', icon: LayoutDashboard, href: '/dashboard/overview' },
  {
    key: 'purchase-orders',
    label: 'Purchase Orders',
    icon: FileText,
    items: [
      { label: 'List', href: '/purchase-orders' },
      { label: 'New', href: '/purchase-orders/new' }, // ← akan difilter utk viewer
    ],
  },
  {
    key: 'receiving',
    label: 'Receiving',
    icon: PackageCheck,
    items: [{ label: 'GRN', href: '/receiving/grn' }],
  },
  {
    key: 'finance',
    label: 'Finance',
    icon: Wallet,
    items: [
      { label: 'Capital Injections', href: '/finance/capital-injections' },
      { label: 'Expenses', href: '/finance/expenses' },
      { label: 'Petty Cash', href: '/finance/petty-cash' },
      { label: 'RAB Allocations', href: '/finance/rab-allocations' },
    ],
  },
  {
    key: 'settings',
    label: 'Settings',
    icon: Settings2,
    items: [
      { label: 'Bank Accounts', href: '/settings/finance/bank-accounts' },
      { label: 'Categories', href: '/masters/categories' },
      { label: 'Subcategories', href: '/masters/subcategories' },
      { label: 'Vendors', href: '/vendors' },
      { label: 'Shareholders', href: '/shareholders' },
    ],
  },
  {
    key: 'reports',
    label: 'Budgets',
    icon: BarChart3,
    items: [
      { label: 'Budgets', href: '/reports/budgets' },
      { label: 'Budget Lines', href: '/budget-lines' },
    ],
  },
];

function isActive(href: string, pathname: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}

function SidebarLink({
  href, label, icon: Icon, active, collapsed,
}: {
  href: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  active?: boolean;
  collapsed: boolean;
}) {
  const content = (
    <div
      className={cn(
        'group flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition',
        active
          ? 'bg-accent text-accent-foreground font-medium'
          : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'
      )}
    >
      {Icon ? <Icon className={cn('h-5 w-5', collapsed ? 'mx-auto' : '')} /> : null}
      {!collapsed && <span className="truncate">{label}</span>}
    </div>
  );

  if (collapsed) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href={href}>{content}</Link>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">{label}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  return <Link href={href}>{content}</Link>;
}

export default function AppSidebar({
  className,
  isAdmin = false,  // admin OR superadmin
  isSuper = false,  // superadmin
}: {
  className?: string;
  isAdmin?: boolean;
  isSuper?: boolean;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const canWrite = isAdmin || isSuper;

  const NAV = useMemo<NavGroup[]>(() => {
    const out: NavGroup[] = [];

    for (const g of BASE_NAV) {
      // Hide Settings untuk viewer; tambah Security utk super
      if (g.key === 'settings') {
        if (!isAdmin) continue;
        const items = [...(g.items ?? [])];
        if (isSuper) items.unshift({ label: 'Security', href: '/settings/security' });
        out.push({ ...g, items });
        continue;
      }

      // Filter item "New" pada Purchase Orders untuk viewer
      if (g.key === 'purchase-orders') {
        const items = canWrite
          ? (g.items ?? [])
          : (g.items ?? []).filter(it => it.label.toLowerCase() !== 'new');
        out.push({ ...g, items });
        continue;
      }

      out.push(g);
    }

    // Users & Roles (top-level) hanya admin/super
    if (isAdmin) {
      out.splice(1, 0, { key: 'users', label: 'Users & Roles', icon: UsersIcon, href: '/users' });
    }

    return out;
  }, [isAdmin, isSuper, canWrite]);

  const defaultOpen = useMemo(() => {
    const open: string[] = [];
    for (const g of NAV) {
      if (!g.items) continue;
      if (g.items.some((i) => isActive(i.href, pathname))) open.push(g.key);
    }
    return open.length ? open : ['finance'];
  }, [pathname, NAV]);

  return (
    <aside
      className={cn(
        'sticky top-0 h-[100dvh] border-r bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/50',
        collapsed ? 'w-[74px]' : 'w-72',
        'hidden md:flex flex-col',
        className
      )}
    >
      {/* Brand / Toggle */}
      <div className="flex items-center justify-between gap-2 px-3 py-3">
        <div className={cn('flex items-center gap-2', collapsed && 'justify-center w-full')}>
          <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-semibold">T</div>
          {!collapsed && (
            <div className="leading-tight">
              <div className="font-semibold">Tammu Construction</div>
              <div className="text-xs text-muted-foreground">Admin Dashboard</div>
            </div>
          )}
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="shrink-0"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </Button>
      </div>
      <Separator />

      {/* Nav (scrollable) */}
      <ScrollArea className="flex-1 px-2 py-3">
        <nav className="space-y-1 pb-2">
          {NAV.map((group) => {
            const Icon = group.icon;
            if (group.href && !group.items) {
              const active = isActive(group.href, pathname);
              return (
                <SidebarLink
                  key={group.key}
                  href={group.href}
                  label={group.label}
                  icon={Icon}
                  active={active}
                  collapsed={collapsed}
                />
              );
            }

            const anyActive = group.items?.some((i) => isActive(i.href, pathname));
            return (
              <Accordion key={group.key} type="multiple" defaultValue={defaultOpen} className="w-full">
                <AccordionItem value={group.key} className="border-none">
                  <AccordionTrigger
                    className={cn('rounded-xl px-3 py-2 hover:no-underline', collapsed && 'justify-center')}
                  >
                    <div className={cn('flex items-center gap-2', collapsed && 'justify-center')}>
                      {Icon ? <Icon className="h-5 w-5" /> : null}
                      {!collapsed && (
                        <span className={cn('text-sm', anyActive && 'text-foreground font-medium')}>
                          {group.label}
                        </span>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="mt-1 space-y-1 pl-[38px] pr-2">
                      {group.items?.map((item) => (
                        <SidebarLink
                          key={item.href}
                          href={item.href}
                          label={item.label}
                          active={isActive(item.href, pathname)}
                          collapsed={collapsed}
                        />
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            );
          })}
        </nav>
      </ScrollArea>
    </aside>
  );
}

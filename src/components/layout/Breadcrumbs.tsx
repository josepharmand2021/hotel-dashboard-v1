'use client';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

type Crumb = { label: string; href?: string; current?: boolean };

interface BreadcrumbsProps {
  items: Crumb[];
  className?: string; // ⬅ Tambahkan ini
}

export default function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav className={className}>
      <Breadcrumb>
        <BreadcrumbList>
          {items.map((it, i) => (
            <div key={i} className="flex items-center">
              <BreadcrumbItem>
                {it.current || !it.href ? (
                  <BreadcrumbPage>{it.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={it.href}>{it.label}</BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {i < items.length - 1 && <BreadcrumbSeparator />}
            </div>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </nav>
  );
}


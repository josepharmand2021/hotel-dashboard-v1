'use client';
import Link from 'next/link';

export default function AppTopbar() {
  return (
    <header className="h-12 border-b flex items-center justify-between px-4">
      <div className="font-medium">Dashboard</div>
      <Link href="/search" className="text-sm underline">Search</Link>
    </header>
  );
}

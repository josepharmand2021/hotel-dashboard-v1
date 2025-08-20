export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-2xl font-semibold">404 – Not Found</h1>
      <p className="mt-1 text-muted-foreground">Halaman tidak ditemukan.</p>
      <div className="mt-6">
        <Link href="/dashboard/overview" className="underline">Kembali ke dashboard</Link>
      </div>
    </div>
  );
}
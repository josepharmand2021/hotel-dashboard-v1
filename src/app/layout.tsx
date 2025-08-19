// app/layout.tsx
'use client';

import type { ReactNode } from 'react';
import { Toaster } from 'sonner';
import './globals.css';
import { AclProvider } from '@/lib/supabase/acl'; // ⬅️ pastikan path sesuai

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background">
        <AclProvider>
          {children}
        </AclProvider>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}

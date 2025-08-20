'use client';

import { Toaster } from 'sonner';
import { AclProvider } from '@/lib/supabase/acl';

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <AclProvider>
      {children}
      <Toaster richColors position="top-center" />
    </AclProvider>
  );
}

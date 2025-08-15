// app/layout.tsx
import './globals.css';
import AppSidebar from '@/components/layout/AppSidebar';
import AppTopbar from '@/components/layout/AppTopbar';
import { Toaster } from 'sonner';
import { AclProvider } from '@/lib/supabase/acl'; // ⬅️ tambah ini

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <AclProvider> {/* ⬅️ bungkus seluruh UI */}
          <div className="flex">
            <AppSidebar />
            <div className="flex-1">
              <AppTopbar />
              <main className="p-4">{children}</main>
            </div>
          </div>
          <Toaster />
        </AclProvider>
      </body>
    </html>
  );
}
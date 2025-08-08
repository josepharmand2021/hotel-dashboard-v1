import './globals.css';
import AppSidebar from '@/components/layout/AppSidebar';
import AppTopbar from '@/components/layout/AppTopbar';
import { Toaster } from 'sonner';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <div className="flex">
          <AppSidebar />
          <div className="flex-1">
            <AppTopbar />
            <main className="p-4">{children}</main>
          </div>
        </div>
        <Toaster />
      </body>
    </html>
  );
}

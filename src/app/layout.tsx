// app/layout.tsx
import type { ReactNode } from 'react';
import './globals.css';

import ClientProviders from './ClientProviders';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
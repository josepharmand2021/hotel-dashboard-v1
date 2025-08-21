// app/layout.tsx
import type { ReactNode } from 'react';
import './globals.css';
import ClientProviders from './ClientProviders';

// Tetap Node.js kalau kamu pakai Supabase server/Node APIs.
export const runtime = 'nodejs';
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* penting untuk mobile */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* opsional, biar sistem bisa pakai tema */}
        <meta name="color-scheme" content="light dark" />
        {/* <link rel="icon" href="/favicon.ico" /> */}
      </head>
      {/* cegah scroll horizontal global */}
      <body className="min-h-screen bg-background antialiased overflow-x-hidden">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
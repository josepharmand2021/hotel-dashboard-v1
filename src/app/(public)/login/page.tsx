import { Suspense } from 'react';
import LoginPage from './LoginClient';

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen grid place-items-center">Loading…</div>}>
      <LoginPage />
    </Suspense>
  );
}

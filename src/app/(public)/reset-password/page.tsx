import { Suspense } from 'react';
import ResetPasswordPage from './ResetPasswordClient';

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen grid place-items-center">Loading…</div>}>
      <ResetPasswordPage />
    </Suspense>
  );
}

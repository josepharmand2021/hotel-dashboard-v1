import { Suspense } from 'react';
import ForgotPasswordPage from './ForgotPasswordClient';

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen grid place-items-center">Loading…</div>}>
      <ForgotPasswordPage />
    </Suspense>
  );
}

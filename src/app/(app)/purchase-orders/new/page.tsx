export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import NewPOClient from './NewPOClient';

export default function Page() {
  return <NewPOClient />;
}

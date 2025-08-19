// app/403/page.tsx
export default function Forbidden() {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">403 — Forbidden</h1>
      <p className="text-sm text-muted-foreground">You don’t have access to this page.</p>
    </div>
  );
}

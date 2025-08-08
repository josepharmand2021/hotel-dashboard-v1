export default function OverviewPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Overview</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 border rounded-xl">POs This Month</div>
        <div className="p-4 border rounded-xl">Expenses This Month</div>
        <div className="p-4 border rounded-xl">Petty Cash Balance</div>
      </div>
    </div>
  );
}

"use client";

import ShareholdersTable from "@/components/shareholders/ShareholdersTable";
import Breadcrumbs from "@/components/layout/Breadcrumbs"; // optional: if you have one

export default function ShareholdersListPage() {
  return (
    <div className="space-y-6">
      {/* optional breadcrumbs */}
      {typeof Breadcrumbs !== "undefined" && (
        // @ts-ignore
        <Breadcrumbs items={[{ label: "Finance", href: "/dashboard/finance" }, { label: "Shareholders" }]} />
      )}
      <ShareholdersTable />
    </div>
  );
}

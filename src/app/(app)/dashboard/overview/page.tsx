// src/app/(app)/dashboard/page.tsx
'use client';

import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { RefreshCcw } from 'lucide-react';
import FinancialTab from '@/components/dashboard/FinancialTab';
import SahamTab from '@/components/dashboard/SahamTab';

export default function DashboardPage() {
  const [tab, setTab] = useState<'financial'|'po'|'saham'>('financial');
  const [refreshTick, setRefreshTick] = useState(0);

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <Button variant="outline" size="sm" onClick={() => setRefreshTick(t => t + 1)}>
          <RefreshCcw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v)=>setTab(v as any)} className="space-y-4">
        <TabsList>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="saham">Saham</TabsTrigger>
          <TabsTrigger value="po">PO Tracking</TabsTrigger>
        </TabsList>

        <TabsContent value="financial">
          <FinancialTab refreshKey={refreshTick} />
        </TabsContent>

        <TabsContent value="saham">
          <SahamTab refreshKey={refreshTick} />
        </TabsContent>

        <TabsContent value="po">
          <div className="text-sm text-muted-foreground">PO Tracking menyusul.</div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

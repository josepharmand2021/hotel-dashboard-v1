'use client';

import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { RefreshCcw } from 'lucide-react';
import FinancialTab from '@/components/dashboard/FinancialTab';

// ...imports lain
import SahamTab from '@/components/dashboard/SahamTab';

export default function DashboardPage() {
  const [period, setPeriod] = useState<'MTD'|'QTD'|'YTD'>('MTD');
  const [tab, setTab] = useState<'financial'|'po'|'saham'>('financial');
  const [refreshTick, setRefreshTick] = useState(0);

  return (
    <div className="p-4 space-y-6">
      {/* header sama seperti sebelumnya */}

      <Tabs value={tab} onValueChange={(v)=>setTab(v as any)} className="space-y-4">
        <TabsList>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="saham">Saham</TabsTrigger>
          <TabsTrigger value="po">PO Tracking</TabsTrigger>
        </TabsList>

        <TabsContent value="financial"><FinancialTab period={period} refreshKey={refreshTick} /></TabsContent>

        <TabsContent value="saham">
          <SahamTab refreshKey={refreshTick} />
        </TabsContent>

        <TabsContent value="po"><div className="text-sm text-muted-foreground">PO Tracking menyusul.</div></TabsContent>
      </Tabs>
    </div>
  );
}

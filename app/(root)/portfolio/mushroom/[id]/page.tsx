"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LayoutDashboard, BarChart3, Share2, Search, Layers } from "lucide-react";
import Overview from "./tabs/overview";
import Chart from "./tabs/chart";
import MushroomNetwork from "./tabs/network";
import { Analysis } from "./tabs/analysis";

type Props = { params: { id: string } };

export default function Page({ params }: Props) {
  const [activeTab, setActiveTab] = useState("overview");
  const { id } = params;

  return (
    <div className="wrapper p-4">
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-5 gap-2 mb-6 w-full">
          <TabsTrigger value="overview" className="flex items-center justify-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden md:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="chart" className="flex items-center justify-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden md:inline">Chart</span>
          </TabsTrigger>
          <TabsTrigger value="network" className="flex items-center justify-center gap-2">
            <Share2 className="h-4 w-4" />
            <span className="hidden md:inline">Network</span>
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center justify-center gap-2">
            <Search className="h-4 w-4" />
            <span className="hidden md:inline">Analysis</span>
          </TabsTrigger>
          <TabsTrigger value="similar" className="flex items-center justify-center gap-2" disabled>
            <Layers className="h-4 w-4" />
            <span className="hidden md:inline">Similar</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Overview id={id}/>
        </TabsContent>
        <TabsContent value="chart">
          <Chart id={id} />
        </TabsContent>
        <TabsContent value="network">
          <MushroomNetwork />
        </TabsContent>
        <TabsContent value="analysis">
          <Analysis />
        </TabsContent>
      </Tabs>
    </div>
  );
}

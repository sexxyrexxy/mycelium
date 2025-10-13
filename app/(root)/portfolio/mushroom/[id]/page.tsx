"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LayoutDashboard, Share2, Search, Sparkles, Waves } from "lucide-react";
import Overview from "./tabs/overview";
import SignalRiverTab from "./tabs/river";
import MushroomNetwork from "./tabs/network";
import MushroomCaveVisualization from "./tabs/cavern";
import { Analysis } from "./tabs/analysis";
import { useParams } from "next/navigation";

export default function Page() {
  const [activeTab, setActiveTab] = useState("overview");
  const { id } = useParams<{ id: string }>();

  const triggerBaseClass =
    "flex basis-[72px] flex-shrink-0 flex-col items-center gap-1 rounded-lg px-3 py-2 text-xs transition sm:flex-1 sm:basis-auto sm:flex-row sm:items-center sm:justify-center sm:gap-2 sm:text-sm";

  return (
    <div className="wrapper p-4">
      <Tabs
        defaultValue="overview"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="mb-6 flex w-full gap-1 overflow-x-auto rounded-xl bg-muted/60 p-1.5 shadow-inner supports-[backdrop-filter]:bg-muted/40 md:grid md:grid-cols-5 md:gap-2 md:overflow-visible">
          <TabsTrigger value="overview" className={triggerBaseClass}>
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden font-medium md:inline">Overview</span>
          </TabsTrigger>

          <TabsTrigger value="river" className={triggerBaseClass}>
            <Waves className="h-4 w-4" />
            <span className="hidden font-medium md:inline">Signal River</span>
          </TabsTrigger>

          <TabsTrigger value="network" className={triggerBaseClass}>
            <Share2 className="h-4 w-4" />
            <span className="hidden font-medium md:inline">Network</span>
          </TabsTrigger>

          <TabsTrigger value="cavern" className={triggerBaseClass}>
            <Sparkles className="h-4 w-4" />
            <span className="hidden font-medium md:inline">Pulse Cavern</span>
          </TabsTrigger>

          <TabsTrigger value="analysis" className={triggerBaseClass}>
            <Search className="h-4 w-4" />
            <span className="hidden font-medium md:inline">Analysis</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Overview />
        </TabsContent>
        <TabsContent value="river">
          <SignalRiverTab />
        </TabsContent>
        <TabsContent value="network">
          <MushroomNetwork />
        </TabsContent>
        <TabsContent value="cavern">
          <MushroomCaveVisualization />
        </TabsContent>
        <TabsContent value="analysis">
          <Analysis />
        </TabsContent>
      </Tabs>
    </div>
  );
}

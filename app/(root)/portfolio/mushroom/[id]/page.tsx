"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  LayoutDashboard,
  Share2,
  Search,
  Waves,
} from "lucide-react";
import Overview from "./tabs/overview";
import SignalRiverTab from "./tabs/river";
import MushroomNetwork from "./tabs/network";
import MushroomCaveVisualization from "./tabs/cavern";
import { Analysis } from "./tabs/analysis";
import { useParams } from "next/navigation";

export default function Page() {
  const [activeTab, setActiveTab] = useState("overview");
  const { id } = useParams<{ id: string }>();

  return (
    <div className="wrapper p-4">
      <Tabs
        defaultValue="overview"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-6">
          <TabsTrigger value="overview" className="flex items-center justify-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden md:inline">Overview</span>
          </TabsTrigger>

          <TabsTrigger value="river" className="flex items-center justify-center gap-2">
            <Waves className="h-4 w-4" />
            <span className="hidden md:inline">Signal River</span>
          </TabsTrigger>

          <TabsTrigger value="network" className="flex items-center justify-center gap-2">
            <Share2 className="h-4 w-4" />
            <span className="hidden md:inline">Network</span>
          </TabsTrigger>

          <TabsTrigger value="cavern" className="flex items-center justify-center gap-2">
            <Share2 className="h-4 w-4" />
            <span className="hidden md:inline">Pulse Cavern</span>
          </TabsTrigger>

          <TabsTrigger value="analysis" className="flex items-center justify-center gap-2">
            <Search className="h-4 w-4" />
            <span className="hidden md:inline">Analysis</span>
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

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  LayoutDashboard,
  BarChart3,
  Share2,
  Search,
  Layers,
} from "lucide-react";
import React from "react";
import Overview from "./tabs/overview";

export default function Page() {
  return (
    <div className="wrapper p-4">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid grid-cols-5 gap-2 mb-6 w-full">
          <TabsTrigger
            value="overview"
            className="flex items-center justify-center gap-2"
          >
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden md:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger
            value="chart"
            className="flex items-center justify-center gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            <span className="hidden md:inline">Chart</span>
          </TabsTrigger>
          <TabsTrigger
            value="network"
            className="flex items-center justify-center gap-2"
          >
            <Share2 className="h-4 w-4" />
            <span className="hidden md:inline">Network</span>
          </TabsTrigger>
          <TabsTrigger
            value="analysis"
            className="flex items-center justify-center gap-2"
          >
            <Search className="h-4 w-4" />
            <span className="hidden md:inline">Analysis</span>
          </TabsTrigger>
          <TabsTrigger
            value="similar"
            className="flex items-center justify-center gap-2"
          >
            <Layers className="h-4 w-4" />
            <span className="hidden md:inline">Similar</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Overview />
        </TabsContent>
      </Tabs>
    </div>
  );
}

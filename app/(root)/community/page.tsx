// app/community/page.tsx (or your Markets page)
"use client";

import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CommunityGrid } from "@/components/community/CommunityGrid";
import type { MushroomKind } from "@/components/community/types";
import { sampleProfiles } from "@/public/sampleProfiles";

// Build tabs from your species list + "All"
const categories: ("All" | MushroomKind)[] = [
  "All",
  "Oyster",
  "Shiitake",
  "King Stropharia",
  "Enokitake",
  "King Oyster",
  "Lion’s Mane",
  "Pink Oyster",
  "Turkey Tail",
  "Wood Blewit",
];

export default function Community() {
  return (
    <div className="p-6">
      <Tabs defaultValue="All" className="w-full">
        {/* Tabs row */}
        <TabsList className="grid w-full grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 mb-6">
          {categories.map((c) => (
            <TabsTrigger key={c} value={c}>
              {c}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Content for each tab */}
        {categories.map((c) => (
          <TabsContent key={c} value={c} className="mt-0">
            <CommunityGrid
              profiles={sampleProfiles}
              activeCategory={c === "All" ? "All" : (c as MushroomKind)}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

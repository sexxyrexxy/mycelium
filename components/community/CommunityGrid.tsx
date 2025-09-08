"use client";

import React from "react";
import ProfileCard from "./ProfileCard";
import { MushroomProfile, MushroomKind } from "./types";

export function CommunityGrid({
  profiles,
  activeCategory = "All",
}: {
  profiles: MushroomProfile[];
  activeCategory?: "All" | MushroomKind;
}) {
  const filtered =
    activeCategory === "All"
      ? profiles
      : profiles.filter((p) => p.kind === activeCategory);

  if (filtered.length === 0) {
    return (
      <div className="grid place-items-center rounded-2xl border border-dashed border-white/10 py-20 text-center text-neutral-400">
        No profiles yet for <span className="mx-1 font-semibold">{activeCategory}</span>. Check back soon 🍄
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {filtered.map((p) => (
        <ProfileCard key={p.id} p={p} />
      ))}
    </div>
  );
}

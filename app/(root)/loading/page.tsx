"use client";

import React from "react";
import { MushroomSprite } from "@/components/portfolio/PixelMushrooms";

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#faf9f6]">
      {/* Mushrooms */}
      <div className="flex gap-8 mb-6">
        <div className="animate-mushroom animation-delay-0">
          <MushroomSprite species="flyAgaric" size={120} duration={2} />
        </div>
        <div className="animate-mushroom animation-delay-200">
          <MushroomSprite species="shiitake" size={120} duration={2} />
        </div>
        <div className="animate-mushroom animation-delay-400">
          <MushroomSprite species="oyster" size={120} duration={2} />
        </div>
      </div>

      {/* Loading text with dots */}
      <div className="flex text-2xl font-semibold text-gray-700">
        <span>Loading</span>
        <span className="animate-dot animation-delay-0">.</span>
        <span className="animate-dot animation-delay-200">.</span>
        <span className="animate-dot animation-delay-400">.</span>
      </div>
    </div>
  );
}

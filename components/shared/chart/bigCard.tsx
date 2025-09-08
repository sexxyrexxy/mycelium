"use client";

import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface BigCardProps {
  name: string;
  image: string;
  returnPct: number;
  copiers: number;
  featured?: boolean;
}

export function BigCard({
  name,
  image,
  returnPct,
  copiers,
  featured = false,
}: BigCardProps) {
  return (
    <Card className="relative w-80 rounded-xl shadow-md overflow-hidden bg-gradient-to-b from-gray-800 to-gray-900 text-white">
      {/* Featured badge */}
      {featured && (
        <div className="absolute top-3 right-3 bg-gray-700 text-gray-100 text-xs px-3 py-1 rounded-full">
          Featured
        </div>
      )}

      <CardContent className="flex flex-col items-center pt-12 pb-6">
        {/* Profile image */}
        <Image
          src={image}
          alt={name}
          width={80}
          height={80}
          className="rounded-md mb-4 shadow"
        />

        {/* Name */}
        <h3 className="text-lg font-semibold">{name}</h3>

        {/* Return */}
        <p className="text-green-400 text-xl font-bold mt-2">
          {returnPct.toFixed(2)}%
        </p>
        <p className="text-sm text-gray-400">Return (12M)</p>

        {/* Copiers */}
        <p className="mt-4 text-gray-200 text-lg font-semibold">{copiers}</p>
        <p className="text-sm text-gray-400">Copiers</p>
        <Button asChild variant="ghost">
          <Link href="/portfolio/mushroom">View</Link>
        </Button>
      </CardContent>

      {/* Decorative background chart-like shape */}
      <div className="absolute inset-0 pointer-events-none">
        <svg
          viewBox="0 0 400 120"
          className="absolute bottom-0 w-full h-24 text-gray-700 opacity-40"
          preserveAspectRatio="none"
        >
          <path
            d="M0 80 C100 20, 200 120, 400 60 L400 120 L0 120 Z"
            fill="currentColor"
          />
        </svg>
      </div>
    </Card>
  );
}

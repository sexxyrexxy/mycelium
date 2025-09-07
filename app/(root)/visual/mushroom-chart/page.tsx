"use client";

import React, { useEffect, useState } from "react";
import SimpleChart, { Point } from "@/components/portfolio/SimpleChart";
import type { Time } from "lightweight-charts";
import Link from "next/link";
import { usePathname } from "next/navigation";

// HH:MM:SS | seconds | ms | ISO → Time
function toTime(x: string | number): Time {
  if (typeof x === "number" && Number.isFinite(x))
    return Math.floor(x) as unknown as Time;
  const s = String(x).trim();

  // HH:MM:SS
  const m = s.match(/^(\d+):(\d{2}):(\d{2})(?:\.\d+)?$/);
  if (m) {
    const h = +m[1],
      mm = +m[2],
      ss = +m[3];
    return (h * 3600 + mm * 60 + ss) as unknown as Time;
  }

  // numeric seconds or ms
  const n = Number(s);
  if (Number.isFinite(n)) {
    return (n >= 1e11
      ? Math.floor(n / 1000)
      : Math.floor(n)) as unknown as Time;
  }

  // ISO date
  const ts = Date.parse(s);
  return Math.floor((Number.isNaN(ts) ? 0 : ts) / 1000) as unknown as Time;
}

// Robust two-column CSV: timestamp,value (ignores blank/NaN rows)
function parseTwoColCSV(text: string): Point[] {
  const lines = text.replace(/\r/g, "\n").split("\n").filter(Boolean);
  if (lines.length < 2) return [];

  const out: Point[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const [tRaw, vRaw] = line.split(","); // your file is simple comma-only
    if (!tRaw || !vRaw) continue;

    const t = toTime(tRaw);
    const v = Number(String(vRaw).trim());
    if (!Number.isFinite(v)) continue;

    out.push({ time: t, value: v });
  }
  return out;
}

export default function VisualizationPage() {
  const [data, setData] = useState<Point[]>([]);
  const pathname = usePathname();


  useEffect(() => {
    // cache-bust during dev in case the browser caches the CSV
    fetch(`/MushroomData1.csv?dev=${Date.now()}`)
      .then((r) => r.text())
      .then((txt) => {
        const pts = parseTwoColCSV(txt);
        console.log(
          "[page] loaded rows:",
          pts.length,
          "first:",
          pts[0],
          "last:",
          pts[pts.length - 1]
        );
        setData(pts);
      })
      .catch((e) => console.error("CSV fetch/parse error", e));
  }, []);

  return (
  <main style={{ paddingTop: 16, paddingBottom: 16 }}>
<div className="flex gap-6 mb-6 pl-4">
  <Link href="/visual/mushroom-chart">
        <button
          className={`px-4 py-2 border rounded-lg transition ${
            pathname === "/visual/mushroom-chart"
              ? "bg-blue-500 text-white border-blue-500"
              : "bg-white text-black border-gray-300 hover:bg-gray-100"
          }`}
        >
          Mushroom Chart
        </button>
  </Link>
  <Link href="/visual/new-page">
    <button className="px-4 py-2 border rounded-lg bg-white hover:bg-gray-100 transition">
      New Chart Page
    </button>
  </Link>
</div>
    <h1 style={{ marginBottom: 20 }}>Mushroom Signal</h1>
    <SimpleChart data={data} height={420} />
  </main>
  );
}

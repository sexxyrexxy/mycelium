"use client";

import React, { useEffect, useState } from "react";
import SimpleChart, { Point } from "@/components/portfolio/SimpleChart";
import type { Time } from "lightweight-charts";
import { useSearchParams } from "next/navigation";

// HH:MM:SS | seconds | ms | ISO → Time
function toTime(x: string | number): Time {
  if (typeof x === "number" && Number.isFinite(x))
    return Math.floor(x) as unknown as Time;
  const s = String(x).trim();

  // HH:MM:SS(.ms)
  const m = s.match(/^(\d+):(\d{2}):(\d{2})(?:\.\d+)?$/);
  if (m) {
    const h = +m[1], mm = +m[2], ss = +m[3];
    return (h * 3600 + mm * 60 + ss) as unknown as Time;
  }

  // numeric seconds or ms
  const n = Number(s);
  if (Number.isFinite(n)) {
    return (n >= 1e11 ? Math.floor(n / 1000) : Math.floor(n)) as unknown as Time;
  }

  // ISO date
  const ts = Date.parse(s);
  return Math.floor((Number.isNaN(ts) ? 0 : ts) / 1000) as unknown as Time;
}


export default function VisualizationPage({ id }: { id: string }) {
  const [data, setData] = useState<Point[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/mushroom/${encodeURIComponent(id)}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();

        // Support both shapes:
        // A) { mushId, signals: [{ timestamp, signal }] }
        // B) rows: [{ Timestamp: "HH:MM:SS", Signal_mV }]
        let points: Point[] = [];

        if (Array.isArray(json?.signals)) {
          points = json.signals
            .map((s: any) => ({ time: toTime(s.timestamp), value: Number(s.signal) }))
            .filter((p: Point) => Number.isFinite(p.value));
        } else if (Array.isArray(json)) {
          // some older routes return rows directly
          points = json
            .map((r: any) => ({
              time: toTime((r?.Timestamp?.value ?? r?.Timestamp) as any),
              value: Number(r?.Signal_mV ?? r?.value),
            }))
            .filter((p: Point) => Number.isFinite(p.value));
        } else if (Array.isArray(json?.rows)) {
          points = json.rows
            .map((r: any) => ({
              time: toTime((r?.Timestamp?.value ?? r?.Timestamp) as any),
              value: Number(r?.Signal_mV ?? r?.value),
            }))
            .filter((p: Point) => Number.isFinite(p.value));
        }

        // (SimpleChart sorts internally, but sorting here is fine too)
        points.sort((a, b) => Number(a.time) - Number(b.time));

        console.log("[page] fetched points:", points.length, "sample:", points[0], points.at(-1));
        setData(points);
      } catch (e) {
        console.error("API fetch/parse error:", e);
        setData([]);
      }
    })();
  }, [id]);

  return (
    <main style={{ padding: 16 }}>
      <h1 style={{ marginBottom: 12 }}>Mushroom Signal</h1>
      <SimpleChart data={data} height={420} />
    </main>
  );
}

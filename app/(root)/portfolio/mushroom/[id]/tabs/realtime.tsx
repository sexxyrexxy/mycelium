"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import SimpleChart, { Point } from "@/components/portfolio/SimpleChart";
import type { Time } from "lightweight-charts";
import {
  useMushroomSignals,
  SignalDatum,
} from "@/hooks/useMushroomSignals";
import { Skeleton } from "@/components/ui/skeleton";

const UPDATE_INTERVAL_MS = 3000;
const WINDOW_POINTS = 480;
const SEED_POINTS = 150;

export default function RealTimeTab() {
  const { id } = useParams<{ id: string }>();
  const mushId = id ?? "";

  const {
    rangeData,
    loading,
    error,
    selectedRange,
    setSelectedRange,
  } = useMushroomSignals(mushId);

  const [liveSeries, setLiveSeries] = useState<SignalDatum[]>([]);
  const [progress, setProgress] = useState(0);
  const pointerRef = useRef(0);

  // Force real-time view to stay on the 4h slice for stability.
  useEffect(() => {
    if (selectedRange !== "4h") {
      setSelectedRange("4h");
    }
  }, [selectedRange, setSelectedRange]);

  // Seed chart with a historical window.
  useEffect(() => {
    if (!rangeData.length) {
      setLiveSeries([]);
      setProgress(0);
      pointerRef.current = 0;
      return;
    }

    const seed = Math.min(rangeData.length, SEED_POINTS);
    setLiveSeries(rangeData.slice(0, seed));
    pointerRef.current = seed;
    setProgress(Math.round((seed / rangeData.length) * 100));
  }, [rangeData]);

  // Append a new point every few seconds to simulate streaming updates.
  useEffect(() => {
    if (!rangeData.length) return;
    if (pointerRef.current >= rangeData.length) return;

    const timer = setInterval(() => {
      pointerRef.current = Math.min(pointerRef.current + 1, rangeData.length);
      const next = pointerRef.current;
      const start = Math.max(0, next - WINDOW_POINTS);
      setLiveSeries(rangeData.slice(start, next));
      setProgress(Math.round((next / rangeData.length) * 100));
    }, UPDATE_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [rangeData]);

  const chartPoints = useMemo<Point[]>(
    () =>
      liveSeries.map((point) => ({
        time: Math.floor(point.ms / 1000) as unknown as Time,
        value: point.signal,
      })),
    [liveSeries]
  );

  if (loading && !chartPoints.length) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-5 w-32" />
        <div className="h-[360px] w-full overflow-hidden rounded-xl border border-dashed border-muted-foreground/40 bg-background">
          <Skeleton className="h-full w-full" />
        </div>
      </div>
    );
  }

  if (error && !chartPoints.length) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Real-Time Stream</h2>
        <p className="text-sm text-muted-foreground">
          New readings every ~{Math.round(UPDATE_INTERVAL_MS / 1000)}s, window capped to recent activity.
        </p>
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground/70">
          Progress {progress}% of stored signals
        </p>
      </div>

      {!chartPoints.length ? (
        <div className="rounded-md border border-dashed border-muted-foreground/40 px-4 py-10 text-center text-sm text-muted-foreground">
          Waiting for live data…
        </div>
      ) : (
        <SimpleChart data={chartPoints} height={360} />
      )}
    </div>
  );
}

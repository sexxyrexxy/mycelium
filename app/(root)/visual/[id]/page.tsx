"use client";

import React, { useMemo } from "react";
import SimpleChart, { Point } from "@/components/portfolio/SimpleChart";
import type { Time } from "lightweight-charts";
import { useSearchParams } from "next/navigation";
import {
  useMushroomSignals,
  TIMELINE_OPTIONS,
} from "@/hooks/useMushroomSignals";
import { SignalTimeRangeSelector } from "@/components/portfolio/SignalTimeRangeSelector";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";

export default function VisualizationPage() {
  const search = useSearchParams();
  const id = search.get("id") ?? "1";

  const {
    viewData,
    loading,
    isRefetching,
    pendingRange,
    error,
    selectedRange,
    setSelectedRange,
  } = useMushroomSignals(id);

  const chartPoints = useMemo<Point[]>(() => {
    return viewData.map((point) => ({
      time: Math.floor(point.ms / 1000) as unknown as Time,
      value: point.signal,
    }));
  }, [viewData]);

  const rangeLabel = useMemo(
    () => TIMELINE_OPTIONS.find((opt) => opt.id === selectedRange)?.label ?? "",
    [selectedRange]
  );
  const isInitialLoading = loading && chartPoints.length === 0;

  return (
    <main className="space-y-4 p-4 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Mushroom Signal</h1>
          <p className="text-sm text-muted-foreground">
            Explore raw electrical activity with stock-style timelines. ({rangeLabel})
            {isRefetching ? (
              <Loader2 className="ml-1 inline size-3 animate-spin text-muted-foreground" />
            ) : null}
          </p>
        </div>
        <SignalTimeRangeSelector
          value={selectedRange}
          onChange={setSelectedRange}
          pendingId={pendingRange}
        />
      </div>

      {isInitialLoading ? (
        <div className="h-[420px] w-full overflow-hidden rounded-xl border border-dashed border-muted-foreground/40 bg-background">
          <Skeleton className="h-full w-full" />
        </div>
      ) : error ? (
        <div className="rounded-md border bg-red-50 px-4 py-8 text-sm text-red-600">
          {error}
        </div>
      ) : !chartPoints.length ? (
        <div className="rounded-md border bg-background px-4 py-8 text-sm text-muted-foreground">
          No signal data available for this range.
        </div>
      ) : (
        <SimpleChart data={chartPoints} height={420} />
      )}
    </main>
  );
}

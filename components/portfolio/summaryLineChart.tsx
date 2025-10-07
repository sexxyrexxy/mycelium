"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CartesianGrid, Line, LineChart, XAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart";
import { SignalTimeRangeSelector } from "@/components/portfolio/SignalTimeRangeSelector";
import {
  useMushroomSignals,
  TimelineRange,
} from "@/hooks/useMushroomSignals";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";

const chartConfig = {
  signal: {
    label: "Signal (mV)",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function ChartLineInteractive({ mushId = "" }: { mushId?: string }) {
  const {
    viewData,
    loading,
    isRefetching,
    pendingRange,
    error,
    selectedRange,
    setSelectedRange,
    options,
    stats,
    rangeData,
  } = useMushroomSignals(mushId);

  const standardChartData = useMemo(
    () =>
      viewData.map((point) => ({
        date: point.timestamp,
        signal: point.signal,
      })),
    [viewData]
  );

  const [rtSeries, setRtSeries] = useState<{ date: string; signal: number }[]>([]);
  const [rtProgress, setRtProgress] = useState(0);
  const rtPointerRef = useRef(0);

  useEffect(() => {
    if (selectedRange !== "rt") {
      rtPointerRef.current = 0;
      setRtSeries([]);
      setRtProgress(0);
      return;
    }

    if (!rangeData.length) {
      rtPointerRef.current = 0;
      setRtSeries([]);
      setRtProgress(0);
      return;
    }

    const seedCount = Math.min(rangeData.length, 150);
    rtPointerRef.current = seedCount;
    setRtSeries(
      rangeData.slice(0, seedCount).map((point) => ({
        date: point.timestamp,
        signal: point.signal,
      }))
    );
    setRtProgress(Math.round((seedCount / rangeData.length) * 100));

    const timer = setInterval(() => {
      rtPointerRef.current = Math.min(rtPointerRef.current + 1, rangeData.length);
      const next = rtPointerRef.current;
      const start = Math.max(0, next - 360);
      const slice = rangeData.slice(start, next);
      setRtSeries(
        slice.map((point) => ({
          date: point.timestamp,
          signal: point.signal,
        }))
      );
      setRtProgress(Math.round((next / rangeData.length) * 100));
      if (next >= rangeData.length) {
        clearInterval(timer);
      }
    }, 3000);

    return () => clearInterval(timer);
  }, [selectedRange, rangeData]);

  const chartData = selectedRange === "rt" ? rtSeries : standardChartData;

  const avg = stats.average;
  const total = stats.total != null ? Math.round(stats.total) : null;

  const rangeLabel = useMemo(
    () => options.find((opt) => opt.id === selectedRange)?.label ?? "",
    [options, selectedRange]
  );

  const isInitialLoading =
    selectedRange === "rt"
      ? loading && rtSeries.length === 0
      : loading && standardChartData.length === 0;
  const isEmpty =
    selectedRange === "rt"
      ? !loading && !error && rtSeries.length === 0
      : !loading && !error && standardChartData.length === 0;

  const formatAxisTick = (value: string) => formatTickForRange(selectedRange, value);
  const formatTooltipLabel = (value: string) =>
    formatTooltipForRange(selectedRange, value);

  const latestPoint = chartData.at(-1) ?? null;
  const firstPoint = chartData[0] ?? null;
  const highPoint = chartData.length
    ? chartData.reduce((acc, point) => (point.signal > acc.signal ? point : acc), chartData[0])
    : null;
  const lowPoint = chartData.length
    ? chartData.reduce((acc, point) => (point.signal < acc.signal ? point : acc), chartData[0])
    : null;
  const changeValue = latestPoint && firstPoint ? latestPoint.signal - firstPoint.signal : null;
  const changePct =
    changeValue != null && firstPoint && firstPoint.signal !== 0
      ? (changeValue / Math.abs(firstPoint.signal)) * 100
      : null;

  // activity interpretation
  const interpret = (value: number | null, average: number | null) => {
    if (value == null || average == null) return null;
    const tol = Math.max(5, average * 0.08); // 8% band or 5 mV minimum
    if (value > average + tol)
      return {
        title: "High Activity 🌟",
        text: "Likely growth or a lively response",
        tone: "text-green-600",
      };
    if (value < average - tol)
      return {
        title: "Low Activity 💤",
        text: "Resting or conserving energy",
        tone: "text-gray-600",
      };
    return {
      title: "Stable Activity 🧘",
      text: "Conditions look balanced",
      tone: "text-amber-600",
    };
  };

  // Fully custom tooltip panel (no ChartTooltipContent, so children render correctly)
  function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload || !payload.length) return null;

    const point = payload[0];
    const value =
      typeof point?.value === "number" ? (point.value as number) : null; //extracts signal from a point, if not a number return null
    const info = interpret(value, avg);
    const formattedLabel = label ? formatTooltipForRange(selectedRange, label) : "";

    return (
      <div className="rounded-md border bg-background p-2 shadow-sm w-[220px]">
        {/* Timestamp */}
        <div className="text-xs text-muted-foreground">
          {formattedLabel}
        </div>

        {/* Value */}
        <div className="mt-1 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">Signal</div>
          <div className="text-sm font-medium">
            {value != null ? `${value.toFixed(1)} mV` : "—"}
          </div>
        </div>

        {/* Interpretation */}
        {info && (
          <div className="mt-2">
            <div className={`text-xs font-semibold ${info.tone}`}>
              {info.title}
            </div>
            <div className="text-xs text-muted-foreground">{info.text}</div>
          </div>
        )}

        {/* Average */}
        {avg != null && (
          <div className="mt-2 text-[10px] text-muted-foreground/80">
            avg {avg.toFixed(1)} mV
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className="py-4 sm:py-0">
      <CardHeader className="flex flex-col items-stretch border-b !p-0 sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 pb-3 sm:pb-0">
          <CardTitle>Electrical Signals</CardTitle>
          <CardDescription>Raw signal over time (mV)</CardDescription>
        </div>
        <div className="flex items-center border-t sm:border-t-0 sm:border-l px-6 py-4 sm:px-8 sm:py-6">
          <div>
            <span className="text-muted-foreground block text-xs">
              Range Sum (mV)
            </span>
            <span className="text-lg leading-none font-bold sm:text-3xl">
              {isInitialLoading ? (
                <Skeleton className="h-5 w-20" />
              ) : total != null ? (
                total.toLocaleString()
              ) : (
                "—"
              )}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-2 sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-0">
          <CardDescription className="text-xs uppercase tracking-wide">
            <span className="flex items-center gap-2">
              {rangeLabel}
              {isRefetching ? (
                <Loader2 className="size-3 animate-spin text-muted-foreground" />
              ) : null}
              {selectedRange === "rt" && rtSeries.length ? (
                <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
                  {rtProgress}% replayed
                </span>
              ) : null}
            </span>
          </CardDescription>
          <SignalTimeRangeSelector
            value={selectedRange}
            onChange={setSelectedRange}
            pendingId={pendingRange}
          />
        </div>
        {isInitialLoading ? (
          <div className="h-[250px] w-full overflow-hidden rounded-xl border border-dashed border-muted-foreground/40 bg-background">
            <Skeleton className="h-full w-full" />
          </div>
        ) : error ? (
          <div className="flex h-[250px] items-center justify-center rounded-xl border border-red-200 bg-red-50 text-sm text-red-600">
            {error}
          </div>
        ) : isEmpty ? (
          <div className="flex h-[250px] items-center justify-center rounded-xl border border-dashed border-muted-foreground/40 text-sm text-muted-foreground">
            No signal data for this range.
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[250px] w-full"
          >
            <LineChart data={chartData} margin={{ left: 12, right: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={formatAxisTick}
              />
              <ChartTooltip
                content={<CustomTooltip />}
                labelFormatter={formatTooltipLabel}
              />
              <Line
                dataKey="signal"
                type="monotone"
                stroke={`var(--color-signal)`}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        )}
        {!isInitialLoading && !error && !isEmpty ? (
          <div className="mt-5 grid gap-4 rounded-2xl border bg-muted/30 p-4 text-sm text-muted-foreground sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/70">
                Latest signal
              </p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {latestPoint ? `${latestPoint.signal.toFixed(2)} mV` : "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                {latestPoint
                  ? formatTooltipForRange(selectedRange, latestPoint.date)
                  : "Awaiting data"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/70">
                Range insight
              </p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {changeValue != null ? `${changeValue >= 0 ? "+" : ""}${changeValue.toFixed(2)} mV` : "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                {changePct != null ? `${changePct >= 0 ? "Up" : "Down"} ${Math.abs(changePct).toFixed(1)}% vs start` : "No change data"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/70">
                Peaks spotted
              </p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {highPoint ? highPoint.signal.toFixed(2) : "—"} / {lowPoint ? lowPoint.signal.toFixed(2) : "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                {highPoint && lowPoint
                  ? `High at ${formatTooltipForRange(selectedRange, highPoint.date)} · low at ${formatTooltipForRange(selectedRange, lowPoint.date)}`
                  : "No extremes yet"}
              </p>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function formatTickForRange(range: TimelineRange, value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  switch (range) {
    case "1w":
    case "all":
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    case "3d":
      return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
      });
    case "1d":
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
    default:
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
  }
}

function formatTooltipForRange(range: TimelineRange, value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const baseOptions: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };
  if (range === "all") {
    return date.toLocaleString("en-US", {
      ...baseOptions,
      year: "numeric",
    });
  }
  return date.toLocaleString("en-US", baseOptions);
}

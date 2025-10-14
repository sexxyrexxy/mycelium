"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CartesianGrid, Line, LineChart, XAxis } from "recharts";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { SignalTimeRangeSelector } from "@/components/portfolio/SignalTimeRangeSelector";
import { useMushroomSignals, TimelineRange } from "@/hooks/useMushroomSignals";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";

/**
 * ================================
 *  CHART CONFIG
 * ================================
 */
const chartConfig = {
  signal: { label: "Signal (mV)", color: "var(--chart-1)" },
} satisfies ChartConfig;

/**
 * ================================
 *  STREAM PAYLOAD SHAPE → CHART POINT
 *  - The SSE server sends rows shaped like:
 *    { type:"row", item:{ MushID, Timestamp, Signal_mV } }
 * ================================
 */
type StreamRow = { MushID: string; Timestamp: string; Signal_mV: number };

function mapRow(r: StreamRow) {
  return { date: r.Timestamp, signal: Number(r.Signal_mV) };
}

export function RTLineChart({ mushId = "" }: { mushId?: string }) {
  /**
   * ================================
   *  SERVER DATA HOOK (non-RT history)
   *  - useMushroomSignals fetches historical ranges
   *  - We only attach SSE when selectedRange === "rt"
   * ================================
   */
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

  // Historical (non-RT) chart rows
  const standardChartData = useMemo(
    () => viewData.map((p) => ({ date: p.timestamp, signal: p.signal })),
    [viewData]
  );

  /**
   * ================================
   *  SSE: CLIENT STATE + LIFECYCLE
   *  - MAX_POINTS: cap series length → smoother Recharts
   *  - rtSeries: live window displayed during "rt" mode
   *  - sseConnected: LIVE/reconnecting… badge
   *  - sseRef: keep a single EventSource instance
   *  - seededRef: only prime RT once per session
   * ================================
   */
  const MAX_POINTS = 1200;
  const [rtSeries, setRtSeries] = useState<{ date: string; signal: number }[]>([]);
  const [sseConnected, setSseConnected] = useState(false);
  const sseRef = useRef<EventSource | null>(null);
  const seededRef = useRef(false);

  /**
   * ==============================================================================
   *  SSE: AUTO-CONNECT WHEN selectedRange === "rt"
   *  - Seeds initial points for continuity (optional UX sugar)
   *  - Opens EventSource to `/api/realtime_stream` (optionally with mushId)
   *  - Handles both "named event: row" and default "message" events
   *  - Appends to a sliding window (performance)
   *  - Properly cleans up listeners + closes ES on unmount or range change
   *
   *  NOTE (root-cause → now fixed):
   *  - Earlier issues were caused by a mismatch between emitted event names and client listeners,
   *    and by not closing EventSource on range switch → duplicate streams & stutter.
   *  - This version listens to BOTH named ("row") and default ("message") events,
   *    and always closes ES during cleanup to avoid leaks/duplicates.
   * ==============================================================================
   */
  useEffect(() => {
    // Only run SSE in RT mode
    if (selectedRange !== "rt") {
      seededRef.current = false;
      setRtSeries([]);
      setSseConnected(false);
      if (sseRef.current) {
        sseRef.current.close(); // ✅ prevent duplicate streams
        sseRef.current = null;
      }
      return;
    }

    // Seed with a small slice of recent history for a smooth visual start
    if (!seededRef.current && rangeData.length) {
      const seedCount = Math.min(rangeData.length, 200);
      setRtSeries(
        rangeData.slice(-seedCount).map((p) => ({ date: p.timestamp, signal: p.signal }))
      );
      seededRef.current = true;
    }

    // ---- Open the EventSource stream (auto-connect) ----
    const url = mushId
      ? `/api/realtime_stream?mushId=${encodeURIComponent(mushId)}`
      : `/api/realtime_stream`;
    const es = new EventSource(url);
    sseRef.current = es;

    // Helper to append rows safely with optional client-side filtering
    const append = (rows: StreamRow[]) => {
      setRtSeries((prev) => {
        const mapped = rows
          .filter((r) => (!mushId || r.MushID === mushId)) // optional per-mush filter
          .map(mapRow);
        if (mapped.length === 0) return prev;
        const next = [...prev, ...mapped];
        // ✅ sliding window cap to keep Recharts smooth
        return next.length > MAX_POINTS ? next.slice(-MAX_POINTS) : next;
      });
    };

    // Connection state indicators
    es.onopen = () => setSseConnected(true);
    es.onerror = () => setSseConnected(false); // EventSource auto-reconnects

    // ✅ Preferred: listen to NAMED event "row"
    const onRow = (ev: Event) => {
      try {
        const msg = JSON.parse((ev as MessageEvent).data);
        if (msg?.item) append([msg.item as StreamRow]);
        else if (Array.isArray(msg?.items)) append(msg.items as StreamRow[]);
      } catch {
        /* ignore malformed message */
      }
    };
    es.addEventListener("row", onRow);

    // ✅ Fallback: default "message" event (for servers that don’t set event: row)
    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg?.type === "row" && msg?.item) append([msg.item as StreamRow]);
        else if (Array.isArray(msg?.items)) append(msg.items as StreamRow[]);
      } catch {
        /* ignore malformed message */
      }
    };

    // Cleanup: remove named listener + close ES on unmount or dependency change
    return () => {
      es.removeEventListener("row", onRow);
      es.close();            // ✅ fix: ensure we don’t keep ghost connections
      sseRef.current = null;
    };
  }, [selectedRange, mushId, rangeData]);

  /**
   * ================================
   *  DATASET PICKER (RT vs Historical)
   * ================================
   */
  const chartData = selectedRange === "rt" ? rtSeries : standardChartData;

  /**
   * ================================
   *  KPIs + LABELS (unchanged)
   * ================================
   */
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
  const formatTooltipLabel = (value: string) => formatTooltipForRange(selectedRange, value);

  const latestPoint = chartData.at(-1) ?? null;
  const firstPoint = chartData[0] ?? null;
  const highPoint = chartData.length
    ? chartData.reduce((acc, p) => (p.signal > acc.signal ? p : acc), chartData[0])
    : null;
  const lowPoint = chartData.length
    ? chartData.reduce((acc, p) => (p.signal < acc.signal ? p : acc), chartData[0])
    : null;
  const changeValue =
    latestPoint && firstPoint ? latestPoint.signal - firstPoint.signal : null;
  const changePct =
    changeValue != null && firstPoint && firstPoint.signal !== 0
      ? (changeValue / Math.abs(firstPoint.signal)) * 100
      : null;

  /**
   * ================================
   *  INTERPRETATION (unchanged)
   * ================================
   */
  const interpret = (value: number | null, average: number | null) => {
    if (value == null || average == null) return null;
    const tol = Math.max(5, average * 0.08);
    if (value > average + tol) return { title: "High Activity 🌟", text: "Likely growth or a lively response", tone: "text-green-600" };
    if (value < average - tol) return { title: "Low Activity 💤", text: "Resting or conserving energy", tone: "text-gray-600" };
    return { title: "Stable Activity 🧘", text: "Conditions look balanced", tone: "text-amber-600" };
  };

  function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload || !payload.length) return null;
    const v = typeof payload[0]?.value === "number" ? (payload[0].value as number) : null;
    const info = interpret(v, avg);
    const when = label ? formatTooltipForRange(selectedRange, label) : "";
    return (
      <div className="rounded-md border bg-background p-2 shadow-sm w-[220px]">
        <div className="text-xs text-muted-foreground">{when}</div>
        <div className="mt-1 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">Signal</div>
          <div className="text-sm font-medium">{v != null ? `${v.toFixed(1)} mV` : "—"}</div>
        </div>
        {info && (
          <div className="mt-2">
            <div className={`text-xs font-semibold ${info.tone}`}>{info.title}</div>
            <div className="text-xs text-muted-foreground">{info.text}</div>
          </div>
        )}
        {avg != null && <div className="mt-2 text-[10px] text-muted-foreground/80">avg {avg.toFixed(1)} mV</div>}
      </div>
    );
  }

  /**
   * ================================
   *  RENDER
   * ================================
   */
  return (
    <Card className="py-4 sm:py-0">
      <CardHeader className="flex flex-col items-stretch border-b !p-0 sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 pb-3 sm:pb-0">
          <CardTitle>Electrical Signals</CardTitle>
          <CardDescription>Raw signal over time (mV)</CardDescription>
        </div>
        <div className="flex items-center border-t sm:border-t-0 sm:border-l px-6 py-4 sm:px-8 sm:py-6">
          <div>
            <span className="text-muted-foreground block text-xs">Range Sum (mV)</span>
            <span className="text-lg leading-none font-bold sm:text-3xl">
              {isInitialLoading ? <Skeleton className="h-5 w-20" /> : total != null ? total.toLocaleString() : "—"}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-2 sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-0">
          <CardDescription className="text-xs uppercase tracking-wide">
            <span className="flex items-center gap-2">
              {options.find((o) => o.id === selectedRange)?.label ?? ""}
              {isRefetching ? <Loader2 className="size-3 animate-spin text-muted-foreground" /> : null}
              {selectedRange === "rt" && (
                <span className={`text-[10px] uppercase tracking-[0.2em] ${sseConnected ? "text-green-500" : "text-muted-foreground/70"}`}>
                  {sseConnected ? "LIVE" : "reconnecting…"}
                </span>
              )}
            </span>
          </CardDescription>

          {/* Changing range ensures we close any open EventSource first (see onChange) */}
          <SignalTimeRangeSelector
            value={selectedRange}
            onChange={(v) => {
              if (sseRef.current) {
                sseRef.current.close(); // ✅ fix: prevents duplicate connections after switching
                sseRef.current = null;
              }
              setSelectedRange(v);
            }}
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
          <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
            <LineChart data={chartData} margin={{ left: 12, right: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(v: string) => formatTickForRange(selectedRange, v)}
              />
              <ChartTooltip content={<CustomTooltip />} labelFormatter={(v) => formatTooltipForRange(selectedRange, v)} />
              <Line
                dataKey="signal"
                type="monotone"
                stroke={`var(--color-signal)`}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}  // ✅ smoother with frequent updates
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * ================================
 *  AXIS / TOOLTIP FORMATTERS (unchanged)
 * ================================
 */
function formatTickForRange(range: TimelineRange, value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  switch (range) {
    case "1w":
    case "all":
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    case "3d":
      return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric" });
    case "1d":
    default:
      return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
}

function formatTooltipForRange(range: TimelineRange, value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const base: Intl.DateTimeFormatOptions = {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit",
  };
  return range === "all"
    ? d.toLocaleString("en-US", { ...base, year: "numeric" })
    : d.toLocaleString("en-US", base);
}

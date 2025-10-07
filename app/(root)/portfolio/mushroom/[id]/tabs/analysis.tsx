"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { drawVoronoiChart } from "@/components/portfolio/network/Network";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { MushroomSprite } from "@/components/portfolio/PixelMushrooms";
import { SignalTimeRangeSelector } from "@/components/portfolio/SignalTimeRangeSelector";
import {
  useMushroomSignals,
  SignalDatum,
  TimelineRange,
} from "@/hooks/useMushroomSignals";
import { useParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from "@/components/ui/chart";

export const description = "Timeline analysis of differential voltage feed with network diagram.";

export function Analysis() {
  const { id } = useParams<{ id: string }>();
  const mushId = id ?? "";

  const {
    data,
    rangeData,
    loading,
    isRefetching,
    pendingRange,
    error,
    selectedRange,
    setSelectedRange,
    options,
  } = useMushroomSignals(mushId);

  const baseData = useMemo(
    () =>
      rangeData.map((point) => ({
        timestamp: point.ms,
        signal: point.signal,
        iso: point.timestamp,
      })),
    [rangeData]
  );

  const [visibleData, setVisibleData] = useState<{ timestamp: number; signal: number }[]>([]);
  const [simIndex, setSimIndex] = useState(0);

  const rangeLabel = useMemo(
    () => options.find((opt) => opt.id === selectedRange)?.label ?? "",
    [options, selectedRange]
  );

  useEffect(() => {
    if (!baseData.length) {
      setVisibleData([]);
      setSimIndex(0);
      return;
    }

    const initialWindow = Math.min(baseData.length, Math.max(100, Math.floor(baseData.length * 0.1)));

    setVisibleData(baseData.slice(0, initialWindow));
    setSimIndex(initialWindow);
  }, [baseData]);

  useEffect(() => {
    if (!baseData.length) return;
    if (simIndex >= baseData.length) return;

    const interval = setInterval(() => {
      setSimIndex((prev) => {
        const next = Math.min(prev + 1, baseData.length);
        if (next === prev) return prev;
        setVisibleData(baseData.slice(0, next));
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [baseData, simIndex]);

  const simulationData = visibleData.length ? visibleData : baseData;

  const metrics = useMemo(() => {
    if (!simulationData.length) {
      return {
        latest: null as SignalDatum | null,
        change: null as number | null,
        changePct: null as number | null,
        volatility: null as number | null,
        spikeCount: 0,
        high: null as number | null,
        low: null as number | null,
        average: null as number | null,
      };
    }

    const latestSim = simulationData[simulationData.length - 1];
    const firstSim = simulationData[0];
    const signals = simulationData.map((point) => point.signal);
    const mean = signals.reduce((acc, value) => acc + value, 0) / signals.length;
    const variance =
      signals.length > 1
        ? signals.reduce((acc, value) => acc + Math.pow(value - mean, 2), 0) /
          signals.length
        : 0;
    const volatility = Math.sqrt(Math.max(variance, 0));
    const change = latestSim.signal - firstSim.signal;
    const changePct =
      firstSim.signal !== 0
        ? (change / Math.abs(firstSim.signal)) * 100
        : null;

    let spikeCount = 0;
    if (signals.length > 1 && volatility > 0) {
      const threshold = volatility * 2;
      for (let i = 1; i < signals.length; i++) {
        const diff = Math.abs(signals[i] - signals[i - 1]);
        if (diff >= threshold) spikeCount++;
      }
    }

    const high = Math.max(...signals);
    const low = Math.min(...signals);

    return {
      latest: {
        timestamp: latestSim.iso ?? new Date(latestSim.timestamp).toISOString(),
        signal: latestSim.signal,
        ms: latestSim.timestamp,
      } as SignalDatum,
      change,
      changePct,
      volatility,
      spikeCount,
      high,
      low,
      average: mean,
    };
  }, [simulationData]);

  const contentRef = useRef<HTMLDivElement | null>(null);
  const [legendOpen, setLegendOpen] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const chartConfig = {
    signal: {
      label: "Signal",
      color: "var(--chart-1)",
    },
  } satisfies ChartConfig;

  const latestSignalValue = metrics.latest?.signal ?? null;
  const latestIso = metrics.latest?.timestamp ?? null;
  const formattedLatestSignal =
    latestSignalValue != null ? `${latestSignalValue.toFixed(2)} mV` : "—";
  const formattedLatestTime =
    latestIso != null
      ? new Date(latestIso).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—";
  const formattedChange =
    metrics.change != null
      ? `${metrics.change >= 0 ? "+" : ""}${metrics.change.toFixed(2)} mV`
      : "—";
  const formattedChangePct =
    metrics.changePct != null
      ? `${metrics.changePct >= 0 ? "+" : ""}${metrics.changePct.toFixed(1)}%`
      : null;
  const formattedVolatility =
    metrics.volatility != null
      ? `${metrics.volatility.toFixed(2)} mV`
      : "—";
  const formattedAverage =
    metrics.average != null ? `${metrics.average.toFixed(2)} mV` : "—";
  const formattedHigh =
    metrics.high != null ? `${metrics.high.toFixed(2)} mV` : "—";
  const formattedLow =
    metrics.low != null ? `${metrics.low.toFixed(2)} mV` : "—";
  const spikeDisplay =
    metrics.volatility != null && metrics.volatility > 0 ? metrics.spikeCount : 0;
  const streamProgress = baseData.length
    ? Math.round((simulationData.length / baseData.length) * 100)
    : 0;
  const isInitialLoading = loading && !baseData.length;
  const isEmpty = !loading && !error && !baseData.length;
  // --- Initialize Voronoi ---
  useEffect(() => {
    if (!svgRef.current) return;

    const ProcessDataWorker = new Worker("/Workers/ProcessData.js");
    let cleanup: (() => void) | null = null;

    fetch("/GhostFungi.csv")
      .then(res => res.text())
      .then(csvText => ProcessDataWorker.postMessage({ type: "csv", data: csvText }));

    ProcessDataWorker.onmessage = event => {
      const { mappedSpeeds: workerSpeeds, normalizedBaseline: workerBaseline, spikes: workerSpikes, error } = event.data;
      if (error) {
        console.error(error);
        return;
      }

      cleanup = drawVoronoiChart(
        svgRef.current!,
        800,
        600,
        workerSpeeds,
        workerBaseline,
        workerSpikes // <-- pass spikes to the chart
      );
    };

    return () => {
      ProcessDataWorker.terminate();
      if (cleanup) cleanup();
    };
  }, []);

  return (
    <>
      <h1 className="text-center text-xl">{description}</h1>
      <h5 className="text-gray-700 text-center italic mb-5">
        Start with the latest four hours, then widen the window just like a stock
        chart to understand longer-term electrical shifts.
      </h5>
      <div className="mx-auto mb-10 h-px w-1/4 bg-[#564930]"></div>

      {/* Line chart card */}
      <Card className="py-4 sm:py-0 mb-10">
        <CardHeader className="flex flex-col items-stretch border-b !p-0 sm:flex-row">
          <div className="flex flex-1 flex-col justify-center gap-1 px-6 pb-3 sm:pb-0">
          <CardTitle className="pt-3">Electrical Signals</CardTitle>
          <CardDescription className="pb-1">
            Historical feed replayed at 1 pt/sec for rapid pattern spotting.
          </CardDescription>
        </div>
        </CardHeader>
        <CardContent className="px-2 sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-0">
            <CardDescription className="text-xs uppercase tracking-wide text-muted-foreground">
              <span className="flex items-center gap-2">
                {rangeLabel}
                {isRefetching ? (
                  <Loader2 className="size-3 animate-spin text-muted-foreground" />
                ) : null}
              </span>
              {!isInitialLoading && !isEmpty && !error ? (
                <span className="mt-1 block text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
                  Simulation {streamProgress}% complete
                </span>
              ) : null}
            </CardDescription>
            <SignalTimeRangeSelector
              value={selectedRange}
              onChange={setSelectedRange}
              pendingId={pendingRange}
            />
          </div>
          {isInitialLoading ? (
            <div className="h-[300px] w-full overflow-hidden rounded-xl border border-dashed border-muted-foreground/40 bg-background">
              <Skeleton className="h-full w-full" />
            </div>
          ) : error ? (
            <div className="flex h-[300px] items-center justify-center rounded-xl border border-red-200 bg-red-50 text-sm text-red-600">
              {error}
            </div>
          ) : isEmpty ? (
            <div className="flex h-[300px] items-center justify-center rounded-xl border border-dashed border-muted-foreground/40 text-sm text-muted-foreground">
              No signal data for this range.
            </div>
          ) : (
            <div className="space-y-3">
              <ChartContainer config={chartConfig} className="w-full h-[300px]">
                <LineChart
                  data={simulationData}
                  margin={{ top: 12, right: 15, left: 12, bottom: 30 }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="timestamp"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={20}
                    label={{
                      value: "Timestamp",
                      position: "bottom",
                      offset: 15,
                    }}
                    tickFormatter={(value) =>
                      formatTickForRange(selectedRange, Number(value))
                    }
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    label={{
                      value: "Signal (mV)",
                      angle: -90,
                      position: "insideLeft",
                      dy: 55,
                      offset: -5,
                    }}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        className="w-[160px]"
                        nameKey="signal"
                        formatter={(value) => [
                          `${Number(value).toFixed(2)} mV`,
                          "Signal",
                        ]}
                        labelFormatter={(v) =>
                          formatTooltipForRange(selectedRange, Number(v))
                        }
                      />
                    }
                  />
                  <Line
                    dataKey="signal"
                    type="monotone"
                    stroke="var(--chart-1)"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ChartContainer>
              <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, streamProgress))}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Voronoi network card */}
      <Card className="p-4 sm:p-6 flex flex-col gap-4">
        <div>
          <CardTitle>Network Diagram</CardTitle>
          <CardDescription className="pt-1">
            Real-time visualization of mushroom electrical activity patterns
          </CardDescription>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          {/* Voronoi chart */}
          <div className="flex-[3] rounded-2xl overflow-hidden shadow-md border border-gray-300/50 max-h-[600px]">
            <svg
              ref={svgRef}
              viewBox="0 0 800 600"
              preserveAspectRatio="xMidYMid meet"
              className="w-full h-auto"
            ></svg>
          </div>

          {/* Metrics panel */}
          <div className="flex-[1] flex flex-col gap-4 justify-center">
            <h2 className="text-lg font-semibold text-center">Metrics</h2>
            <div className="mx-auto h-px w-3/4 bg-[#564930]"></div>

            <Card className="p-2 bg-gray-50 rounded-2xl shadow-inner">
              <CardTitle className="text-sm font-semibold">Latest Signal</CardTitle>
              <CardContent className="text-md font-semibold p-0 flex flex-col items-center gap-1">
                <span>{formattedLatestSignal}</span>
                <span className="text-xs text-gray-500">{formattedLatestTime}</span>
              </CardContent>
            </Card>

            <Card className="p-2 bg-gray-50 rounded-2xl shadow-inner">
              <CardTitle className="text-sm font-semibold">Range Change</CardTitle>
              <CardContent className="text-md font-semibold p-0 items-center flex flex-col gap-1">
                <span>{formattedChange}</span>
                {formattedChangePct && (
                  <span className="text-xs text-gray-500">{formattedChangePct}</span>
                )}
              </CardContent>
            </Card>

            <Card className="p-2 bg-gray-50 rounded-2xl shadow-inner">
              <CardTitle className="text-sm font-semibold">Volatility</CardTitle>
              <CardContent className="text-md font-semibold p-0 items-center flex flex-col gap-1">
                <span>{formattedVolatility}</span>
                <span className="text-xs text-gray-500">avg {formattedAverage}</span>
              </CardContent>
            </Card>

            <Card className="p-2 bg-gray-50 rounded-2xl shadow-inner">
              <CardTitle className="text-sm font-semibold">Spike Alerts</CardTitle>
              <CardContent className="text-md font-semibold p-0 items-center flex flex-col gap-1">
                <span>{spikeDisplay}</span>
                <span className="text-xs text-gray-500">
                  High {formattedHigh} · Low {formattedLow}
                </span>
              </CardContent>
            </Card>

            <div className="flex flex-wrap gap-5 mt-2 justify-center">
              <MushroomSprite species="flyAgaric" size={40} duration={1.5} />
              <MushroomSprite species="shiitake" size={40} duration={1.5} />
              <MushroomSprite species="oyster" size={40} duration={1.5} />
              <MushroomSprite species="flyAgaric" size={40} duration={1.5} />
            </div>
          </div>
        </div>
      </Card>
            {/* Legend Accordion */}
      <div className="mt-4 w-full">
        <div
          onClick={() => setLegendOpen(!legendOpen)}
          className="cursor-pointer bg-[#564930] text-white rounded-md p-2 font-semibold flex justify-between items-center"
        >
          Legend
          <span
            className={`ml-2 inline-block transform transition-transform duration-300 ${
              legendOpen ? "rotate-90" : ""
            }`}
          >
            &#9654;
          </span>
        </div>

        <div
  ref={contentRef}
  className="overflow-hidden transition-all duration-500 ease-in-out mt-2"
  style={{ height: legendOpen ? `${contentRef.current?.scrollHeight}px` : "0px" }}
>
  <ul className="text-sm text-white bg-[#564930] rounded-md p-2">
    <li className="flex flex-col gap-1 p-2 rounded-md">
      <span className="font-semibold">Background = Baseline Drift</span>
      <span className="text-xs">
        The background color shows the mushroom’s baseline electrical signals, calculated as a moving average. 
        A cooler tone background indicates lower average activity, while warmer indicates higher average activity, 
        highlighting increased electrical activity and overall 'excitability' in the mushroom.
      </span>
    </li>
    <li className="flex flex-col gap-1 p-2 rounded-md">
      <span className="font-semibold">Ripples = Rate of Change</span>
      <span className="text-xs">
        Ripples along the network lines represent changes in the mushroom’s electrical signals over time. Faster-moving ripples indicate greater fluctuations in signal magnitude, 
        highlighting moments of heightened activity in the network, which can indicate potential responses to stimuli. Slow ripples depict small 
        differences in rate of change between consecutive dataset points, which may indicate the network is relatively stable.
      </span>
    </li>
    <li className="flex flex-col gap-1 p-2 rounded-md">
      <span className="font-semibold">Ripple Colors</span>
      <div className="flex gap-4 text-xs">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-teal-400 rounded-full"></span>
          Teal — normal fluctuations.
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-yellow-400 rounded-full"></span>
          Gold — strong spike, unusual activity.
        </span>
      </div>
    </li>
  </ul>
</div>
      </div>
    </>
  );
}

function formatTickForRange(range: TimelineRange, value: number) {
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
        hour: "2-digit",
        minute: "2-digit",
      });
    default:
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: range === "4h" ? "2-digit" : undefined,
      });
  }
}

function formatTooltipForRange(range: TimelineRange, value: number) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };
  if (range === "all") {
    options.year = "numeric";
  }
  if (range === "4h") {
    options.second = "2-digit";
  }
  return date.toLocaleString("en-US", options);
}

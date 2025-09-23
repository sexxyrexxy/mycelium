"use client";

import * as React from "react";
import { CartesianGrid, Line, LineChart, XAxis } from "recharts";
import { useState, useEffect, useMemo } from "react";
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

type ApiSignal = { timestamp: string; signal: number | null };
type ApiResponse =
  | { mushId: string; signals: ApiSignal[] }
  | { id: string; signals: ApiSignal[]; [k: string]: any };

const chartConfig = {
  signal: {
    label: "Signal (mV)",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function ChartLineInteractive({ mushId = "" }: { mushId?: string }) {
  // Hooks FIRST
  const [chartData, setChartData] = useState<
    { date: string; signal: number }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/mushroom/${mushId}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`API ${res.status}`);

        const payload: ApiResponse = await res.json();
        const signals = (payload as any).signals;

        if (!Array.isArray(signals))
          throw new Error("API payload has no 'signals' array");

        const data = signals
          .filter((s: ApiSignal) => s && s.timestamp && s.signal != null)
          .map((s: ApiSignal) => ({
            date: s.timestamp,
            signal: Number(s.signal),
          }));

        setChartData(data);
      } catch (e: any) {
        setError(e?.message ?? "Failed to fetch");
      } finally {
        setLoading(false);
      }
    })();
  }, [mushId]);

  // Average for interpretation
  const avg = useMemo(() => {
    if (!chartData.length) return null;
    const sum = chartData.reduce((acc, cur) => acc + cur.signal, 0);
    return sum / chartData.length;
  }, [chartData]);

  // Early returns AFTER hooks
  if (loading) return <div className="p-6">Loading…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!chartData.length) return <div className="p-6">No signal data.</div>;

  const total = Math.round(chartData.reduce((acc, cur) => acc + cur.signal, 0));

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

    return (
      <div className="rounded-md border bg-background p-2 shadow-sm w-[220px]">
        {/* Timestamp */}
        <div className="text-xs text-muted-foreground">
          {label
            ? new Date(label).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : ""}
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
              Total (mV)
            </span>
            <span className="text-lg leading-none font-bold sm:text-3xl">
              {total.toLocaleString()}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-2 sm:p-6">
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
              tickFormatter={(value) =>
                new Date(value).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              }
            />
            <ChartTooltip content={<CustomTooltip />} />
            <Line
              dataKey="signal"
              type="monotone"
              stroke={`var(--color-signal)`}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

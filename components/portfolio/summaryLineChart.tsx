"use client";

import * as React from "react";
import { CartesianGrid, Line, LineChart, XAxis } from "recharts";
import { useState, useEffect } from "react";
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
  ChartTooltipContent,
} from "@/components/ui/chart";

type ApiSignal = { timestamp: string; signal: number | null };
type ApiResponse =
  | { mushId: number; signals: ApiSignal[] }
  | { id: string; signals: ApiSignal[]; [k: string]: any };

const chartConfig = {
  signal: {
    label: "Signal (mV)",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function ChartLineInteractive({ mushId = 1 }: { mushId?: number }) {
  const [chartData, setChartData] = useState<{ date: string; signal: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/mushroom/${mushId}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`API ${res.status}`);

        const payload: ApiResponse = await res.json();
        const signals = (payload as any).signals; // route returns { ...meta?, signals }

        if (!Array.isArray(signals)) throw new Error("API payload has no 'signals' array");

        const data = signals
          .filter((s: ApiSignal) => s && s.timestamp && s.signal != null)
          .map((s: ApiSignal) => ({
            date: s.timestamp,              // ISO string from your API
            signal: Number(s.signal),       // ensure number
          }));

        setChartData(data);
      } catch (e: any) {
        setError(e?.message ?? "Failed to fetch");
      } finally {
        setLoading(false);
      }
    })();
  }, [mushId]);

  if (loading) return <div className="p-6">Loading…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!chartData.length) return <div className="p-6">No signal data.</div>;

  const total = Math.round(chartData.reduce((acc, cur) => acc + cur.signal, 0));

  return (
    <Card className="py-4 sm:py-0">
      <CardHeader className="flex flex-col items-stretch border-b !p-0 sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 pb-3 sm:pb-0">
          <CardTitle>Electrical Signals</CardTitle>
          <CardDescription>Raw signal over time (mV)</CardDescription>
        </div>
        <div className="flex items-center border-t sm:border-t-0 sm:border-l px-6 py-4 sm:px-8 sm:py-6">
          <div>
            <span className="text-muted-foreground block text-xs">Total (mV)</span>
            <span className="text-lg leading-none font-bold sm:text-3xl">
              {total.toLocaleString()}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-2 sm:p-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
          <LineChart data={chartData} margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) =>
                new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
              }
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="w-[150px]"
                  nameKey="signal"
                  labelFormatter={(value) =>
                    new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  }
                />
              }
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
      </CardContent>
    </Card>
  );
}

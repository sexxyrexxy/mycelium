"use client";

import * as React from "react";
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
  ChartTooltipContent,
} from "@/components/ui/chart";
import MushroomNetwork from "./network";
import MushroomSprite from "@/components/portfolio/PixelMushrooms";

export const description = "An interactive line chart";

const chartData = [
  { timestamp: "2024-09-07T12:00:00", desktop: 220, mobile: 150 },
  { timestamp: "2024-09-07T12:00:01", desktop: 230, mobile: 160 },
  { timestamp: "2024-09-07T12:00:02", desktop: 210, mobile: 170 },
  { timestamp: "2024-09-07T12:00:03", desktop: 250, mobile: 155 },
  { timestamp: "2024-09-07T12:00:04", desktop: 260, mobile: 180 },
  { timestamp: "2024-09-07T12:00:05", desktop: 270, mobile: 190 },
  { timestamp: "2024-09-07T12:00:06", desktop: 240, mobile: 175 },
  { timestamp: "2024-09-07T12:00:07", desktop: 280, mobile: 160 },
  { timestamp: "2024-09-07T12:00:08", desktop: 300, mobile: 200 },
  { timestamp: "2024-09-07T12:00:09", desktop: 320, mobile: 210 },
  { timestamp: "2024-09-07T12:00:10", desktop: 310, mobile: 195 },
  { timestamp: "2024-09-07T12:00:11", desktop: 290, mobile: 185 },
  { timestamp: "2024-09-07T12:00:12", desktop: 305, mobile: 175 },
  { timestamp: "2024-09-07T12:00:13", desktop: 315, mobile: 165 },
  { timestamp: "2024-09-07T12:00:14", desktop: 325, mobile: 180 },
  { timestamp: "2024-09-07T12:00:15", desktop: 330, mobile: 190 },
  { timestamp: "2024-09-07T12:00:16", desktop: 310, mobile: 185 },
  { timestamp: "2024-09-07T12:00:17", desktop: 295, mobile: 170 },
  { timestamp: "2024-09-07T12:00:18", desktop: 285, mobile: 160 },
  { timestamp: "2024-09-07T12:00:19", desktop: 300, mobile: 175 },
  { timestamp: "2024-09-07T12:00:20", desktop: 310, mobile: 185 },
  { timestamp: "2024-09-07T12:00:21", desktop: 320, mobile: 190 },
  { timestamp: "2024-09-07T12:00:22", desktop: 330, mobile: 200 },
  { timestamp: "2024-09-07T12:00:23", desktop: 340, mobile: 210 },
  { timestamp: "2024-09-07T12:00:24", desktop: 350, mobile: 215 },
  { timestamp: "2024-09-07T12:00:25", desktop: 345, mobile: 220 },
  { timestamp: "2024-09-07T12:00:26", desktop: 335, mobile: 210 },
  { timestamp: "2024-09-07T12:00:27", desktop: 325, mobile: 205 },
  { timestamp: "2024-09-07T12:00:28", desktop: 315, mobile: 195 },
  { timestamp: "2024-09-07T12:00:29", desktop: 305, mobile: 185 },
];

const chartConfig = {
  views: {
    label: "Signal",
  },
  desktop: {
    label: "Desktop",
    color: "var(--chart-1)",
  },
  mobile: {
    label: "Mobile",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export function Analysis({ id }: { id: string }) {
  const [activeChart, setActiveChart] =
    React.useState<keyof typeof chartConfig>("desktop");

  const [visibleData, setVisibleData] = React.useState<
    { timestamp: string; desktop: number; mobile: number }[]
  >([]);

  const startTime = React.useRef(Date.now());

  React.useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();

      const newPoint = {
        timestamp: new Date(now).toISOString(),
        desktop: Math.floor(200 + Math.random() * 200),
        mobile: Math.floor(150 + Math.random() * 200),
      };

      setVisibleData((prev) => [...prev, newPoint]); // 👈 keep all points
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <Card className="py-4 sm:py-0">
        <CardHeader className="flex flex-col items-stretch border-b !p-0 sm:flex-row">
          <div className="flex flex-1 flex-col justify-center gap-1 px-6 pb-3 sm:pb-0">
            <CardTitle>Electrical Signals</CardTitle>
            <CardDescription>Real-time feed (auto zoom out)</CardDescription>
          </div>
          <div className="flex">
            {["desktop", "mobile"].map((key) => {
              const chart = key as keyof typeof chartConfig;
              return (
                <button
                  key={chart}
                  data-active={activeChart === chart}
                  className="data-[active=true]:bg-muted/50 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l sm:border-t-0 sm:border-l sm:px-8 sm:py-6"
                  onClick={() => setActiveChart(chart)}
                >
                  <span className="text-muted-foreground text-xs">
                    {chartConfig[chart].label}
                  </span>
                  <span className="text-lg leading-none font-bold sm:text-3xl">
                    {visibleData
                      .reduce((acc, curr) => acc + curr[chart], 0)
                      .toLocaleString()}
                  </span>
                </button>
              );
            })}
          </div>
        </CardHeader>
        <CardContent className="px-2 sm:p-6">
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[250px] w-full"
          >
            <LineChart
              accessibilityLayer
              data={visibleData}
              margin={{ left: 12, right: 12 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="timestamp"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={20}
                // show seconds
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleTimeString("en-US", {
                    minute: "2-digit",
                    second: "2-digit",
                  });
                }}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    className="w-[150px]"
                    nameKey="views"
                    labelFormatter={(value) =>
                      new Date(value).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })
                    }
                  />
                }
              />
              <Line
                dataKey={activeChart}
                type="monotone"
                stroke={`var(--color-${activeChart})`}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
      <div className="flex">
        <div className="flex flex-col items-center justify-center p-10">
          <MushroomSprite species="flyAgaric" size={300} duration={2.2} />
          {/* <MushroomSprite species="shiitake" size={160} duration={2.2} />
        <MushroomSprite species="oyster" size={160} duration={2.2} /> */}
        </div>
        <MushroomNetwork />
      </div>
    </>
  );
}

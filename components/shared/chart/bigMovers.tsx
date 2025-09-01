import { Bar, BarChart, LabelList, XAxis } from "recharts";

import { ChartConfig, ChartContainer } from "@/components/ui/chart";
const chartData = [
  { month: "mushroom1", desktop: 186 },
  { month: "mushroom2", desktop: 305 },
  { month: "mushroom3", desktop: 237 },
];
const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "#2563eb",
  },
} satisfies ChartConfig;
export function BigMovers() {
  return (
    <ChartContainer config={chartConfig} className="h-[200px] w-full">
      <BarChart accessibilityLayer data={chartData}>
        <XAxis
          dataKey="month"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
        />
        <Bar dataKey="desktop" fill="var(--color-desktop)" radius={4}>
          {/* ✅ Add numbers on top of bars */}
          <LabelList
            dataKey="desktop"
            position="top"
            style={{ fill: "#111827", fontSize: 12, fontWeight: 500 }}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

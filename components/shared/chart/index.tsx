// components/Chart.tsx
"use client";
import React, { useRef, useEffect } from "react";
import { createChart, AreaSeries, ColorType } from "lightweight-charts";

interface ChartProps {
  data: { time: string; value: number }[];
}

export const Chart: React.FC<ChartProps> = ({ data }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 300,
      layout: {
        background: { type: ColorType.Solid, color: "white" },
        textColor: "#333",
        attributionLogo: false,
      },
    });
    chartRef.current = chart;

    const areaSeries = chart.addSeries(AreaSeries, {
      lineColor: "#22c55e",
      topColor: "rgba(34,197,94,0.3)",
      bottomColor: "rgba(34,197,94,0.05)",
    });
    areaSeries.setData(data);

    window.addEventListener("resize", () => {
      chart.applyOptions({ width: containerRef.current!.clientWidth });
    });

    return () => {
      chart.remove();
    };
  }, [data]);

  return <div ref={containerRef} className="w-full" />;
};

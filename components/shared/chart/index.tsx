// components/Chart.tsx
"use client";
import React, { useRef, useEffect } from "react";
import { createChart, ColorType } from "lightweight-charts";

interface ChartProps {
  data: { time: string; value: number }[];
}

export const Chart: React.FC<ChartProps> = ({ data }) => {
  const containerRef = useRef<HTMLDivElement>(null);

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

    const areaSeries = chart.addAreaSeries({
      lineColor: "#22c55e",
      topColor: "rgba(34,197,94,0.3)",
      bottomColor: "rgba(34,197,94,0.05)",
    });
    areaSeriesRef.current = areaSeries;
    areaSeries.setData(data);

    const handleResize = () => {
      const width = containerRef.current?.clientWidth;
      if (!width) return;
      chart.applyOptions({ width });
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
      areaSeriesRef.current = null;
    };
  }, [data]);

  return <div ref={containerRef} className="w-full" />;
};

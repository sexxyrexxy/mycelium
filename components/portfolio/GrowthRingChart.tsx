"use client";

import { useMemo, useState } from "react";
import type { SignalDatum } from "@/hooks/useMushroomSignals";

const TAU = Math.PI * 2;

type GrowthRingChartProps = {
  data: SignalDatum[];
  width?: number;
  height?: number;
  slicesPerRing?: number;
  ringThickness?: number;
  onSliceFocus?: (slice: { signal: number; timestamp: string } | null) => void;
};

const polar = (radius: number, angle: number) => ({
  x: radius * Math.cos(angle),
  y: radius * Math.sin(angle),
});

const arcPath = (
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number
) => {
  const outerStart = polar(outerRadius, startAngle);
  const outerEnd = polar(outerRadius, endAngle);
  const innerStart = polar(innerRadius, endAngle);
  const innerEnd = polar(innerRadius, startAngle);
  const largeArc = endAngle - startAngle <= Math.PI ? "0" : "1";

  return [
    "M "+(cx + outerStart.x)+" "+(cy + outerStart.y),
    "A "+outerRadius+" "+outerRadius+" 0 "+largeArc+" 1 "+(cx + outerEnd.x)+" "+(cy + outerEnd.y),
    "L "+(cx + innerStart.x)+" "+(cy + innerStart.y),
    "A "+innerRadius+" "+innerRadius+" 0 "+largeArc+" 0 "+(cx + innerEnd.x)+" "+(cy + innerEnd.y),
    "Z",
  ].join(" ");
};

const colorForSignal = (value: number, min: number, max: number) => {
  if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max)) {
    return "#88bfb5";
  }
  const range = Math.max(max - min, 1);
  const t = (value - min) / range;
  const hue = 150 - t * 80;
  const light = 65 - t * 25;
  return `hsl(${hue} 70% ${light}%)`;
};

export function GrowthRingChart({
  data,
  width = 420,
  height = 420,
  slicesPerRing = 24,
  ringThickness = 18,
  onSliceFocus,
}: GrowthRingChartProps) {
  const { arcs, stats, canvasSize } = useMemo(() => {
    if (!data?.length) {
      return {
        arcs: [] as Array<{
          path: string;
          color: string;
          label: string;
          signal: number;
          timestamp: string;
        }>,
        stats: null,
        canvasSize: { width, height },
      };
    }

    const min = Math.min(...data.map((d) => d.signal));
    const max = Math.max(...data.map((d) => d.signal));
    const segments = Math.max(data.length, slicesPerRing);
    const ringCount = Math.max(1, Math.ceil(segments / slicesPerRing));
    const totalSlices = ringCount * slicesPerRing;

    const aggregated = Array.from({ length: totalSlices }, (_, idx) => {
      const start = Math.floor((idx / totalSlices) * data.length);
      const end = Math.floor(((idx + 1) / totalSlices) * data.length);
      const slice = data.slice(start, Math.max(end, start + 1));
      const reference = slice[Math.floor(slice.length / 2)] ?? data[start] ?? data[data.length - 1];
      const avgSignal = slice.reduce((acc, point) => acc + point.signal, 0) / slice.length;
      return {
        signal: avgSignal,
        timestamp: reference.timestamp,
      };
    });

    const desiredOuterRadius = ringThickness * 1.6 + ringCount * ringThickness;
    const minCanvasSize = desiredOuterRadius * 2 + ringThickness * 6;
    const canvasLength = Math.max(width, height, minCanvasSize);
    const centerX = canvasLength / 2;
    const centerY = canvasLength / 2;
    const availableRadius = canvasLength / 2 - ringThickness * 2.5;
    const radiusScale = desiredOuterRadius > 0 ? Math.min(1, availableRadius / desiredOuterRadius) : 1;
    const baseRadius = ringThickness * 1.6 * radiusScale;

    const generated: Array<{
      path: string;
      color: string;
      label: string;
      signal: number;
      timestamp: string;
    }> = [];

    aggregated.forEach((point, idx) => {
      const ringIndex = Math.floor(idx / slicesPerRing);
      const sliceIndex = idx % slicesPerRing;
      const innerRadius = baseRadius + ringIndex * ringThickness * radiusScale;
      const signalFactor = max === min ? 0.5 : (point.signal - min) / (max - min);
      const dynamicThickness = ringThickness * radiusScale * (0.55 + signalFactor * 0.45);
      const outerRadius = innerRadius + dynamicThickness;
      const startAngle = (sliceIndex / slicesPerRing) * TAU - Math.PI / 2;
      const endAngle = ((sliceIndex + 1) / slicesPerRing) * TAU - Math.PI / 2;
      const color = colorForSignal(point.signal, min, max);
      const label = `${new Date(point.timestamp).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })} — ${point.signal.toFixed(2)} mV`;

      generated.push({
        path: arcPath(centerX, centerY, innerRadius, outerRadius, startAngle, endAngle),
        color,
        label,
        signal: point.signal,
        timestamp: point.timestamp,
      });
    });

    const avg = data.reduce((acc, d) => acc + d.signal, 0) / data.length;
    const first = data[0]?.ms ?? null;
    const last = data.at(-1)?.ms ?? null;
    const windowMinutes = first != null && last != null ? Math.max((last - first) / (1000 * 60), 0) : 0;

    return {
      arcs: generated,
      stats: {
        min,
        max,
        avg,
        ringCount,
        windowMinutes,
      },
      canvasSize: { width: canvasLength, height: canvasLength },
    };
  }, [data, height, ringThickness, slicesPerRing, width]);

  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div className="flex flex-col items-center gap-5">
      <svg
        width={canvasSize.width}
        height={canvasSize.height}
        viewBox={`0 0 ${canvasSize.width} ${canvasSize.height}`}
        className="drop-shadow-lg"
      >
        <defs>
          <radialGradient id="growth-ring-center" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.6)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <radialGradient id="growth-ring-glow" cx="50%" cy="50%" r="55%">
            <stop offset="0%" stopColor="rgba(94,234,212,0.45)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
        <circle
          cx={canvasSize.width / 2}
          cy={canvasSize.height / 2}
          r={ringThickness * 1.6}
          fill="url(#growth-ring-glow)"
        />
        <circle
          cx={canvasSize.width / 2}
          cy={canvasSize.height / 2}
          r={ringThickness * 1.05}
          fill="url(#growth-ring-center)"
        />
        {stats ? (
          <text
            x={canvasSize.width / 2}
            y={canvasSize.height / 2}
            textAnchor="middle"
            className="select-none"
            fontSize={18}
            fontWeight={700}
            fill="hsl(var(--foreground))"
          >
            {stats.avg.toFixed(1)} mV
          </text>
        ) : null}
        {arcs.map((arc, idx) => (
          <path
            key={idx}
            d={arc.path}
            fill={arc.color}
            fillOpacity={hovered === idx ? 1 : 0.85}
            stroke={hovered === idx ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.35)"}
            strokeWidth={hovered === idx ? 1.2 : 0.5}
            onMouseEnter={() => {
              setHovered(idx);
              onSliceFocus?.({ signal: arc.signal, timestamp: arc.timestamp });
            }}
            onMouseLeave={() => {
              setHovered(null);
              onSliceFocus?.(null);
            }}
            className="transition-all duration-200 ease-out"
          >
            <title>{arc.label}</title>
          </path>
        ))}
      </svg>
      {stats ? (
        <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
          <span>
            Avg <strong className="text-foreground">{stats.avg.toFixed(2)} mV</strong>
          </span>
          <span>
            Low <strong className="text-foreground">{stats.min.toFixed(2)} mV</strong>
          </span>
          <span>
            High <strong className="text-foreground">{stats.max.toFixed(2)} mV</strong>
          </span>
          {stats.windowMinutes ? (
            <span>Window ≈ {stats.windowMinutes.toFixed(1)} min</span>
          ) : null}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">No signal data available.</div>
      )}
    </div>
  );
}

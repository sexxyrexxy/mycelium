// components/portfolio/RealTimeChart.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type {
  ChartOptions,
  DeepPartial,
  IChartApi,
  ISeriesApi,
  LineSeriesPartialOptions,
  MouseEventParams,
  SeriesDataItemTypeMap,
  Time,
} from "lightweight-charts";

export type Point = { time: Time; value: number };

const TIME_KEYS = ["t", "time", "timestamp", "Timestamp"] as const;
const VALUE_KEYS = ["v", "value", "signal", "Signal_mV"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

const pickValue = (
  record: Record<string, unknown>,
  keys: readonly string[],
) => {
  for (const key of keys) {
    if (key in record) {
      return record[key];
    }
  }
  return undefined;
};

function unwrapTimestamp(input: unknown): string | number | null {
  if (input == null) return null;
  if (typeof input === "string" || typeof input === "number") return input;
  if (isRecord(input) && "value" in input) {
    return unwrapTimestamp(input.value);
  }
  return null;
}

function mapRawPoint(raw: unknown): Point | null {
  if (!isRecord(raw)) return null;
  const timeCandidate = unwrapTimestamp(pickValue(raw, TIME_KEYS));
  if (timeCandidate == null) return null;

  const valueCandidate = pickValue(raw, VALUE_KEYS);
  if (valueCandidate == null) return null;

  const numericValue =
    typeof valueCandidate === "number" ? valueCandidate : Number(valueCandidate);
  if (!Number.isFinite(numericValue)) return null;

  return {
    time: toTime(timeCandidate),
    value: numericValue,
  };
}

// ---------- helpers ----------
const hms = (secs: number) => {
  const s = Math.max(0, Math.floor(secs));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

function toTime(x: string | number): Time {
  if (typeof x === "number" && Number.isFinite(x)) return Math.floor(x) as unknown as Time;
  const s = String(x).trim();
  const m = s.match(/^(\d+):(\d{2}):(\d{2})(?:\.\d+)?$/);
  if (m) {
    const h = +m[1], mm = +m[2], ss = +m[3];
    return (h * 3600 + mm * 60 + ss) as unknown as Time;
  }
  const n = Number(s);
  if (Number.isFinite(n)) return (n >= 1e11 ? Math.floor(n / 1000) : Math.floor(n)) as unknown as Time;
  const ts = Date.parse(s);
  return Math.floor((Number.isNaN(ts) ? 0 : ts) / 1000) as unknown as Time;
}

function estimateDeltaSec(points: Point[]): number {
  const n = Math.min(points.length, 1000);
  const diffs: number[] = [];
  for (let i = 1; i < n; i++) {
    const d = Number(points[i].time) - Number(points[i - 1].time);
    if (Number.isFinite(d) && d > 0) diffs.push(d);
  }
  if (!diffs.length) return 1;
  diffs.sort((a, b) => a - b);
  return diffs[Math.floor(diffs.length / 2)] || 1;
}

// amplitude: rolling half peak-to-peak (O(n) deques)
function amplitudeHalfP2P(points: Point[], windowSec: number): Point[] {
  if (!points.length) return [];
  const dt = Math.max(estimateDeltaSec(points), 1e-9);
  const W = Math.max(1, Math.round(windowSec / dt));
  const out: Point[] = [];
  const maxQ: number[] = [], minQ: number[] = [];
  const pushMax = (i: number) => {
    const v = points[i].value as number;
    while (maxQ.length && (points[maxQ[maxQ.length - 1]].value as number) <= v) maxQ.pop();
    maxQ.push(i);
  };
  const pushMin = (i: number) => {
    const v = points[i].value as number;
    while (minQ.length && (points[minQ[minQ.length - 1]].value as number) >= v) minQ.pop();
    minQ.push(i);
  };
  for (let i = 0; i < points.length; i++) {
    pushMax(i); pushMin(i);
    const left = i - W + 1;
    while (maxQ.length && maxQ[0] < left) maxQ.shift();
    while (minQ.length && minQ[0] < left) minQ.shift();
    const vmax = points[maxQ[0]].value as number;
    const vmin = points[minQ[0]].value as number;
    out.push({ time: points[i].time, value: (vmax - vmin) / 2 });
  }
  return out;
}

// rate of change (slope per second) via rolling least-squares
function rateOfChangeSlope(points: Point[], windowSec: number): Point[] {
  if (!points.length) return [];
  const dt = Math.max(estimateDeltaSec(points), 1e-9);
  const W = Math.max(1, Math.round(windowSec / dt));
  const out: Point[] = [];
  const tBuf: number[] = [], yBuf: number[] = [];
  let n = 0, St = 0, Sy = 0, Stt = 0, Sty = 0;
  const add = (ti: number, yi: number) => { tBuf.push(ti); yBuf.push(yi); n++; St += ti; Sy += yi; Stt += ti*ti; Sty += ti*yi; };
  const remove = () => { const ti = tBuf.shift()!, yi = yBuf.shift()!; n--; St -= ti; Sy -= yi; Stt -= ti*ti; Sty -= ti*yi; };
  for (let i = 0; i < points.length; i++) {
    const ti = Number(points[i].time), yi = points[i].value as number;
    add(ti, yi); if (n > W) remove();
    const denom = n * Stt - St * St;
    const m = Math.abs(denom) < 1e-12 ? 0 : (n * Sty - St * Sy) / denom;
    out.push({ time: points[i].time, value: m });
  }
  return out;
}

// ---------- component ----------
export default function RealTimeChart({
  mushId,
  height = 420,
  backfillLimit = 2000,
  maxPoints = 6000,
}: {
  mushId: number | string;
  height?: number;
  backfillLimit?: number;
  maxPoints?: number;
}) {
  // live data state (instead of `data` prop)
  const [points, setPoints] = useState<Point[]>([]);

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi<Time> | null>(null);
  const seriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const ampSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const rocSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const esRef = useRef<EventSource | null>(null);

  // fixed windows
  const AMP_WINDOW_SEC = 60;
  const ROC_WINDOW_SEC = 60;

  // toggles
  const [showAmp, setShowAmp] = useState(true);
  const [showROC, setShowROC] = useState(true);

  // sorted + derived
  const sorted = useMemo(
    () => (points ?? []).slice().sort((a, b) => Number(a.time) - Number(b.time)),
    [points]
  );
  const ampData = useMemo(() => amplitudeHalfP2P(sorted, AMP_WINDOW_SEC), [sorted]);
  const rocData = useMemo(() => rateOfChangeSlope(sorted, ROC_WINDOW_SEC), [sorted]);

  // create chart once (reinitializes on height change for simplicity)
  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      const { createChart, ColorType, LineStyle } = await import("lightweight-charts");
      if (disposed) return;

      const el = containerRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const initWidth = Math.max(320, Math.floor(rect.width) || 320);

      const chartOptions: DeepPartial<ChartOptions> = {
        width: initWidth,
        height,
        layout: {
          background: { type: ColorType.Solid, color: "#ffffff" },
          textColor: "#111827",
          attributionLogo: false,
        },
        grid: {
          vertLines: { color: "#e5e7eb", style: LineStyle.Solid },
          horzLines: { color: "#e5e7eb", style: LineStyle.Solid },
        },
        leftPriceScale: { visible: false, borderVisible: false },
        rightPriceScale: { borderVisible: false },
        timeScale: {
          timeVisible: true,
          secondsVisible: true,
          borderVisible: false,
          minBarSpacing: 0.01,
        },
        crosshair: { mode: 1 },
      };

      const chart = createChart(el, chartOptions);
      chartRef.current = chart;

      const baseLineOptions: LineSeriesPartialOptions = {
        lineWidth: 2,
        priceLineVisible: false,
      };
      seriesRef.current = chart.addLineSeries(baseLineOptions);
      ampSeriesRef.current = chart.addLineSeries({
        ...baseLineOptions,
        color: "#10b981",
      });
      rocSeriesRef.current = chart.addLineSeries({
        ...baseLineOptions,
        color: "#f59e0b",
      });

      const tooltip = document.createElement("div");
      tooltip.style.position = "absolute";
      tooltip.style.pointerEvents = "none";
      tooltip.style.zIndex = "10";
      tooltip.style.padding = "6px 8px";
      tooltip.style.borderRadius = "8px";
      tooltip.style.fontSize = "12px";
      tooltip.style.background = "#fff";
      tooltip.style.border = "1px solid #e5e7eb";
      tooltip.style.boxShadow = "0 4px 12px rgba(0,0,0,0.12)";
      tooltip.style.display = "none";
      wrapRef.current?.appendChild(tooltip);
      tooltipRef.current = tooltip;

      const getPointValue = (point?: SeriesDataItemTypeMap["Line"]) =>
        point && "value" in point && typeof point.value === "number"
          ? point.value
          : undefined;

      const onMove = (param: MouseEventParams<Time>) => {
        const tooltipEl = tooltipRef.current;
        const baseSeries = seriesRef.current;
        if (!tooltipEl || !baseSeries) return;
        if (!param.point || !param.time) {
          tooltipEl.style.display = "none";
          return;
        }

        const basePoint = param.seriesData.get(baseSeries);
        if (!basePoint) {
          tooltipEl.style.display = "none";
          return;
        }

        const ampSeries = ampSeriesRef.current;
        const rocSeries = rocSeriesRef.current;

        const baseValue = getPointValue(basePoint);
        if (baseValue === undefined) {
          tooltipEl.style.display = "none";
          return;
        }

        const ampValue = ampSeries ? getPointValue(param.seriesData.get(ampSeries)) : undefined;
        const rocValue = rocSeries ? getPointValue(param.seriesData.get(rocSeries)) : undefined;

        const timeLabel =
          typeof param.time === "number"
            ? hms(param.time)
            : String(param.time);

        const ampRow =
          ampValue !== undefined
            ? `<div>amplitude: <b>${ampValue.toFixed(4)}</b></div>`
            : "";
        const rocRow =
          rocValue !== undefined
            ? `<div>rate: <b>${rocValue.toFixed(4)}</b> /s</div>`
            : "";

        tooltipEl.innerHTML = `<div style="font-weight:600;margin-bottom:4px">${timeLabel}</div><div>value: <b>${baseValue.toFixed(4)}</b></div>${ampRow}${rocRow}`;
        tooltipEl.style.left = `${param.point.x + 12}px`;
        tooltipEl.style.top = `${param.point.y + 12}px`;
        tooltipEl.style.display = "block";
      };

      chart.subscribeCrosshairMove(onMove);

      const resizeObserver = new ResizeObserver(() => {
        const { width, height: h } = el.getBoundingClientRect();
        chart.applyOptions({
          width: Math.max(200, Math.floor(width)),
          height: Math.max(200, Math.floor(h)),
        });
      });
      resizeObserver.observe(el);

      cleanup = () => {
        chart.unsubscribeCrosshairMove(onMove);
        resizeObserver.disconnect();
        tooltip.remove();
        chart.remove();
        seriesRef.current = null;
        ampSeriesRef.current = null;
        rocSeriesRef.current = null;
        chartRef.current = null;
        tooltipRef.current = null;
      };
    })();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [height]);

  useEffect(() => { if (chartRef.current) chartRef.current.applyOptions({ height }); }, [height]);

  // initial backfill + live SSE
  useEffect(() => {
    let cancelled = false;

    // backfill from REST
    const backfill = async () => {
      try {
        const res = await fetch(
          `/api/mushroom/${encodeURIComponent(String(mushId))}?limit=${backfillLimit}`,
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as unknown;

        let rows: unknown[] = [];
        if (isRecord(json)) {
          for (const key of ["signals", "points", "rows"] as const) {
            const candidate = json[key];
            if (Array.isArray(candidate)) {
              rows = candidate;
              break;
            }
          }
        } else if (Array.isArray(json)) {
          rows = json;
        }

        const seed = rows
          .map(mapRawPoint)
          .filter((p): p is Point => Boolean(p))
          .sort((a, b) => Number(a.time) - Number(b.time))
          .slice(-maxPoints);
        if (!cancelled) setPoints(seed);
      } catch (error) {
        if (!cancelled) setPoints([]); // still allow live stream
      }
    };

    // live stream via SSE
    const connect = () => {
      esRef.current?.close();
      const es = new EventSource(`/api/mushroom/${encodeURIComponent(String(mushId))}/stream`);
      esRef.current = es;

      es.onmessage = (ev) => {
        try {
          const parsed = JSON.parse(ev.data) as unknown;
          const point = mapRawPoint(parsed);
          if (!point) return;
          setPoints((prev) => {
            const next = prev.concat(point);
            return next.length > maxPoints ? next.slice(next.length - maxPoints) : next;
          });
        } catch {
          /* ignore malformed packet */
        }
      };

      es.addEventListener("snapshot", (ev) => {
        try {
          const parsed = JSON.parse((ev as MessageEvent).data) as unknown;
          if (!Array.isArray(parsed)) return;
          const seed = parsed
            .map(mapRawPoint)
            .filter((p): p is Point => Boolean(p))
            .sort((a, b) => Number(a.time) - Number(b.time))
            .slice(-maxPoints);
          setPoints(seed);
        } catch {
          /* ignore snapshot parse errors */
        }
      });
    };

    backfill().finally(() => { if (!cancelled) connect(); });

    return () => {
      cancelled = true;
      esRef.current?.close();
      esRef.current = null;
    };
  }, [mushId, backfillLimit, maxPoints]);

  // update base series + visible range when `sorted` changes
  useEffect(() => {
    if (!seriesRef.current) return;
    seriesRef.current.setData(sorted);
    if (sorted.length) {
      const from = Number(sorted[Math.max(0, sorted.length - Math.min(sorted.length, 3000))].time);
      const to = Number(sorted[sorted.length - 1].time);
      const ts = chartRef.current?.timeScale?.();
      ts?.setVisibleRange?.({ from, to });
    }
  }, [sorted]);

  // overlays update
  useEffect(() => { if (ampSeriesRef.current) ampSeriesRef.current.setData(showAmp ? ampData : []); }, [showAmp, ampData]);
  useEffect(() => { if (rocSeriesRef.current) rocSeriesRef.current.setData(showROC ? rocData : []); }, [showROC, rocData]);

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
        <button
          onClick={() => chartRef.current?.timeScale?.().fitContent?.()}
          style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "1px solid #e5e7eb" }}
        >
          Reset Zoom
        </button>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}>
          <input type="checkbox" checked={showAmp} onChange={(e) => setShowAmp(e.target.checked)} />
          Show amplitude (60s)
        </label>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, marginLeft: 8 }}>
          <input type="checkbox" checked={showROC} onChange={(e) => setShowROC(e.target.checked)} />
          Show rate (60s)
        </label>
      </div>
      <div ref={containerRef} style={{ width: "100%", height }} />
    </div>
  );
}

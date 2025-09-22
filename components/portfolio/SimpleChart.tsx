// components/ui/SimpleChart.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Time } from "lightweight-charts";

export type Point = { time: Time; value: number };

// ---------- helpers ----------
const hms = (secs: number) => {
  const s = Math.max(0, Math.floor(secs));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

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
export default function SimpleChart({ data, height }: { data: Point[]; height?: number }) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);
  const ampSeriesRef = useRef<any>(null);
  const rocSeriesRef = useRef<any>(null);
  const spikeUpHistRef = useRef<any>(null);
  const spikeDnHistRef = useRef<any>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  // fixed windows
  const AMP_WINDOW_SEC = 60;
  const ROC_WINDOW_SEC = 60;

  // toggles
  const [showAmp, setShowAmp] = useState(true);
  const [showROC, setShowROC] = useState(true);

  // sorted + derived
  const sorted = useMemo(() => (data ?? []).slice().sort((a, b) => Number(a.time) - Number(b.time)), [data]);
  const ampData = useMemo(() => amplitudeHalfP2P(sorted, AMP_WINDOW_SEC), [sorted]);
  const rocData = useMemo(() => rateOfChangeSlope(sorted, ROC_WINDOW_SEC), [sorted]);
 
  // create chart once
  useEffect(() => {
    let cleanup = () => {};
    (async () => {
      const LWC = await import("lightweight-charts");
      const { createChart, ColorType, LineStyle } = LWC;

      const el = containerRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const initWidth = Math.max(320, Math.floor(rect.width) || 320);

      const chart = createChart(el, {
        width: initWidth,
        height,
        layout: { background: { type: ColorType.Solid, color: "#ffffff" }, textColor: "#111827", attributionLogo: false },
        grid: {
          
          vertLines: { color: "#e5e7eb", style: LineStyle.Solid },
          horzLines: { color: "#e5e7eb", style: LineStyle.Solid },
        },
        leftPriceScale: { visible: false, borderVisible: false },
        rightPriceScale: { borderVisible: false },
        timeScale: { timeVisible: true, secondsVisible: true, borderVisible: false, minBarSpacing: 0.01 },
        crosshair: { mode: 1 },
      });
      chartRef.current = chart;

      const anyChart = chart as any;
      const mkLine = (opts: any) =>
        typeof anyChart.addSeries === "function" && (LWC as any).LineSeries
          ? anyChart.addSeries((LWC as any).LineSeries, opts)
          : anyChart.addLineSeries(opts);
      const mkHist = (opts: any) =>
        typeof anyChart.addSeries === "function" && (LWC as any).HistogramSeries
          ? anyChart.addSeries((LWC as any).HistogramSeries, opts)
          : anyChart.addHistogramSeries(opts);

      seriesRef.current = mkLine({ lineWidth: 2, priceLineVisible: false });
      ampSeriesRef.current = mkLine({ lineWidth: 2, priceLineVisible: false, color: "#10b981" });
      rocSeriesRef.current = mkLine({ lineWidth: 2, priceLineVisible: false, color: "#f59e0b" });

      spikeUpHistRef.current = mkHist({ priceScaleId: "left", base: 0, color: "#ef4444", priceLineVisible: false });
      spikeDnHistRef.current = mkHist({ priceScaleId: "left", base: 0, color: "#3b82f6", priceLineVisible: false });

      // tooltip
      const tip = document.createElement("div");
      tip.style.position = "absolute";
      tip.style.pointerEvents = "none";
      tip.style.zIndex = "10";
      tip.style.padding = "6px 8px";
      tip.style.borderRadius = "8px";
      tip.style.fontSize = "12px";
      tip.style.background = "#fff";
      tip.style.border = "1px solid #e5e7eb";
      tip.style.boxShadow = "0 4px 12px rgba(0,0,0,0.12)";
      tip.style.display = "none";
      wrapRef.current?.appendChild(tip);
      tooltipRef.current = tip;

      const onMove = (param: any) => {
        if (!tooltipRef.current) return;
        const t = tooltipRef.current;
        if (!param.point || !param.time) { t.style.display = "none"; return; }

        const baseP = param.seriesData.get(seriesRef.current);
        const ampP  = ampSeriesRef.current ? param.seriesData.get(ampSeriesRef.current) : undefined;
        const rocP  = rocSeriesRef.current ? param.seriesData.get(rocSeriesRef.current) : undefined;
        if (!baseP || baseP.value === undefined) { t.style.display = "none"; return; }

        const timeLabel = typeof param.time === "number" ? hms(param.time as number) : String(param.time);
        const baseRow = `<div>value: <b>${Number(baseP.value).toFixed(4)}</b></div>`;
        const ampRow  = ampP && ampP.value !== undefined ? `<div>amplitude: <b>${Number(ampP.value).toFixed(4)}</b></div>` : "";
        const rocRow  = rocP && rocP.value !== undefined ? `<div>rate: <b>${Number(rocP.value).toFixed(4)}</b> /s</div>` : "";

        t.innerHTML = `<div style="font-weight:600;margin-bottom:4px">${timeLabel}</div>${baseRow}${ampRow}${rocRow}`;
        t.style.left = `${param.point.x + 12}px`;
        t.style.top  = `${param.point.y + 12}px`;
        t.style.display = "block";
      };
      chart.subscribeCrosshairMove(onMove);

      const ro = new ResizeObserver(() => {
        const { width, height: h } = el.getBoundingClientRect();
        chart.applyOptions({ width: Math.max(200, Math.floor(width)), height: Math.max(200, Math.floor(h)) });
      });
      ro.observe(el);

      cleanup = () => {
        chart.unsubscribeCrosshairMove(onMove);
        ro.disconnect();
        tip.remove();
        chart.remove();
        seriesRef.current = ampSeriesRef.current = rocSeriesRef.current = null;
        spikeUpHistRef.current = spikeDnHistRef.current = null;
        chartRef.current = tooltipRef.current = null;
      };
    })();
    return () => cleanup();
  }, []);

  useEffect(() => { if (chartRef.current) chartRef.current.applyOptions({ height }); }, [height]);

  // base series + visible range on data change
  useEffect(() => {
    if (!seriesRef.current) return;
    seriesRef.current.setData(sorted);
    if (sorted.length) {
      const from = Number(sorted[0].time), to = Number(sorted[sorted.length - 1].time);
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

        {/* Amplitude toggle (fixed 60s window) */}
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}>
          <input type="checkbox" checked={showAmp} onChange={(e) => setShowAmp(e.target.checked)} />
          Show amplitude (60s)
        </label>

        {/* Rate toggle (fixed 2s window) */}
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, marginLeft: 8 }}>
          <input type="checkbox" checked={showROC} onChange={(e) => setShowROC(e.target.checked)} />
          Show rate (2s)
        </label>
      </div>

      <div ref={containerRef} style={{ width: "100%", height }} />
    </div>
  );
}

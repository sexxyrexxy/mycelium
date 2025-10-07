"use client";

import { useEffect, useMemo, useState } from "react";

export type TimelineRange = "rt" | "4h" | "12h" | "1d" | "3d" | "1w" | "all";

export type SignalDatum = {
  timestamp: string;
  signal: number;
  ms: number;
};

const RANGE_ORDER: TimelineRange[] = ["rt", "4h", "12h", "1d", "3d", "1w", "all"];

const CACHE_TTL_MS = 30_000;
const rangeCache = new Map<string, { data: SignalDatum[]; fetchedAt: number }>();

export const TIMELINE_OPTIONS: { id: TimelineRange; label: string }[] = [
  { id: "rt", label: "Real Time" },
  { id: "4h", label: "Last 4 Hours" },
  { id: "12h", label: "Last 12 Hours" },
  { id: "1d", label: "Last Day" },
  { id: "3d", label: "Last 3 Days" },
  { id: "1w", label: "Last Week" },
  { id: "all", label: "All Time" },
];

type ApiSignal = { timestamp?: string; signal?: number | null };

const parseSignals = (signals: ApiSignal[] = []): SignalDatum[] => {
  const parsed: SignalDatum[] = [];
  for (const item of signals) {
    if (!item || item.signal == null || !item.timestamp) continue;
    const ms = Date.parse(item.timestamp);
    if (!Number.isFinite(ms)) continue;
    const signal = Number(item.signal);
    if (!Number.isFinite(signal)) continue;
    parsed.push({ timestamp: new Date(ms).toISOString(), signal, ms });
  }
  parsed.sort((a, b) => a.ms - b.ms);
  return parsed;
};

const TARGET_POINTS: Record<TimelineRange, number> = {
  rt: 360,
  "4h": 720,
  "12h": 720,
  "1d": 600,
  "3d": 480,
  "1w": 420,
  "all": 360,
};

const downsampleSeries = (series: SignalDatum[], range: TimelineRange) => {
  if (range === "rt") return series;
  const target = TARGET_POINTS[range] ?? 600;
  if (series.length <= target) return series;

  const bucketSize = Math.ceil(series.length / target);
  const buckets: SignalDatum[] = [];

  for (let i = 0; i < series.length; i += bucketSize) {
    const bucket = series.slice(i, i + bucketSize);
    if (!bucket.length) continue;
    const avg =
      bucket.reduce((acc, cur) => acc + cur.signal, 0) / bucket.length;
    const mid = bucket[Math.floor(bucket.length / 2)] ?? bucket[0];
    buckets.push({
      timestamp: mid.timestamp,
      ms: mid.ms,
      signal: avg,
    });
  }

  return buckets;
};

export function useMushroomSignals(mushId?: string | null) {
  const [selectedRange, setSelectedRange] = useState<TimelineRange>("rt");
  const [dataByRange, setDataByRange] = useState<Partial<Record<TimelineRange, SignalDatum[]>>>({});
  const [errorByRange, setErrorByRange] = useState<Partial<Record<TimelineRange, string>>>({});
  const [pendingRange, setPendingRange] = useState<TimelineRange | null>(null);
  const [lastUpdatedByRange, setLastUpdatedByRange] = useState<Partial<Record<TimelineRange, number>>>({});

  useEffect(() => {
    setSelectedRange("rt");
    setDataByRange({});
    setErrorByRange({});
    setPendingRange(null);
    setLastUpdatedByRange({});
  }, [mushId]);

  useEffect(() => {
    if (!mushId) {
      return;
    }

    const range = selectedRange;
    const apiRange = range === "rt" ? "4h" : range;
    const key = `${mushId}:${range}`;
    const now = Date.now();
    const cached = rangeCache.get(key);

    if (cached) {
      setDataByRange((prev) => ({ ...prev, [range]: cached.data }));
      setLastUpdatedByRange((prev) => ({ ...prev, [range]: cached.fetchedAt }));
      setErrorByRange((prev) => ({ ...prev, [range]: undefined }));
      if (now - cached.fetchedAt < CACHE_TTL_MS) {
        setPendingRange((prev) => (prev === range ? null : prev));
        return;
      }
    }

    const controller = new AbortController();
    let cancelled = false;

    setPendingRange(range);
    setErrorByRange((prev) => ({ ...prev, [range]: undefined }));

    const load = async () => {
      try {
        const res = await fetch(
          `/api/mushroom/${encodeURIComponent(mushId)}?range=${apiRange}`,
          {
            cache: "no-store",
            signal: controller.signal,
          }
        );
        if (!res.ok) throw new Error(`API ${res.status}`);
        const payload = await res.json();
        const parsed = parseSignals(payload?.signals ?? []);
        if (cancelled) return;
        const fetchedAt = Date.now();
        setDataByRange((prev) => ({
          ...prev,
          [range]: parsed,
          ...(range === "rt" ? { "4h": parsed } : {}),
        }));
        setLastUpdatedByRange((prev) => ({
          ...prev,
          [range]: fetchedAt,
          ...(range === "rt" ? { "4h": fetchedAt } : {}),
        }));
        rangeCache.set(key, { data: parsed, fetchedAt });
        if (range === "rt") {
          rangeCache.set(`${mushId}:4h`, { data: parsed, fetchedAt });
        }
      } catch (err: any) {
        if (cancelled) return;
        setErrorByRange((prev) => ({
          ...prev,
          [range]: err?.message ?? "Failed to load signals",
        }));
        if (!cached) {
          setDataByRange((prev) => ({ ...prev, [range]: [] }));
          setLastUpdatedByRange((prev) => ({ ...prev, [range]: undefined }));
        }
      } finally {
        if (!cancelled) {
          setPendingRange((prev) => (prev === range ? null : prev));
        }
      }
    };

    load();

    return () => {
      cancelled = true;
      controller.abort();
      setPendingRange((prev) => (prev === range ? null : prev));
    };
  }, [mushId, selectedRange]);

  const sourceData = dataByRange[selectedRange] ?? [];
  const viewData = useMemo(
    () => downsampleSeries(sourceData, selectedRange),
    [sourceData, selectedRange]
  );

  const stats = useMemo(() => {
    if (!sourceData.length) {
      return { average: null, total: null, latest: null };
    }
    const total = sourceData.reduce((acc, cur) => acc + cur.signal, 0);
    const average = total / sourceData.length;
    const latest = sourceData[sourceData.length - 1];
    return {
      total,
      average,
      latest,
    };
  }, [sourceData]);

  const mergedData = useMemo(() => {
    const dedup = new Map<number, SignalDatum>();
    for (const range of RANGE_ORDER) {
      const items = dataByRange[range];
      if (!items) continue;
      for (const item of items) {
        dedup.set(item.ms, item);
      }
    }
    return Array.from(dedup.values()).sort((a, b) => a.ms - b.ms);
  }, [dataByRange]);

  const hasHistory = mergedData.length > 0;
  const error = errorByRange[selectedRange] ?? null;
  const lastUpdated = lastUpdatedByRange[selectedRange] ?? null;
  const isLoading = !dataByRange[selectedRange] && pendingRange === selectedRange;
  const isRefetching = Boolean(
    pendingRange && pendingRange === selectedRange && dataByRange[selectedRange]
  );

  return {
    data: mergedData,
    ranges: dataByRange,
    viewData,
    rangeData: sourceData,
    selectedRange,
    setSelectedRange,
    rangeOrder: RANGE_ORDER,
    options: TIMELINE_OPTIONS,
    loading: Boolean(isLoading),
    isRefetching,
    pendingRange,
    error,
    stats,
    lastUpdated,
    hasHistory,
  } as const;
}

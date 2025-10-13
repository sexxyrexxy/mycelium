// components/portfolio/sonification/SonificationPanel.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useMushroomSignals,
  type TimelineRange,
  type SignalDatum,
} from "@/hooks/useMushroomSignals";
import { classifySignalWindows, type SignalWindowsAnalysis } from "@/lib/signalClassification";

type Props = {
  mushId?: string | null;
  range?: TimelineRange;
};

type SunoTrack = {
  id: string;
  audioUrl?: string;
  streamAudioUrl?: string;
  title?: string;
  tags?: string;
  duration?: number;
};

type SunoStatusResponse = {
  status: string;
  response?: { sunoData?: SunoTrack[] };
};

const RANGE_LABELS: Record<TimelineRange, string> = {
  rt: "Real Time",
  "4h": "Last 4 Hours",
  "12h": "Last 12 Hours",
  "1d": "Last Day",
  "3d": "Last 3 Days",
  "1w": "Last Week",
  all: "All Time",
};

const DEFAULT_RANGE: TimelineRange = "1d";

function toSamples(data: SignalDatum[]): { samples: { signal: number; timestampMs: number }[] } {
  if (!data.length) {
    return { samples: [] };
  }
  const samples = data.map((datum) => ({
    signal: datum.signal,
    timestampMs: datum.ms,
  }));
  return { samples };
}

function describeAnalysis(analysis: SignalWindowsAnalysis | null, range: TimelineRange) {
  if (!analysis) return null;
  const startMs = analysis.windows[0]?.startMs ?? 0;
  const endMs = analysis.windows.at(-1)?.endMs ?? startMs;
  const durationMs = Math.max(endMs - startMs, 0);
  const hours = durationMs ? durationMs / (1000 * 60 * 60) : null;
  return {
    rangeLabel: RANGE_LABELS[range] ?? range.toUpperCase(),
    totalSamples: analysis.globalStats.count,
    windowCount: analysis.windows.length,
    hours,
  };
}

export function SonificationPanel({ mushId, range = DEFAULT_RANGE }: Props) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>("idle");
  const [error, setError] = useState<string | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [fullUrl, setFullUrl] = useState<string | null>(null);
  const taskIdRef = useRef<string | null>(null);

  const {
    rangeData,
    viewData,
    selectedRange,
    setSelectedRange,
    loading: signalsLoading,
    error: signalsError,
  } = useMushroomSignals(mushId);

  useEffect(() => {
    if (!mushId) return;
    if (selectedRange !== range) {
      setSelectedRange(range);
    }
  }, [mushId, range, selectedRange, setSelectedRange]);

  const analysisSource = useMemo<SignalDatum[]>(
    () => (rangeData.length ? rangeData : viewData),
    [rangeData, viewData]
  );

  const { samples } = useMemo(() => toSamples(analysisSource), [analysisSource]);

  const analysis: SignalWindowsAnalysis | null = useMemo(() => {
    if (!samples.length) return null;
    return classifySignalWindows(samples);
  }, [samples]);

  const analysisSummary = useMemo(
    () => describeAnalysis(analysis, range),
    [analysis, range]
  );

  const displayRange = analysisSummary?.rangeLabel ?? RANGE_LABELS[range] ?? RANGE_LABELS[DEFAULT_RANGE];

  const onHear = useCallback(async () => {
    if (busy) return;
    if (!analysis || !analysis.windows.length) {
      setError("Signal windows are still loading. Try again shortly.");
      setStatus("error");
      return;
    }

    setBusy(true);
    setError(null);
    setStatus("preparing");
    setStreamUrl(null);
    setFullUrl(null);
    taskIdRef.current = null;

    try {
      const mod = await import("@/components/portfolio/sonification/sonify");
      if (typeof mod.mapSignalToSuno !== "function") {
        console.error("sonify exports:", Object.keys(mod));
        throw new Error("mapSignalToSuno is not exported from sonify.ts");
      }
      const body = mod.mapSignalToSuno(analysis);

      const genRes = await fetch("/api/suno/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const genJson = await genRes.json();
      if (!genRes.ok || !genJson?.taskId) {
        throw new Error(genJson?.error ?? "Failed to start Suno generation");
      }
      taskIdRef.current = genJson.taskId;
      setStatus("queued");

      let keepPolling = true;
      while (keepPolling) {
        const tid = taskIdRef.current!;
        const res = await fetch(`/api/suno/status?taskId=${encodeURIComponent(tid)}`, {
          cache: "no-store",
        });
        const data: SunoStatusResponse = await res.json();

        if (!res.ok) {
          throw new Error((data as any)?.error ?? "Status request failed");
        }

        setStatus(data.status ?? "unknown");

        const track = data?.response?.sunoData?.[0];
        if (track?.streamAudioUrl) {
          setStreamUrl((prev) => prev ?? track.streamAudioUrl ?? null);
        }
        if (track?.audioUrl) {
          setFullUrl((prev) => prev ?? track.audioUrl ?? null);
        }

        if (data.status === "SUCCESS" || data.status === "FAIL") {
          keepPolling = false;
        } else {
          // eslint-disable-next-line no-await-in-loop
          await new Promise((r) => setTimeout(r, 5000));
        }
      }
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setStatus("error");
    } finally {
      setBusy(false);
    }
  }, [analysis, busy]);

  useEffect(() => {
    return () => {
      taskIdRef.current = null;
    };
  }, []);

  const signalLoadingState = signalsLoading && !analysis;
  const disableButton = busy || !mushId || signalLoadingState || !analysis;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hear your Mushroom</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Generates music from your mushroom’s electrical signals via Suno. Source:{" "}
          <span className="text-xs font-medium">
            BigQuery · {displayRange}
            {analysisSummary?.windowCount != null ? ` · ${analysisSummary.windowCount} windows` : ""}
            {analysisSummary?.totalSamples != null ? ` · ${analysisSummary.totalSamples} samples` : ""}
          </span>
        </p>

        {signalsError && (
          <p className="text-xs text-rose-600">
            Failed to load signals: {signalsError}
          </p>
        )}

        <button
          onClick={onHear}
          disabled={disableButton}
          className="px-4 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {busy ? "Working…" : mushId ? "Hear your Mushroom" : "Select a mushroom"}
        </button>

        <div className="text-sm">
          <div>Status: {signalLoadingState ? "loading signals…" : status}</div>
          {error && <div className="text-rose-600">Error: {error}</div>}
        </div>

        {streamUrl && (
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Streaming preview:</div>
            <audio controls src={streamUrl}>
              Your browser does not support audio.
            </audio>
          </div>
        )}

        {fullUrl && (
          <div className="text-sm">
            <a className="underline" href={fullUrl} target="_blank" rel="noreferrer">
              Open full MP3
            </a>
          </div>
        )}

        {!mushId && (
          <p className="text-xs text-muted-foreground">
            Pick a mushroom to enable sonification.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

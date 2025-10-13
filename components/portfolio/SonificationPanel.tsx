// components/portfolio/sonification/SonificationPanel.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useMushroomSignals,
  type TimelineRange,
  type SignalDatum,
} from "@/hooks/useMushroomSignals";
import {
  classifySignalWindows,
  type SignalWindowsAnalysis,
} from "@/lib/signalClassification";

type SonifyModule = typeof import("./sonification/sonify");

type Props = {
  mushId?: string | null;
  range?: TimelineRange;
};

type SunoTrack = {
  id: string;
  model?: string;
  audioUrl?: string;
  streamAudioUrl?: string;
  title?: string;
  tags?: string;
  duration?: number;
};

type SunoStatusResponse = {
  status: string;
  response?: {
    sunoData?: SunoTrack[];
    data?: unknown;
    [key: string]: unknown;
  };
  data?: unknown;
  sunoData?: SunoTrack[];
  error?: string;
};

function normalizeTrack(raw: any): SunoTrack | null {
  if (!raw || typeof raw !== "object") return null;

  const idCandidate =
    raw.id ??
    raw.audioId ??
    raw.audio_id ??
    raw.songId ??
    raw.trackId ??
    raw.clipId ??
    raw.parentId;
  if (!idCandidate) return null;

  const modelCandidate =
    raw.model ??
    raw.modelName ??
    raw.engine ??
    raw.version ??
    raw.metadata?.model ??
    raw.request?.model;

  const audioUrlCandidate =
    raw.audioUrl ??
    raw.audio_url ??
    raw.mp3Url ??
    raw.fullAudioUrl ??
    raw.url ??
    raw.full_audio_url ??
    raw.mediaUrl;

  const streamUrlCandidate =
    raw.streamAudioUrl ??
    raw.stream_url ??
    raw.streamUrl ??
    raw.audioStreamUrl ??
    raw.live_url;

  return {
    id: String(idCandidate),
    model: modelCandidate ? String(modelCandidate) : undefined,
    audioUrl: audioUrlCandidate ? String(audioUrlCandidate) : undefined,
    streamAudioUrl: streamUrlCandidate ? String(streamUrlCandidate) : undefined,
    title: raw.title ?? raw.name ?? undefined,
    tags: raw.tags ?? undefined,
    duration:
      typeof raw.duration === "number"
        ? raw.duration
        : typeof raw.length === "number"
          ? raw.length
          : undefined,
  };
}

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

function toSamples(data: SignalDatum[]) {
  if (!data.length) return { samples: [] };
  return {
    samples: data.map((d) => ({ signal: d.signal, timestampMs: d.ms })),
  };
}

function describeAnalysis(
  analysis: SignalWindowsAnalysis | null,
  range: TimelineRange,
) {
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

  const lastAudioIdRef = useRef<string | null>(null);
  const lastModelRef = useRef<string | null>(null);

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
    if (selectedRange !== range) setSelectedRange(range);
  }, [mushId, range, selectedRange, setSelectedRange]);

  const analysisSource = useMemo<SignalDatum[]>(
    () => (rangeData.length ? rangeData : viewData),
    [rangeData, viewData],
  );
  const { samples } = useMemo(() => toSamples(analysisSource), [analysisSource]);

  const analysis: SignalWindowsAnalysis | null = useMemo(() => {
    if (!samples.length) return null;

    const firstMs = samples[0].timestampMs!;
    const lastMs = samples[samples.length - 1].timestampMs!;
    const totalMs = Math.max(lastMs - firstMs, 10_000); // ~10s guard

    const DESIRED = 12;
    const desiredWindows = Math.min(16, Math.max(8, DESIRED));
    const windowMs = Math.max(Math.floor(totalMs / desiredWindows), 5_000); // ~5s
    const hopMs = windowMs;
    const minimumSamplesPerWindow = 1;

    return classifySignalWindows(
      samples.map((s) => ({
        signal: s.signal,
        timestampMs: s.timestampMs,
      })),
      { windowMs, hopMs, desiredWindows, minimumSamplesPerWindow },
    );
  }, [samples]);

  const analysisSummary = useMemo(
    () => describeAnalysis(analysis, range),
    [analysis, range],
  );

  const displayRange =
    analysisSummary?.rangeLabel ?? RANGE_LABELS[range] ?? RANGE_LABELS[DEFAULT_RANGE];

  const pickTrack = (resp: SunoStatusResponse): SunoTrack | undefined => {
    const candidates: any[] = [];
    const push = (value: any) => {
      if (!value) return;
      if (Array.isArray(value)) {
        value.forEach(push);
      } else {
        candidates.push(value);
      }
    };

    push(resp?.response?.sunoData);
    push(resp?.response?.data);
    push(resp?.response);
    push(resp?.data);
    push((resp as any)?.sunoData);

    const normalized = candidates
      .map(normalizeTrack)
      .filter((track): track is SunoTrack => !!track)
      .sort((a, b) => (b.duration ?? 0) - (a.duration ?? 0));

    return normalized[0];
  };

  const pollStatus = useCallback(
    async (taskId: string) => {
      for (;;) {
        const res = await fetch(
          `/api/suno/status?taskId=${encodeURIComponent(taskId)}`,
          { cache: "no-store" },
        );
        const json: SunoStatusResponse = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "Status request failed");

        const picked = pickTrack(json);
        if (picked) {
          if (picked.id) lastAudioIdRef.current = picked.id;
          if (picked.model) lastModelRef.current = picked.model;

          if (picked.streamAudioUrl) {
            setStreamUrl((prev) => prev ?? picked.streamAudioUrl ?? null);
          }
          if (picked.audioUrl) {
            setFullUrl((prev) => prev ?? picked.audioUrl ?? null);
          }
        }

        setStatus(json.status ?? "unknown");
        if (json.status === "SUCCESS" || json.status === "FAIL") {
          if (
            json.status === "SUCCESS" &&
            (!lastAudioIdRef.current || !lastModelRef.current)
          ) {
            try {
              const resolveRes = await fetch(
                `/api/suno/resolve-audio?taskId=${encodeURIComponent(taskId)}`,
                { cache: "no-store" },
              );
              if (resolveRes.ok) {
                const resolved = await resolveRes.json();
                if (resolved?.id) lastAudioIdRef.current = resolved.id;
                if (resolved?.model) lastModelRef.current = resolved.model;
                if (resolved?.streamAudioUrl) {
                  setStreamUrl((prev) => prev ?? resolved.streamAudioUrl ?? null);
                }
                if (resolved?.audioUrl) {
                  setFullUrl((prev) => prev ?? resolved.audioUrl ?? null);
                }
              } else if (process.env.NODE_ENV !== "production") {
                const errJson = await resolveRes.json().catch(() => null);
                // eslint-disable-next-line no-console
                console.warn(
                  "[Suno] resolve-audio fallback failed",
                  resolveRes.status,
                  errJson,
                );
              }
            } catch (resolveErr) {
              if (process.env.NODE_ENV !== "production") {
                // eslint-disable-next-line no-console
                console.warn("[Suno] resolve-audio error", resolveErr);
              }
            }
          }
          return json;
        }

        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    },
    [],
  );

  const onHear = useCallback(async () => {
    if (busy) return;

    if (!analysis || !analysis.windows.length) {
      setError(
        "Signal windows are still loading (or range too short). Try a larger range.",
      );
      setStatus("error");
      return;
    }

    setBusy(true);
    setError(null);
    setStatus("preparing");
    setStreamUrl(null);
    setFullUrl(null);
    lastAudioIdRef.current = null;
    lastModelRef.current = null;

    try {
      const mod: SonifyModule = await import(
        "@/components/portfolio/sonification/sonify"
      );

      if (!mod.initialPromptFromAnalysis && !mod.mapSignalToSuno) {
        throw new Error("sonify.ts is missing prompt builders");
      }

      const baseBody = mod.initialPromptFromAnalysis
        ? mod.initialPromptFromAnalysis(analysis)
        : mod.mapSignalToSuno(analysis);

      if (baseBody?.model) {
        lastModelRef.current = baseBody.model;
      }

      if (process.env.NODE_ENV !== "production") {
        console.group("[Suno] Base prompt");
        console.log(baseBody);
        console.groupEnd();
      }

      const genRes = await fetch("/api/suno/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(baseBody),
      });
      const genJson = await genRes.json();
      if (!genRes.ok || !genJson?.taskId) {
        throw new Error(genJson?.error ?? "Failed to start Suno generation");
      }

      setStatus("queued");
      await pollStatus(genJson.taskId);

      const baseAudioId = lastAudioIdRef.current;
      const baseModel = lastModelRef.current;
      if (!baseAudioId || !baseModel) {
        throw new Error(
          "Missing audioId/model from base generation; cannot extend.",
        );
      }

      const segments = mod
        .makeExtendPlanFromAnalysis(analysis)
        .filter((seg) => seg.startSec > 0);

      for (let i = 0; i < segments.length; i += 1) {
        const seg = segments[i];
        setStatus(`extend ${i + 1}/${segments.length} @${seg.startSec}s`);

        if (process.env.NODE_ENV !== "production") {
          console.group(
            `[Suno Extend] segment ${i + 1}/${segments.length}`,
          );
          console.log(seg);
          console.groupEnd();
        }

        const extRes = await fetch("/api/suno/extend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audioId: lastAudioIdRef.current,
            model: lastModelRef.current,
            continueAt: seg.startSec,
            prompt: seg.prompt,
            style: seg.style,
            title: seg.title,
          }),
        });
        const extJson = await extRes.json();
        if (!extRes.ok || !extJson?.taskId) {
          throw new Error(extJson?.error ?? "Failed to start extension");
        }

        await pollStatus(extJson.taskId);
      }

      setStatus("SUCCESS");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setStatus("error");
    } finally {
      setBusy(false);
    }
  }, [analysis, busy, pollStatus]);

  const signalLoadingState = signalsLoading && !analysis;
  const disableButton = busy || !mushId || signalLoadingState || !analysis;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hear your Mushroom</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Generates music from the mushroom signal data via Suno. Source:{" "}
          <span className="text-xs font-medium">
            BigQuery • {displayRange}
            {analysisSummary?.windowCount != null
              ? ` • ${analysisSummary.windowCount} windows`
              : ""}
            {analysisSummary?.totalSamples != null
              ? ` • ${analysisSummary.totalSamples} samples`
              : ""}
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
          {busy ? "Working..." : mushId ? "Hear your Mushroom" : "Select a mushroom"}
        </button>

        <div className="text-sm">
          <div>Status: {signalLoadingState ? "loading signals..." : status}</div>
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

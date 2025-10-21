// components/portfolio/sonification/SonificationPanel.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Papa from "papaparse";
import {
  classifySignalWindows,
  type SignalWindowsAnalysis,
} from "@/lib/signalClassification";
import { useMushroomSignals } from "@/hooks/useMushroomSignals";

type SonifyModule = typeof import("./sonification/sonify");

type Props = {
  mushId?: string | null;
  csvUrl?: string;
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

type SignalDatum = {
  index: number;
  ms: number;
  signal: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function pickString(
  record: Record<string, unknown>,
  ...keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }
  return undefined;
}

function normalizeTrack(raw: unknown): SunoTrack | null {
  if (!isRecord(raw)) return null;

  const idCandidate = pickString(
    raw,
    "id",
    "audioId",
    "audio_id",
    "songId",
    "trackId",
    "clipId",
    "parentId"
  );
  if (!idCandidate) return null;

  const modelCandidate =
    pickString(raw, "model", "modelName", "engine", "version") ??
    (isRecord(raw.metadata) ? pickString(raw.metadata, "model") : undefined) ??
    (isRecord(raw.request) ? pickString(raw.request, "model") : undefined);

  const audioUrlCandidate = pickString(
    raw,
    "audioUrl",
    "audio_url",
    "mp3Url",
    "fullAudioUrl",
    "url",
    "full_audio_url",
    "mediaUrl"
  );

  const streamUrlCandidate = pickString(
    raw,
    "streamAudioUrl",
    "stream_url",
    "streamUrl",
    "audioStreamUrl",
    "live_url"
  );

  const title =
    pickString(raw, "title", "name") ??
    (typeof raw.title === "string" ? raw.title : undefined);
  const tags =
    typeof raw.tags === "string" || Array.isArray(raw.tags)
      ? (raw.tags as string | string[])
      : undefined;

  let duration: number | undefined;
  if (typeof raw.duration === "number" && Number.isFinite(raw.duration)) {
    duration = raw.duration;
  } else if (typeof raw.length === "number" && Number.isFinite(raw.length)) {
    duration = raw.length;
  }

  return {
    id: String(idCandidate),
    model: modelCandidate ? String(modelCandidate) : undefined,
    audioUrl: audioUrlCandidate ? String(audioUrlCandidate) : undefined,
    streamAudioUrl: streamUrlCandidate ? String(streamUrlCandidate) : undefined,
    title,
    tags:
      typeof tags === "string"
        ? tags
        : Array.isArray(tags)
        ? tags.join(", ")
        : undefined,
    duration,
  };
}

const SYNTH_TARGET_DURATION_SEC = 120;
const DEFAULT_CSV_URL = "/GhostFungi.csv";

function toSamples(data: SignalDatum[]) {
  if (!data.length) return { samples: [] };
  return {
    samples: data.map((d) => ({ signal: d.signal, timestampMs: d.ms })),
  };
}

function humanizeRangeLabel(range?: string | null) {
  switch ((range ?? "").toLowerCase()) {
    case "rt":
      return "Database - Real Time";
    case "4h":
      return "Database - Last 4 Hours";
    case "12h":
      return "Database - Last 12 Hours";
    case "1d":
      return "Database - Last Day";
    case "3d":
      return "Database - Last 3 Days";
    case "1w":
      return "Database - Last Week";
    case "all":
      return "Database - All Time";
    case "csv":
      return "CSV Source";
    default:
      return range ? `Database - ${range.toUpperCase()}` : "Database - Signals";
  }
}

function describeAnalysis(
  analysis: SignalWindowsAnalysis | null,
  label: string
) {
  if (!analysis) return null;
  const startMs = analysis.windows[0]?.startMs ?? 0;
  const endMs = analysis.windows.at(-1)?.endMs ?? startMs;
  const durationMs = Math.max(endMs - startMs, 0);
  const hours = durationMs ? durationMs / (1000 * 60 * 60) : null;
  return {
    rangeLabel: label,
    totalSamples: analysis.globalStats.count,
    windowCount: analysis.windows.length,
    hours,
  };
}

export function SonificationPanel({ mushId, csvUrl = DEFAULT_CSV_URL }: Props) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>("idle");
  const [error, setError] = useState<string | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [fullUrl, setFullUrl] = useState<string | null>(null);

  const [synthBusy, setSynthBusy] = useState(false);
  const [synthStatus, setSynthStatus] = useState<string>("idle");
  const [synthError, setSynthError] = useState<string | null>(null);
  const [synthStreamUrl, setSynthStreamUrl] = useState<string | null>(null);
  const [synthFullUrl, setSynthFullUrl] = useState<string | null>(null);
  const [rawSynthFile, setRawSynthFile] = useState<File | null>(null);
  const [rawSynthUrl, setRawSynthUrl] = useState<string | null>(null);
  const [synthUploadBusy, setSynthUploadBusy] = useState(false);
  const [hasStoredSynth, setHasStoredSynth] = useState(false);
  const [hasStoredSuno, setHasStoredSuno] = useState(false);
  const [csvSamples, setCsvSamples] = useState<SignalDatum[]>([]);
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);

  const {
    viewData: fetchedViewData,
    loading: fetchedLoading,
    error: fetchedError,
    selectedRange,
    setSelectedRange,
  } = useMushroomSignals(mushId ?? null);

  const lastAudioIdRef = useRef<string | null>(null);
  const lastModelRef = useRef<string | null>(null);
  const rawSynthAudioRef = useRef<HTMLAudioElement | null>(null);
  const rawSynthObjectUrlRef = useRef<string | null>(null);
  const shouldAutoplayRawRef = useRef(false);
  const storeRawInFlightRef = useRef(false);
  const storedSunoSourceRef = useRef<string | null>(null);
  const storeSunoInFlightRef = useRef(false);

  useEffect(() => {
    if (!mushId) return;
    if (selectedRange !== "all") {
      setSelectedRange("all");
    }
  }, [mushId, selectedRange, setSelectedRange]);

  useEffect(() => {
    const audioEl = rawSynthAudioRef.current;
    if (!audioEl) return;

    if (!rawSynthUrl) {
      audioEl.pause();
      audioEl.removeAttribute("src");
      audioEl.load();
      return;
    }

    audioEl.pause();
    audioEl.src = rawSynthUrl;
    audioEl.load();
    if (shouldAutoplayRawRef.current) {
      audioEl.play().catch(() => {
        /* ignore autoplay rejection */
      });
      shouldAutoplayRawRef.current = false;
    }
  }, [rawSynthUrl]);

  useEffect(() => {
    return () => {
      const objectUrl = rawSynthObjectUrlRef.current;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        rawSynthObjectUrlRef.current = null;
      }
    };
  }, []);

  const persistRawAudio = useCallback(
    async (file: File) => {
      if (!mushId || storeRawInFlightRef.current) {
        return;
      }

      try {
        storeRawInFlightRef.current = true;
        const form = new FormData();
        form.set("file", file);

        const res = await fetch(
          `/api/mushroom/${encodeURIComponent(mushId)}/sonification/raw`,
          {
            method: "POST",
            body: form,
          },
        );
        const payload = await res.json();
        if (!res.ok) {
          throw new Error(payload?.error ?? "Failed to store raw audio");
        }

        const signedUrl: string | null =
          payload?.rawSound?.signedUrl ?? null;
        if (signedUrl) {
          if (rawSynthObjectUrlRef.current) {
            URL.revokeObjectURL(rawSynthObjectUrlRef.current);
            rawSynthObjectUrlRef.current = null;
          }
          shouldAutoplayRawRef.current = false;
          setRawSynthUrl(signedUrl);
          setHasStoredSynth(true);
          setSynthStatus((prev) =>
            prev === "rendered" || prev === "stored" ? "stored" : prev,
          );
        }
      } catch (err) {
        console.error("[Sonification] raw persist error", err);
      } finally {
        storeRawInFlightRef.current = false;
      }
    },
    [mushId],
  );

  const persistSunoAudio = useCallback(
    async (audioUrl: string) => {
      if (!mushId || !audioUrl) {
        return;
      }
      if (!/^https?:\/\//i.test(audioUrl)) {
        return;
      }
      if (storedSunoSourceRef.current === audioUrl) {
        return;
      }
      if (storeSunoInFlightRef.current) {
        return;
      }

      try {
        storeSunoInFlightRef.current = true;
        storedSunoSourceRef.current = audioUrl;
        const res = await fetch(
          `/api/mushroom/${encodeURIComponent(mushId)}/sonification/suno`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sourceUrl: audioUrl,
              filename: `suno-${mushId}.mp3`,
            }),
          },
        );
        const payload = await res.json();
        if (!res.ok) {
          throw new Error(payload?.error ?? "Failed to store enhanced audio");
        }

        const signedUrl: string | null =
          payload?.sunoSound?.signedUrl ?? null;
        if (signedUrl) {
          setSynthFullUrl(signedUrl);
          setSynthStreamUrl(signedUrl);
          setHasStoredSuno(true);
        }
      } catch (err) {
        console.error("[Sonification] suno persist error", err);
        storedSunoSourceRef.current = null;
      } finally {
        storeSunoInFlightRef.current = false;
      }
    },
    [mushId],
  );

  useEffect(() => {
    setRawSynthFile(null);
    if (rawSynthObjectUrlRef.current) {
      URL.revokeObjectURL(rawSynthObjectUrlRef.current);
      rawSynthObjectUrlRef.current = null;
    }
    setRawSynthUrl(null);
    setSynthStreamUrl(null);
    setSynthFullUrl(null);
    storedSunoSourceRef.current = null;
    storeRawInFlightRef.current = false;
    storeSunoInFlightRef.current = false;
    shouldAutoplayRawRef.current = false;
    setSynthStatus("idle");
    setStatus("idle");
    setHasStoredSynth(false);
    setHasStoredSuno(false);

    if (!mushId) {
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const loadStored = async () => {
      try {
        const res = await fetch(
          `/api/mushroom/${encodeURIComponent(mushId)}/sonification`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );

        if (res.status === 404) {
          return;
        }

        const payload = await res.json();
        if (!res.ok) {
          throw new Error(payload?.error ?? "Failed to load sonification");
        }
        if (cancelled) return;

        const rawUrl: string | null = payload?.rawSound?.signedUrl ?? null;
        const sunoUrl: string | null = payload?.sunoSound?.signedUrl ?? null;
        setHasStoredSynth(Boolean(rawUrl));
        setHasStoredSuno(Boolean(sunoUrl));

        if (rawUrl) {
          shouldAutoplayRawRef.current = false;
          setRawSynthUrl(rawUrl);
          setSynthStatus((prev) =>
            prev === "idle" || prev === "stored" ? "stored" : prev,
          );
        }

        if (sunoUrl) {
          setSynthFullUrl(sunoUrl);
          setSynthStreamUrl(sunoUrl);
          setStatus((prev) =>
            prev === "idle" || prev === "stored" ? "stored" : prev,
          );
          if (!rawUrl) {
            setSynthStatus((prev) =>
              prev === "idle" || prev === "stored" ? "stored" : prev,
            );
          }
        }
      } catch (err) {
        if (cancelled) return;
        console.error("[Sonification] load stored", err);
      }
    };

    loadStored();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [mushId, setStatus]);

  useEffect(() => {
    if (mushId) return;

    let cancelled = false;
    setCsvLoading(true);
    setCsvError(null);
    setCsvSamples([]);

    Papa.parse<{ timestamp_ms: number; signal: number }>(csvUrl, {
      download: true,
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (cancelled) return;
        setCsvLoading(false);
        if (results.errors?.length) {
          setCsvSamples([]);
          setCsvError(results.errors[0]?.message ?? "Failed to parse CSV");
          return;
        }
        const rows = (results.data ?? []).filter(
          (row): row is { timestamp_ms: number; signal: number } =>
            typeof row?.timestamp_ms === "number" &&
            Number.isFinite(row.timestamp_ms) &&
            typeof row?.signal === "number" &&
            Number.isFinite(row.signal)
        );
        const mapped: SignalDatum[] = rows.map((row, index) => ({
          index,
          ms: row.timestamp_ms,
          signal: row.signal,
        }));
        setCsvSamples(mapped);
        setCsvError(null);
      },
      error: (err) => {
        if (cancelled) return;
        setCsvLoading(false);
        setCsvSamples([]);
        setCsvError(err.message ?? "CSV load error");
      },
    });

    return () => {
      cancelled = true;
    };
  }, [mushId, csvUrl]);

  const csvLabel = useMemo(
    () => csvUrl.replace(/^\/+/, "") || "CSV Source",
    [csvUrl]
  );

  const dbSignalData = useMemo<SignalDatum[]>(
    () =>
      fetchedViewData.map((point, index) => {
        const parsedMs = Number.isFinite(point.ms)
          ? point.ms
          : Number.isFinite(Date.parse(point.timestamp))
          ? Date.parse(point.timestamp)
          : index;
        return {
          index,
          ms: parsedMs,
          signal: point.signal,
        };
      }),
    [fetchedViewData]
  );

  const usingDatabase = Boolean(mushId);
  const signalData = usingDatabase ? dbSignalData : csvSamples;
  const signalLoading = usingDatabase ? fetchedLoading : csvLoading;
  const signalError = usingDatabase ? fetchedError ?? null : csvError;
  const sourceLabel = usingDatabase
    ? humanizeRangeLabel(selectedRange)
    : csvLabel;

  const analysisSource = signalData;
  const { samples } = useMemo(
    () => toSamples(analysisSource),
    [analysisSource]
  );

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
      { windowMs, hopMs, desiredWindows, minimumSamplesPerWindow }
    );
  }, [samples]);

  const analysisSummary = useMemo(
    () => describeAnalysis(analysis, sourceLabel),
    [analysis, sourceLabel]
  );

  const displayRange = analysisSummary?.rangeLabel ?? sourceLabel;
  const displaySource =
    usingDatabase && mushId
      ? `${displayRange} (Mushroom ${mushId})`
      : displayRange;

  const pickTrack = (resp: SunoStatusResponse): SunoTrack | undefined => {
    const candidates: unknown[] = [];
    const push = (value: unknown) => {
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
    push(resp?.sunoData);

    const normalized = candidates
      .map(normalizeTrack)
      .filter((track): track is SunoTrack => !!track)
      .sort((a, b) => (b.duration ?? 0) - (a.duration ?? 0));

    return normalized[0];
  };

  const pollStatus = useCallback(async (taskId: string) => {
    for (;;) {
      const res = await fetch(
        `/api/suno/status?taskId=${encodeURIComponent(taskId)}`,
        { cache: "no-store" }
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
              { cache: "no-store" }
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
              console.warn(
                "[Suno] resolve-audio fallback failed",
                resolveRes.status,
                errJson
              );
            }
          } catch (resolveErr) {
            if (process.env.NODE_ENV !== "production") {
              console.warn("[Suno] resolve-audio error", resolveErr);
            }
          }
        }
        return json;
      }

      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }, []);

  const pollSynthStatus = useCallback(
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
          if (picked.streamAudioUrl) {
            setSynthStreamUrl(
              (prev) => prev ?? picked.streamAudioUrl ?? null,
            );
          }
          if (picked.audioUrl) {
            setSynthFullUrl((prev) => prev ?? picked.audioUrl ?? null);
            void persistSunoAudio(picked.audioUrl);
          }
        }

        setSynthStatus(json.status ?? "unknown");
        if (json.status === "SUCCESS" || json.status === "FAIL") {
          return json;
        }

        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    },
    [persistSunoAudio],
  );

  const onHear = useCallback(async () => {
    if (busy) return;

    if (!analysis || !analysis.windows.length) {
      setError("Signal data is still loading. Try again in a moment.");
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
          "Missing audioId/model from base generation; cannot extend."
        );
      }

      const segments = mod
        .makeExtendPlanFromAnalysis(analysis)
        .filter((seg) => seg.startSec > 0);

      for (let i = 0; i < segments.length; i += 1) {
        const seg = segments[i];
        setStatus(`extend ${i + 1}/${segments.length} @${seg.startSec}s`);

        if (process.env.NODE_ENV !== "production") {
          console.group(`[Suno Extend] segment ${i + 1}/${segments.length}`);
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

  const onRenderSynth = useCallback(async () => {
    if (synthBusy || synthUploadBusy || hasStoredSynth) return;
    if (!samples.length) {
      setSynthError(
        "No signal data available yet. Check the source and try again."
      );
      setSynthStatus("error");
      return;
    }

    setSynthBusy(true);
    setSynthError(null);
    setSynthStatus("rendering");
    setSynthStreamUrl(null);
    setSynthFullUrl(null);
    setRawSynthFile(null);
    if (rawSynthObjectUrlRef.current) {
      URL.revokeObjectURL(rawSynthObjectUrlRef.current);
      rawSynthObjectUrlRef.current = null;
    }
    setRawSynthUrl(null);
    storedSunoSourceRef.current = null;

    try {
      const { renderSynthMp3 } = await import("./sonification/renderSynth");

      const file = await renderSynthMp3(
        samples.map((sample) => ({
          timestampMs: sample.timestampMs ?? 0,
          signal: sample.signal,
        })),
        { durationSec: SYNTH_TARGET_DURATION_SEC }
      );

      setRawSynthFile(file);
      const url = URL.createObjectURL(file);
      rawSynthObjectUrlRef.current = url;
      shouldAutoplayRawRef.current = true;
      setRawSynthUrl(url);
      setSynthStatus("rendered");
      if (mushId) {
        void persistRawAudio(file);
      }
    } catch (err) {
      setSynthError(err instanceof Error ? err.message : String(err));
      setSynthStatus("error");
    } finally {
      setSynthBusy(false);
    }
  }, [synthBusy, synthUploadBusy, samples, mushId, persistRawAudio, hasStoredSynth]);

  const onUploadSynth = useCallback(async () => {
    if (synthUploadBusy || synthBusy || hasStoredSuno) return;
    if (!rawSynthFile) {
      setSynthError("Render the synth sonification first.");
      setSynthStatus("error");
      return;
    }

    setSynthUploadBusy(true);
    setSynthError(null);
    setSynthStatus("uploading");
    setSynthStreamUrl(null);
    setSynthFullUrl(null);

    try {
      const form = new FormData();
      form.set("file", rawSynthFile);
      if (mushId) {
        form.set("title", `Mushroom ${mushId} Synth Sonification`);
      } else {
        form.set("title", "Ghost Fungi Synth Sonification");
      }
      const promptText =
        analysisSummary?.windowCount != null
          ? `Enhance this ${SYNTH_TARGET_DURATION_SEC}-second synth sonification derived from ${analysisSummary.windowCount} mushroom signal windows. Preserve the melodic contour while adding gentle ambient textures, when notes are higher, add more energy and pads. No vocals or aggressive percussion. Duration around two minutes.`
          : `Enhance this ${SYNTH_TARGET_DURATION_SEC}-second synth sonification of mushroom electrical signals. Preserve the melodic contour while adding gentle ambient textures. No vocals or aggressive percussion. Duration around two minutes.`;
      form.set("prompt", promptText);
      form.set("style", "sythetic soundscape, ambient, experimental");

      const uploadRes = await fetch("/api/suno/upload-sonification", {
        method: "POST",
        body: form,
      });
      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok || !uploadJson?.taskId) {
        throw new Error(uploadJson?.error ?? "Failed to upload sonification");
      }

      setSynthStatus("queued");
      await pollSynthStatus(uploadJson.taskId);
    } catch (err) {
      setSynthError(err instanceof Error ? err.message : String(err));
      setSynthStatus("error");
    } finally {
      setSynthUploadBusy(false);
    }
  }, [
    analysisSummary,
    mushId,
    synthBusy,
    synthUploadBusy,
    pollSynthStatus,
    rawSynthFile,
    hasStoredSuno,
  ]);

  const signalLoadingState = signalLoading && !analysis;
  const disableButton = busy || signalLoading || !analysis;
  const disableSynthRenderButton =
    synthBusy ||
    synthUploadBusy ||
    signalLoading ||
    !analysis ||
    !samples.length ||
    hasStoredSynth;
  const disableSynthUploadButton =
    synthUploadBusy || synthBusy || !rawSynthFile || hasStoredSuno;
  const synthButtonLabel = synthBusy
    ? "Rendering synth..."
    : hasStoredSynth
      ? "Synth ready"
      : "Synth";
  const synthJamButtonLabel = synthUploadBusy
    ? "Adding groove..."
    : hasStoredSuno
      ? "Synth Jam ready"
      : "Synth Jam";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mushroom Sonification</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 space-x-2">
        <p className="text-sm text-muted-foreground">
          Let your mushroom sing.
          <span className="text-xs font-medium">Source: {displaySource}</span>
        </p>

        {signalError && (
          <p className="text-xs text-rose-600">
            Failed to load signals: {signalError}
          </p>
        )}

        <button
          onClick={onHear}
          disabled={disableButton}
          className="px-4 py-2 rounded-md bg-[#C89E4D]/70 text-white hover:bg-[#C89E4D]"
        >
          {busy ? "Generating track..." : "WIP"}
        </button>

        <div className="text-sm">
          <div>
            <span className="font-medium">Suno status:</span>{" "}
            {signalLoadingState ? "Loading signals..." : status}
          </div>
          {error && <div className="text-rose-600 text-xs">{error}</div>}
        </div>

        <button
          onClick={onRenderSynth}
          disabled={disableSynthRenderButton}
          title={
            hasStoredSynth
              ? "Synth audio already generated for this mushroom."
              : undefined
          }
          className="px-4 py-2 rounded-md bg-[#AAA432]/70 text-white hover:bg-[#AAA432] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-[#AAA432]/70"
        >
          {synthButtonLabel}
        </button>

        <button
          onClick={onUploadSynth}
          disabled={disableSynthUploadButton}
          title={
            hasStoredSuno
              ? "Enhanced synth already stored for this mushroom."
              : undefined
          }
          className="px-4 py-2 rounded-md bg-[#AA3232]/70 text-white hover:bg-[#AA3232] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-[#AA3232]/70"
        >
          {synthJamButtonLabel}
        </button>

        <div className="text-sm">
          <div>
            <span className="font-medium">Preview status:</span> {synthStatus}
          </div>
          {synthError && (
            <div className="text-rose-600 text-xs">{synthError}</div>
          )}
        </div>

        {rawSynthUrl && (
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Synth preview:</div>
            <audio controls src={rawSynthUrl} ref={rawSynthAudioRef}>
              Your browser does not support audio.
            </audio>
          </div>
        )}

        {streamUrl && (
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">
              Streaming preview:
            </div>
            <audio controls src={streamUrl}>
              Your browser does not support audio.
            </audio>
          </div>
        )}

        {fullUrl && (
          <div className="text-sm">
            <a
              className="underline"
              href={fullUrl}
              target="_blank"
              rel="noreferrer"
            >
              Open full AI track
            </a>
          </div>
        )}

        {synthStreamUrl && (
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">
              Synth streaming preview:
            </div>
            <audio controls src={synthStreamUrl}>
              Your browser does not support audio.
            </audio>
          </div>
        )}

        {synthFullUrl && (
          <div className="text-sm">
            <a
              className="underline"
              href={synthFullUrl}
              target="_blank"
              rel="noreferrer"
            >
              Open enhanced preview
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

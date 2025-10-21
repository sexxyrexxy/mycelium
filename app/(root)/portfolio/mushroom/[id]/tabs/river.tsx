"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  useMushroomSignals,
  TimelineRange,
  TIMELINE_OPTIONS,
  SignalDatum,
} from "@/hooks/useMushroomSignals";
import { SignalTimeRangeSelector } from "@/components/portfolio/SignalTimeRangeSelector";
import { SignalRiver } from "@/components/portfolio/SignalRiver";
import { Loader2, RotateCcw } from "lucide-react";
import {
  classifySignalWindows,
  type SignalSampleInput,
  type SignalWindowsAnalysis,
} from "@/lib/signalClassification";

import MushroomLifeCycle, {
  type MushroomStage,
} from "@/components/portfolio/MushroomLifeCycle";

const STORY_RANGE_OPTIONS: TimelineRange[] = [
  "rt",
  "4h",
  "12h",
  "1d",
  "3d",
  "1w",
  "all",
];

type StoryCard = {
  id: number;
  title: string;
  summary: string;
  mood: string;
  start: string;
  end: string;
  avg: number;
  swing: number;
  stage: MushroomStage;
  progress?: number;
};

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

const formatRangeLabel = (start: string, end: string) =>
  `${formatTime(start)} – ${formatTime(end)}`;

const DEFAULT_STAGE: MushroomStage = "RAIN";

// central mapping between energy/volatility classifications and the life-cycle stage; tweak here to rebalance storytelling
const determineMushroomStage = (
  window: SignalWindowsAnalysis["windows"][number]
): MushroomStage => {
  if (window.peak || (window.energyLevel === "high" && window.volatility === "spiking")) {
    return "SPORE";
  }

  if (window.energyLevel === "high") {
    return window.volatility === "stable" ? "BLOOM" : "SPORE";
  }

  if (window.energyLevel === "medium") {
    if (window.volatility === "stable") return "SPROUT";
    if (window.volatility === "fluctuating") return "BLOOM";
    return "SPORE";
  }

  if (window.volatility === "spiking") return "WILT";
  if (window.volatility === "fluctuating") return "RAIN";
  return "REBIRTH";
};

const formatStage = (stage: MushroomStage) =>
  stage.charAt(0) + stage.slice(1).toLowerCase();

const describeWindowSummary = (window: SignalWindowsAnalysis["windows"][number], inProgress: boolean) => {
  const windowLabel = formatRangeLabel(window.startISO, window.endISO);
  const stageLabel = formatStage(determineMushroomStage(window));
  const energyLabel =
    window.energyLevel === "low"
      ? "Low energy"
      : window.energyLevel === "medium"
        ? "Medium energy"
        : "High energy";
  const volatilityLabel =
    window.volatility === "stable"
      ? "Stable movement"
      : window.volatility === "fluctuating"
        ? "Fluctuating movement"
      : "Spiking movement";
  const baseSummary =
    `Stage ${stageLabel}. ${energyLabel} during ${windowLabel}; average absolute signal ${window.localAvg.toFixed(3)} mV. ` +
    `${volatilityLabel}, normalised variance ${window.normalizedVariance.toFixed(2)}.`;
  const audioSummary =
    `Audio guidance: ${window.audio.layers} layer(s), ` +
    `${window.audio.brightness} tone, modulation depth ${(window.audio.modulationDepth * 100).toFixed(0)}%.`;
  const peakNote = window.peak ? "Peak energy — add shimmer without raising volume." : "";
  const flowNote = inProgress ? "Window is still streaming…" : "Window complete.";
  return `${baseSummary} ${audioSummary} ${peakNote} ${flowNote}`.trim();
};

const windowToStory = (
  window: SignalWindowsAnalysis["windows"][number],
  inProgress: boolean,
  progress: number
): StoryCard => {
  const stage = determineMushroomStage(window);
  return {
    id: window.index + 1,
    title: window.combinedLabel,
    summary: describeWindowSummary(window, inProgress),
    mood: `${stage} • Energy ${window.energyLevel}; movement ${window.volatility}`,
    start: window.startISO,
    end: window.endISO,
    avg: window.localAvg,
    swing: window.normalizedVariance,
    stage,
    progress: inProgress ? progress : undefined,
  };
};

export default function SignalRiverTab() {
  const { id } = useParams<{ id: string }>();
  const {
    viewData,
    rangeData,
    selectedRange,
    setSelectedRange,
    loading,
    error,
    pendingRange,
    isRefetching,
  } = useMushroomSignals(id);

  const data = useMemo(
    () => (selectedRange === "rt" ? rangeData : viewData),
    [selectedRange, rangeData, viewData]
  );

  const options = useMemo(
    () =>
      TIMELINE_OPTIONS.filter((opt) => STORY_RANGE_OPTIONS.includes(opt.id)),
    []
  );

  const [replayToken, setReplayToken] = useState(0);
  const [currentStory, setCurrentStory] = useState<StoryCard | null>(null);
  const [history, setHistory] = useState<StoryCard[]>([]);
  const [streamFinished, setStreamFinished] = useState(false);
  const windowIndexRef = useRef(0);

  const analysisSource = useMemo(
    () => (rangeData.length ? rangeData : data),
    [rangeData, data]
  );

  const samples = useMemo<SignalSampleInput[]>(() => {
    return analysisSource.map((datum) => ({
      signal: datum.signal,
      timestampMs: datum.ms,
    }));
  }, [analysisSource]);

  const analysis = useMemo<SignalWindowsAnalysis | null>(() => {
    if (!samples.length) return null;
    return classifySignalWindows(samples);
  }, [samples]);

  const resetStories = useCallback(() => {
    windowIndexRef.current = 0;
    setCurrentStory(null);
    setHistory([]);
    setStreamFinished(false);
  }, []);

  useEffect(() => {
    if (!STORY_RANGE_OPTIONS.includes(selectedRange)) {
      setSelectedRange("rt");
      return;
    }
    resetStories();
    setReplayToken((token) => token + 1);
  }, [selectedRange, resetStories, setSelectedRange]);

useEffect(() => {
  resetStories();
  if (analysis) {
    setReplayToken((token) => token + 1);
  }
}, [analysis, resetStories]);

  const handleSample = useCallback(
    (sample: SignalDatum | null) => {
      if (!analysis || !analysis.windows.length) {
        if (!sample) {
          setStreamFinished(true);
        }
        setCurrentStory(null);
        return;
      }

      const windows = analysis.windows;

      if (!sample) {
        if (windowIndexRef.current < windows.length) {
          const remaining = windows
            .slice(windowIndexRef.current)
            .map((window) => windowToStory(window, false, 1));
          setHistory((prev) => [...remaining.reverse(), ...prev]);
        }
        windowIndexRef.current = windows.length;
        setCurrentStory(null);
        setStreamFinished(true);
        return;
      }

      let idx = windowIndexRef.current;
      while (idx < windows.length && sample.ms >= windows[idx].endMs) {
        const completedWindow = windows[idx];
        setHistory((prev) => [windowToStory(completedWindow, false, 1), ...prev]);
        idx += 1;
      }

      windowIndexRef.current = idx;

      if (idx < windows.length) {
        const activeWindow = windows[idx];
        const windowDuration = Math.max(activeWindow.endMs - activeWindow.startMs, 1);
        const progress = Math.max(
          0,
          Math.min(1, (sample.ms - activeWindow.startMs) / windowDuration)
        );
        setCurrentStory(windowToStory(activeWindow, true, progress));
      } else {
        setCurrentStory(null);
      }
    },
    [analysis]
  );

  const handleReplay = useCallback(() => {
    resetStories();
    setReplayToken((token) => token + 1);
  }, [resetStories]);

  // prefer the active stream window; otherwise surface the latest completed stage from history
  const activeStage: MushroomStage =
    currentStory?.stage ?? history[0]?.stage ?? DEFAULT_STAGE;
  const activeStageProgress = currentStory?.progress;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Signal River</h2>
          <p className="text-sm text-muted-foreground">
            Each glow is a reading drifting downstream—the brighter the glow,
            the stronger the pulse.
          </p>
        </div>
        <SignalTimeRangeSelector
          value={selectedRange}
          onChange={setSelectedRange}
          options={options}
          pendingId={pendingRange}
        />
      </div>

      <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-muted-foreground/70">
        <div className="flex items-center gap-2">
          {isRefetching ? <Loader2 className="size-3 animate-spin" /> : null}
          <span>{options.find((opt) => opt.id === selectedRange)?.label}</span>
        </div>
        {analysis?.windows.length ? (
          <span className="text-muted-foreground">
            Windows: {analysis.windows.length}
          </span>
        ) : null}
      </div>

      <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {loading && !data.length ? (
          <div className="flex h-[360px] items-center justify-center rounded-3xl border border-dashed border-muted-foreground/40 bg-muted/20 text-sm text-muted-foreground">
            Preparing river flow…
          </div>
        ) : error && !data.length ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-600">
            {error}
          </div>
        ) : !data.length ? (
          <div className="rounded-md border border-dashed border-muted-foreground/40 px-4 py-10 text-center text-sm text-muted-foreground">
            No signal data in this window.
          </div>
        ) : (
          <SignalRiver
            data={data}
            replayToken={replayToken}
            onSample={handleSample}
          />
        )}

        {streamFinished ? (
          <div className="pointer-events-auto absolute inset-0 flex items-center justify-center rounded-3xl bg-black/50">
            <button
              type="button"
              onClick={handleReplay}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-emerald-400"
            >
              <RotateCcw className="h-4 w-4" /> Replay Stream
            </button>
          </div>
        ) : null}

        <aside className="rounded-2xl border bg-muted/20 p-4 text-sm text-muted-foreground">
          <h3 className="text-sm font-semibold text-foreground">
            Current story
          </h3>
          {currentStory ? (
            <div className="mt-3 space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/70">
                {formatRangeLabel(currentStory.start, currentStory.end)}
              </p>
              <p className="text-lg font-semibold text-foreground">
                {currentStory.title}
              </p>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
                {currentStory.mood}
              </p>
              <p>{currentStory.summary}</p>
              <div className="mt-3 h-1 rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{
                    width: `${Math.round((currentStory.progress ?? 0) * 100)}%`,
                  }}
                />
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Listening for the next movement…
            </p>
          )}
          {/* Mushroom Phase*/}
          <div className="mt-4 flex justify-center">
            <MushroomLifeCycle stage={activeStage} progress={activeStageProgress} />
          </div>
        </aside>
      </div>

      <div className="grid gap-3 rounded-2xl border bg-muted/30 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">How to read the river</p>
        <ul className="list-disc list-inside space-y-1">
          <li>
            Particles drift left to right; vertical position mirrors signal
            amplitude.
          </li>
          <li>Brighter, larger glows represent stronger pulses.</li>
          <li>
            Trailing fades show history—watch for clusters or lulls to spot
            rhythms.
          </li>
        </ul>
      </div>

      {history.length ? (
        <div className="space-y-4">
          {history.map((story, index) => (
            <div key={story.id} className="relative flex gap-4">
              <div className="flex flex-col items-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-500 bg-white text-xs font-semibold text-emerald-600">
                  {history.length - index}
                </div>
                {index < history.length - 1 ? (
                  <div className="flex-1 w-px bg-emerald-200" />
                ) : null}
              </div>
              <div className="flex-1 rounded-2xl border bg-background/80 p-4 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                  <div className="flex-1">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/70">
                      {formatRangeLabel(story.start, story.end)}
                    </p>
                    <p className="mt-1 text-lg font-semibold text-foreground">
                      {story.title}
                    </p>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
                      {story.mood}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {story.summary}
                    </p>
                  </div>
                  <div className="mt-4 flex shrink-0 justify-center lg:justify-end">
                    <MushroomLifeCycle size={140} stage={story.stage} progress={story.progress} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

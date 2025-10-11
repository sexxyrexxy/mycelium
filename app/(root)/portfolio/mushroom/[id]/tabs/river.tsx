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
import MushroomLifeCycle from "@/components/portfolio/MushroomLifeCycle";

const STORY_RANGE_OPTIONS: TimelineRange[] = [
  "rt",
  "4h",
  "12h",
  "1d",
  "3d",
  "1w",
  "all",
];

const blankSegment = () => ({
  start: null as string | null,
  end: null as string | null,
  count: 0,
  sum: 0,
  max: -Infinity,
  min: Infinity,
});

type StoryCard = {
  id: number;
  title: string;
  summary: string;
  mood: string;
  start: string;
  end: string;
  avg: number;
  swing: number;
  progress?: number;
};

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

const formatRangeLabel = (start: string, end: string) =>
  `${formatTime(start)} – ${formatTime(end)}`;

const buildNarrative = (
  avg: number,
  swing: number,
  peak: number,
  trough: number,
  baseline: number,
  variation: number,
  start: string,
  end: string,
  count: number,
  inProgress: boolean
) => {
  const diff = avg - baseline;
  const guard = variation || Math.max(Math.abs(diff), 1);

  const classifications = [
    {
      id: "surge",
      condition: diff > (variation || guard) * 0.65,
      title: "Energy surge",
      mood: "buzzing with excitement",
      message: `Signals ran ${diff.toFixed(
        1
      )} mV above baseline from ${formatTime(start)} to ${formatTime(end)}.`,
    },
    {
      id: "rest",
      condition: diff < -(variation || guard) * 0.65,
      title: "Resting pulse",
      mood: "curling up for a nap",
      message: `Readings softened by about ${Math.abs(diff).toFixed(
        1
      )} mV during this window.`,
    },
    {
      id: "flutter",
      condition: swing > (variation || guard) * 1.4,
      title: "Signal flutter",
      mood: "twitchy and reactive",
      message: `Pulse leapt between ${trough.toFixed(1)} and ${peak.toFixed(
        1
      )} mV—lots of little bursts.`,
    },
    {
      id: "calm",
      condition: swing < (variation || guard) * 0.4,
      title: "Quiet stream",
      mood: "settling into calm waters",
      message: `Signals stayed smooth, rarely dipping below ${trough.toFixed(
        1
      )} mV.`,
    },
  ];

  const defaultClass = {
    id: "steady",
    title: "Steady flow",
    mood: "coasting comfortably",
    message: `Between ${formatRangeLabel(
      start,
      end
    )} the colony drifted close to its usual pulse.`,
  };

  const chosen = classifications.find((cls) => cls.condition) ?? defaultClass;

  let summary = chosen.message;
  if (inProgress) summary += " Stream is still flowing…";

  return { title: chosen.title, summary, mood: chosen.mood };
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

  const segmentRef = useRef(blankSegment());
  const storyIdRef = useRef(1);

  const resetStories = useCallback(() => {
    segmentRef.current = blankSegment();
    storyIdRef.current = 1;
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

  const globalStats = useMemo(() => {
    if (!data.length) return { avg: 0, std: 0 };
    const avg = data.reduce((acc, d) => acc + d.signal, 0) / data.length;
    const variance =
      data.reduce((acc, d) => acc + Math.pow(d.signal - avg, 2), 0) /
      data.length;
    return { avg, std: Math.sqrt(variance) };
  }, [data]);

  const targetPoints = useMemo(() => {
    if (!data.length) return 40;
    const estimate = Math.round(data.length / 12);
    return Math.min(80, Math.max(20, estimate || 20));
  }, [data.length]);

  const finalizeSegment = useCallback(
    (seg: ReturnType<typeof blankSegment>) => {
      if (!seg.start || !seg.end || !seg.count) return null;
      const avg = seg.sum / seg.count;
      const swing = seg.max - seg.min;
      const { title, summary, mood } = buildNarrative(
        avg,
        swing,
        seg.max,
        seg.min,
        globalStats.avg,
        globalStats.std,
        seg.start,
        seg.end,
        seg.count,
        false
      );
      return {
        id: storyIdRef.current++,
        title,
        summary,
        mood,
        start: seg.start,
        end: seg.end,
        avg,
        swing,
      } satisfies StoryCard;
    },
    [globalStats]
  );

  const handleSample = useCallback(
    (sample: SignalDatum | null) => {
      if (!sample) {
        if (segmentRef.current.count) {
          const finished = finalizeSegment(segmentRef.current);
          if (finished) setHistory((prev) => [finished, ...prev].slice(0, 8));
          segmentRef.current = blankSegment();
          setCurrentStory(null);
        }
        setStreamFinished(true);
        return;
      }

      const seg = segmentRef.current;
      if (!seg.start) {
        seg.start = sample.timestamp;
        seg.max = sample.signal;
        seg.min = sample.signal;
      }
      seg.end = sample.timestamp;
      seg.count += 1;
      seg.sum += sample.signal;
      seg.max = Math.max(seg.max, sample.signal);
      seg.min = Math.min(seg.min, sample.signal);

      const avg = seg.sum / seg.count;
      const swing = seg.max - seg.min;
      const { title, summary, mood } = buildNarrative(
        avg,
        swing,
        seg.max,
        seg.min,
        globalStats.avg,
        globalStats.std,
        seg.start!,
        seg.end!,
        seg.count,
        true
      );

      setCurrentStory({
        id: storyIdRef.current,
        title,
        summary,
        mood,
        start: seg.start!,
        end: seg.end!,
        avg,
        swing,
        progress: Math.min(seg.count / targetPoints, 0.99),
      });

      if (seg.count >= targetPoints) {
        const finished = finalizeSegment(seg);
        if (finished) setHistory((prev) => [finished, ...prev].slice(0, 8));
        segmentRef.current = blankSegment();
        setCurrentStory(null);
      }
    },
    [finalizeSegment, globalStats, targetPoints]
  );

  const handleReplay = useCallback(() => {
    resetStories();
    setReplayToken((token) => token + 1);
  }, [resetStories]);

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

      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground/70">
        {isRefetching ? <Loader2 className="size-3 animate-spin" /> : null}
        <span>{options.find((opt) => opt.id === selectedRange)?.label}</span>
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
          <div className="">
            <MushroomLifeCycle />
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
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

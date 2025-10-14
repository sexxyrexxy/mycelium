// components/portfolio/sonification/sonify.ts

import type {
  ClassifiedWindow,
  SignalWindowsAnalysis,
} from "@/lib/signalClassification";

/* ---------------- Types ---------------- */

export type SunoRequest = {
  prompt: string;
  customMode: boolean;
  instrumental: boolean;
  model: "V4_5" | "V3_5" | "V4" | "V5";
  title?: string;
  style?: string;
  styleWeight?: number;
  weirdnessConstraint?: number;
  negativeTags?: string;
};

export type ExtendSegment = {
  /** Segment index (0-based) */
  segmentIndex: number;
  /** Start time in seconds passed to `continueAt` */
  startSec: number;
  /** Model must match the base track */
  model: "V4_5" | "V3_5" | "V4" | "V5";
  /** Keep instrumental + style consistent with the base track */
  style: string;
  /** Optional title for this extension chunk */
  title: string;
  /** The act-specific guidance for this continuation */
  prompt: string;
};

/* -------------- Fallback -------------- */

function fallbackRequest(): SunoRequest {
  return {
    prompt: [
      "Create an instrumental synthetic soundscape (experimental).",
      "No drums. No percussion. No vocals.",
      "Two-minute continuous evolution with smooth transitions and no hard cuts.",
      "Start sparse and low-energy with narrow-band pads and subtle movement.",
      "Grow into a brighter, wider, medium-energy texture with evolving modulation.",
      "Briefly open into a high-energy, spacey section with wide stereo, shimmering granular layers, and bolder harmonies.",
      "Finish by tapering down to a dark, calm drone. Stay cohesive and controlled throughout.",
    ].join(" "),
    customMode: true,
    instrumental: true,
    model: "V5",
    style: "synthetic soundscape, experimental",
    title: "Mycelium Echoes",
    styleWeight: 1,
    weirdnessConstraint: 0.08,
    negativeTags:
      "percussion, drums, kicks, clap, hi-hat, snare, vocals, risers, impacts",
  };
}

/* ---------------- Small utilities ---------------- */

function clamp01(x: number) {
  return Math.min(1, Math.max(0, x));
}

function energyFromWindow(w: ClassifiedWindow) {
  // Heuristic: more layers plus brighter timbre equals more perceived energy
  const layerTerm = clamp01((w.audio.layers ?? 1) / 4);
  const brightTerm =
    w.audio.brightness === "bright"
      ? 1
      : w.audio.brightness === "balanced"
        ? 0.55
        : 0.25;
  const peakTerm = w.peak ? 0.15 : 0;
  return clamp01(0.6 * layerTerm + 0.3 * brightTerm + peakTerm);
}

function spikesFromWindow(w: ClassifiedWindow) {
  // Heuristic: glitchAmount in [0..1] reflects spike density / accents
  return clamp01(w.audio.glitchAmount ?? 0);
}

function tempoGuideFromEnergy(label: "low" | "medium" | "high") {
  return label === "low"
    ? "Tempo feel ~60 BPM (implied, never explicit)."
    : label === "medium"
      ? "Tempo feel ~75 BPM (felt pulse only)."
      : "Tempo feel ~95 BPM (felt momentum, still ambient).";
}

function brightnessGuideFromEnergy(label: "low" | "medium" | "high") {
  return label === "low"
    ? "Keep filters darker; limit upper-spectrum shimmer."
    : label === "medium"
      ? "Allow balanced brightness with occasional spectral sheen."
      : "Embrace brighter sheen and airy shimmer while avoiding harshness.";
}

function stereoGuideFromEnergy(label: "low" | "medium" | "high") {
  return label === "low"
    ? "Stereo image stays narrow-to-moderate."
    : label === "medium"
      ? "Stereo image can widen with depth while staying controlled."
      : "Stereo image opens wide with a spacious field.";
}

function glitchRuleFromSpikes(label: "few" | "some" | "frequent") {
  return label === "few"
    ? "Glitch is nearly absent; only faint digital dust as texture."
    : label === "some"
      ? "Use short, subtle glitch flickers for articulation."
      : "Use controlled, short glitch accents; never percussive or abrupt.";
}

function phaseDirective(index: number, total: number) {
  if (total <= 1 || index === 0) {
    return "Begin by establishing the sonic palette gently and coherently.";
  }
  if (index === total - 1) {
    return "Guide this section toward a gentle resolution, recalling earlier motifs.";
  }

  const progress = total > 1 ? index / (total - 1) : 0;
  if (progress < 0.33) {
    return "Early-phase: evolve from the intro with a measured energy lift.";
  }
  if (progress > 0.66) {
    return "Late-phase: ease toward resolution while maintaining continuity.";
  }
  return "Mid-phase: deepen motion and breadth while staying cohesive.";
}

function describeWindow(window: ClassifiedWindow): string {
  const index = window.index + 1;
  const layers =
    window.audio.layers === 1
      ? "1 sparse layer"
      : `${window.audio.layers} evolving layers`;
  const brightness =
    window.audio.brightness === "dark"
      ? "dark, filtered tone"
      : window.audio.brightness === "balanced"
        ? "balanced tone"
        : "brighter tone";
  const peakSuffix = window.peak
    ? " Peak window: open stereo field and harmonic range without volume spikes."
    : "";
  const modulation = window.audio.modulationDescription.replace(/\.$/, "");
  const glitch =
    window.audio.glitchAmount <= 0.05
      ? "almost no glitch accents"
      : window.audio.glitchAmount <= 0.25
        ? "subtle digital flickers"
        : "controlled short glitch accents";

  return (
    `Window ${index} (${window.combinedLabel}): ${layers} with ${brightness}. ` +
    `${modulation}. Use ${glitch}.` +
    peakSuffix
  );
}

/* ---------------- Base prompt (mapping) ---------------- */

export function mapSignalToSuno(
  analysis: SignalWindowsAnalysis | null,
): SunoRequest {
  if (!analysis || !analysis.windows.length) {
    return fallbackRequest();
  }

  const { windows, globalStats } = analysis;

  const maxLayers = Math.max(...windows.map((w) => w.audio.layers));
  const maxModDepth = Math.max(
    ...windows.map((w) => w.audio.modulationDepth),
  );
  const hasPeak = windows.some((w) => w.peak);

  const summary =
    `Global baseline avg ${globalStats.average.toFixed(3)} mV; std ${globalStats.stdDev.toFixed(
      3,
    )} mV. ` +
    `Up to ${maxLayers} layered synth voices; evolving modulation <= ${Math.round(
      maxModDepth * 100,
    )}%. ` +
    (hasPeak
      ? "At peak windows: expand stereo image and harmonic range instead of loudness jumps. "
      : "") +
    "No drums or percussive transients. Smooth, continuous morphing.";

  const windowNarrative = windows.map(describeWindow).join(" ");

  const finalWindow = windows.at(-1);
  const finalNote = finalWindow
    ? `Final window settles into ${finalWindow.combinedLabel}. Conclude with a low-energy, filtered drone and long tails.`
    : "";

  // Strong, Suno-friendly directives for synthetic soundscape
  const prompt = [
    "Create a ~2 minute instrumental synthetic soundscape (experimental).",
    "No percussion. No drums. No vocals. Cohesive single piece.",
    "Energy mapping:",
    "- LOW: sparse, narrow-band pads; mono-leaning image; gentle slow modulation; darker timbre.",
    "- MEDIUM: add layers and movement; balanced brightness; moderate modulation; gentle stereo widening.",
    "- HIGH: spacey, wide pads; brighter spectral sheen; bolder, more open harmonies; denser motion; still controlled.",
    "Tempo is felt, not explicit (~60/~75/~95 BPM for low/medium/high).",
    summary,
    windowNarrative,
    finalNote,
    "Avoid harsh noise and avoid sudden cuts. Keep transitions smooth and organic.",
  ].join(" ");

  return {
    customMode: true,
    instrumental: true,
    model: "V5",
    style: "synthetic soundscape, experimental",
    title: "Ghost Fungi Transmission",
    styleWeight: 1,
    weirdnessConstraint: 0.08,
    negativeTags:
      "percussion, drums, kicks, clap, hi-hat, snare, vocals, risers, booms, impacts",
    prompt,
  };
}

/* ---------------- Extend plan (dynamic) ---------------- */

function summarizeSegment(
  segWindows: ClassifiedWindow[],
): { eLabel: "low" | "medium" | "high"; sLabel: "few" | "some" | "frequent" } {
  if (!segWindows.length) return { eLabel: "medium", sLabel: "few" };
  const energy =
    segWindows.reduce((acc, w) => acc + energyFromWindow(w), 0) /
    segWindows.length;
  const spikes =
    segWindows.reduce((acc, w) => acc + spikesFromWindow(w), 0) /
    segWindows.length;

  const eLabel: "low" | "medium" | "high" =
    energy < 0.33 ? "low" : energy < 0.66 ? "medium" : "high";
  const sLabel: "few" | "some" | "frequent" =
    spikes < 0.2 ? "few" : spikes < 0.55 ? "some" : "frequent";

  return { eLabel, sLabel };
}

function buildSegmentDirective(
  index: number,
  totalSegments: number,
  eLabel: "low" | "medium" | "high",
  sLabel: "few" | "some" | "frequent",
) {
  const energyText =
    eLabel === "low"
      ? "Focus on LOW energy: sparse, filtered pads with darker timbre and gentle mono-leaning image."
      : eLabel === "medium"
        ? "Lean into MEDIUM energy: add evolving layers, balanced brightness, and moderate modulation with wider stereo."
        : "Push toward HIGH energy: open, spacey pads with wide stereo, brighter sheen, and denser motion (still controlled).";

  const glitchText = glitchRuleFromSpikes(sLabel);
  const phaseText = phaseDirective(index, totalSegments);

  return `${phaseText} ${energyText} ${glitchText}`;
}

export function makeExtendPlanFromAnalysis(
  analysis: SignalWindowsAnalysis,
  {
    model = "V5",
    style = "synthetic soundscape, experimental",
    baseTitle = "Ghost Fungi Transmission",
    segmentSeconds = 30,
  }: {
    model?: "V4_5" | "V3_5" | "V4" | "V5";
    style?: string;
    baseTitle?: string;
    segmentSeconds?: number;
  } = {},
): ExtendSegment[] {
  const { windows } = analysis;
  if (!windows?.length) {
    return [0, 1, 2, 3].map((i) => ({
      segmentIndex: i,
      startSec: i * segmentSeconds,
      model,
      style,
      title: `${baseTitle} - Part ${i + 1}`,
      prompt:
        `Shape segment ${i + 1} with balanced evolving pads; no percussion; smooth continuity; ` +
        `synthetic soundscape, experimental.`,
    }));
  }

  const MAX_SEGMENTS = 4;
  const totalSegments = Math.max(1, Math.min(MAX_SEGMENTS, windows.length));
  const chunkSize = Math.max(1, Math.ceil(windows.length / totalSegments));
  const groupedWindows = Array.from({ length: totalSegments }, (_, idx) => {
    const start = idx * chunkSize;
    const end =
      idx === totalSegments - 1
        ? windows.length
        : Math.min(windows.length, start + chunkSize);
    return windows.slice(start, end);
  }).filter((group) => group.length);

  const segmentsCount = groupedWindows.length;

  return groupedWindows.map((group, index) => {
    const { eLabel, sLabel } = summarizeSegment(group);
    const directive = buildSegmentDirective(
      index,
      segmentsCount,
      eLabel,
      sLabel,
    );
    const tempoGuide = tempoGuideFromEnergy(eLabel);
    const brightnessGuide = brightnessGuideFromEnergy(eLabel);
    const stereoGuide = stereoGuideFromEnergy(eLabel);
    const glitchRule = glitchRuleFromSpikes(sLabel);
    const windowDescription =
      group.length === 1
        ? describeWindow(group[0])
        : [
            describeWindow(group[0]),
            describeWindow(group[group.length - 1]),
          ].join(" ");

    const transitionNote =
      index === 0
        ? "Anchor this opening section so later extensions can grow naturally."
        : index === segmentsCount - 1
          ? "Lead into a long, gentle fade that references earlier material."
          : "Hand off smoothly from the previous segment before foreshadowing the next.";

    const prompt = [
      `Extend from ${index * segmentSeconds}s. Synthetic soundscape (experimental). Instrumental only.`,
      "No percussion. No drums. No vocals.",
      directive,
      windowDescription,
      tempoGuide,
      brightnessGuide,
      stereoGuide,
      glitchRule,
      transitionNote,
      "Transitions must remain seamless and cohesive; avoid loudness spikes.",
    ].join(" ");

    return {
      segmentIndex: index,
      startSec: index * segmentSeconds,
      model,
      style,
      title: `${baseTitle} - Part ${index + 1}`,
      prompt,
    };
  });
}

/* ---------------- First-30s base prompt helper ---------------- */

export function initialPromptFromAnalysis(
  analysis: SignalWindowsAnalysis,
  {
    style = "synthetic soundscape, experimental",
  }: { style?: string } = {},
): SunoRequest {
  if (!analysis?.windows?.length) return fallbackRequest();

  const firstWindow = analysis.windows[0];
  const { eLabel, sLabel } = summarizeSegment([firstWindow]);

  const tempo =
    eLabel === "low"
      ? "~60 BPM (felt)"
      : eLabel === "medium"
        ? "~75 BPM (felt)"
        : "~95 BPM (felt)";

  const glitch =
    sLabel === "few"
      ? "Glitch is nearly absent."
      : sLabel === "some"
        ? "Use subtle glitch flickers."
        : "Use controlled, short glitch accents (never percussive).";

  const energyIntro =
    eLabel === "low"
      ? "Start sparse with narrow-band pads, darker filters, and slow modulation. Stereo image modest."
      : eLabel === "medium"
        ? "Start balanced with a few evolving layers, moderate modulation, and controlled stereo width."
        : "Start already open with wide, spacey pads, brighter spectral sheen, and bolder harmonies (still smooth).";

  const windowDescription = describeWindow(firstWindow);

  const prompt = [
    "Create ~30 seconds of instrumental synthetic soundscape (experimental).",
    "No percussion. No drums. No vocals.",
    energyIntro,
    `Tempo feel ${tempo}.`,
    glitch,
    windowDescription,
    "This 30s segment will be extended later; ensure a coherent, evolving texture with smooth continuity.",
  ].join(" ");

  return {
    customMode: true,
    instrumental: true,
    model: "V5",
    style,
    title: "Ghost Fungi Transmission - Part 1",
    styleWeight: 1,
    weirdnessConstraint: 0.08,
    negativeTags:
      "percussion, drums, kicks, clap, hi-hat, snare, vocals, risers, impacts",
    prompt,
  };
}

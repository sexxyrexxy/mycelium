// components/portfolio/sonification/sonify.ts

// ---------- Types ----------

export type SunoRequest = {
  prompt: string;
  customMode: boolean;
  instrumental: boolean;
  model: "V4_5" | "V3_5" | "V4" | "V5";
  title?: string;
  style?: string;
  styleWeight?: number;          // 0..1
  weirdnessConstraint?: number;  // 0..1 (higher = weirder)
  negativeTags?: string;
};

// ---------- Helpers: basic stats ----------

function clamp01(x: number) { return Math.min(1, Math.max(0, x)); }

function meanAbs(arr: number[]) {
  if (arr.length === 0) return 0;
  let s = 0;
  for (const v of arr) s += Math.abs(v);
  return s / arr.length;
}

function std(arr: number[]) {
  if (arr.length < 2) return 0;
  const m = arr.reduce((a, b) => a + b, 0) / arr.length;
  let v = 0;
  for (const x of arr) v += (x - m) * (x - m);
  return Math.sqrt(v / (arr.length - 1));
}

function diff(arr: number[]) {
  const out: number[] = [];
  for (let i = 1; i < arr.length; i++) out.push(arr[i] - arr[i - 1]);
  return out;
}

// Downsample/compress into fixed number of bins by averaging blocks.
// Works well when your timestamps are ~1Hz (your CSVs are).
function binCompress(signal: number[], bins: number): number[] {
  const N = signal.length;
  if (N <= bins) return signal.slice(); // already short; let Suno reflect the micro-variation
  const size = N / bins;
  const out: number[] = new Array(bins);
  for (let i = 0; i < bins; i++) {
    const start = Math.floor(i * size);
    const end = Math.min(N, Math.floor((i + 1) * size));
    if (end <= start) { out[i] = signal[Math.min(start, N - 1)] ?? 0; continue; }
    let sum = 0; let c = 0;
    for (let j = start; j < end; j++) { sum += signal[j]; c++; }
    out[i] = c ? sum / c : 0;
  }
  return out;
}

// Compute bin-wise features for structure mapping
function featuresPerBin(binned: number[]) {
  // Energy proxy: mean absolute value per bin (already averaged)
  // Spike density: count(|Δ| > threshold) in a small window approximation.
  const diffs = diff(binned);
  const dStd = std(diffs) || 1e-6;
  const spikeThresh = 2.0 * dStd; // "big jump" threshold ≈ 2σ

  const energy: number[] = [];
  const spikes: number[] = [];

  // For each bin, approximate local energy & spikes from neighbors
  for (let i = 0; i < binned.length; i++) {
    const window = binned.slice(Math.max(0, i - 2), Math.min(binned.length, i + 3));
    energy.push(meanAbs(window));
    let s = 0;
    for (let k = Math.max(0, i - 2); k < Math.min(binned.length - 1, i + 3); k++) {
      if (Math.abs(binned[k + 1] - binned[k]) > spikeThresh) s++;
    }
    spikes.push(s);
  }

  // Normalize features to 0..1 for easier language mapping
  const eMax = Math.max(...energy, 1e-6);
  const sMax = Math.max(...spikes, 1e-6);
  const eNorm = energy.map(v => v / eMax);
  const sNorm = spikes.map(v => v / sMax);

  return { energy: eNorm, spikes: sNorm };
}

// Partition into 3 acts based on median energy trend; emphasize where spikes cluster.
function makeActs(energy: number[], spikes: number[]) {
  const n = energy.length;
  const A = Math.floor(n / 3), B = Math.floor((2 * n) / 3);

  const acts = [
    { name: "Act I",  range: [0, A] },
    { name: "Act II", range: [A, B] },
    { name: "Act III",range: [B, n] },
  ] as const;

  function summarize([lo, hi]: [number, number]) {
    const e = energy.slice(lo, hi);
    const s = spikes.slice(lo, hi);
    const eAvg = e.reduce((a, b) => a + b, 0) / Math.max(1, e.length);
    const sAvg = s.reduce((a, b) => a + b, 0) / Math.max(1, s.length);
    // Qualitative labels
    const eLabel =
      eAvg < 0.33 ? "low" : eAvg < 0.66 ? "moderate" : "high";
    const sLabel =
      sAvg < 0.20 ? "few" : sAvg < 0.55 ? "intermittent" : "frequent";
    return { eAvg, sAvg, eLabel, sLabel };
  }

  const A1 = summarize(acts[0].range as [number, number]);
  const A2 = summarize(acts[1].range as [number, number]);
  const A3 = summarize(acts[2].range as [number, number]);

  return {
    acts: [
      { idx: 1, ...A1 },
      { idx: 2, ...A2 },
      { idx: 3, ...A3 },
    ],
  };
}

// ---------- MAIN: map long signal → SunoRequest ----------

// Target ~2 minutes. We map one bin ≈ one "second" of musical evolution.
const TARGET_DURATION_SEC = 120;
const BINS = TARGET_DURATION_SEC; // 120 bins ≈ 2 minutes of macro-shape

export function mapSignalToSuno(signal: number[]): SunoRequest {
  // 1) Clean the input
  const clean = signal
    .map(v => Number.isFinite(v) ? v : 0)
    .filter(v => !Number.isNaN(v));

  // Safety fallback
  if (clean.length === 0) {
    return {
      prompt: "A mysterious sci-fi ambient instrumental, gentle and evolving.",
      customMode: true,
      instrumental: true,
      style: "mysterious sci-fi ambient",
      title: "Mycelium Echoes",
      model: "V5",
      styleWeight: 0.75,
      weirdnessConstraint: 0.35,
      negativeTags: "no drums, no vocals, no harsh noise",
    };
  }

  // 2) Compress to ~120 bins so the whole day fits ~2 minutes
  const b = binCompress(clean, BINS);

  // 3) Extract features per bin
  const { energy, spikes } = featuresPerBin(b);

  // 4) Build a simple 3-act storyline from features
  const { acts } = makeActs(energy, spikes);

  // 5) Global stats for flavor text
  const eAvgAll = energy.reduce((a, x) => a + x, 0) / energy.length;
  const sAvgAll = spikes.reduce((a, x) => a + x, 0) / spikes.length;

  // 6) Translate to musical direction (words Suno responds well to)
  //    We keep it instrumental & mysterious sci-fi as requested.
  const overallMood =
    eAvgAll < 0.33 ? "deep and minimal" :
    eAvgAll < 0.66 ? "subtly pulsing" : "tense and vivid";

  const spikeFlavor =
    sAvgAll < 0.2 ? "rare glints" :
    sAvgAll < 0.55 ? "intermittent flares" : "frequent glitchy bursts";

  // Per-act descriptors
  function actLine(i: number, eLabel: string, sLabel: string) {
    const startWords = i === 1 ? "Begin" : i === 2 ? "Evolve" : "Resolve";
    const eWord = eLabel === "low" ? "low-energy drones"
      : eLabel === "moderate" ? "broader textures"
      : "pressurized swells";
    const sWord = sLabel === "few" ? "subtle sparkles"
      : sLabel === "intermittent" ? "occasional spike accents"
      : "frequent glitch accents";
    return `${startWords} with ${eWord} and ${sWord}.`;
  }

  const actText = [
    actLine(1, acts[0].eLabel, acts[0].sLabel),
    actLine(2, acts[1].eLabel, acts[1].sLabel),
    actLine(3, acts[2].eLabel, acts[2].sLabel),
  ].join(" ");

  // 7) Final Suno request (instrumental, customMode=true, V4_5 for length)
  return {
    customMode: true,
    instrumental: true,
    model: "V5",
    style: "synthwave mysterious sci-fi ambient",
    title: "Ghost Fungi Transmission",
    styleWeight: 0.8,
    weirdnessConstraint: 0.35,
    negativeTags: "no drums, no vocals, no heavy distortion",

    // The prompt steers the length & macro-shape.
    // Suno doesn’t take an explicit 'duration' param; we ask for ~2 minutes.
    prompt:
      `Approximately 2-minute instrumental, ${overallMood}, with ${spikeFlavor}. ` +
      `Textural, evolving sound design; no percussion kits. ` +
      `Three-act arc reflecting bioelectric activity: ${actText} ` +
      `Use analog-sounding synths, resonant drones, spectral pads, and soft granular flickers. ` +
      `Keep it mysterious and sci-fi; cohesive, not chaotic.`,
  };
}

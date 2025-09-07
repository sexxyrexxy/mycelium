// components/portfolio/sonification/sonify.ts
// Typed ES module for React/Next.js + TypeScript.
// CSV with blank time header + "Signal MV", HH:MM:SS times, tab/comma autodetect.
// Uses value-curve scheduling for smooth, non-blocking playback.

import * as Tone from "tone";

export type LoadSummary = {
  rows: number;
  tStart: number;
  tEnd: number;
  vMin: number;
  vMax: number;
};

export type StartOptions = {
  timeCompression?: number;
  smoothingWindow?: number;
  controlRateHz?: number;
  freqMin?: number;
  freqMax?: number;
  cutoffMin?: number;
  cutoffMax?: number;
};

// ---------- helpers ----------
function stripBOM(s: string) {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

function detectDelimiter(line: string) {
  const tabs = (line.match(/\t/g) || []).length;
  const commas = (line.match(/,/g) || []).length;
  return tabs > commas ? "\t" : ",";
}

function parseHHMMSS(s: string): number {
  const parts = s.trim().split(":");
  if (parts.length < 2) return NaN;
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  const sec = parts[2] ? parseFloat(parts[2]) : 0;
  return h * 3600 + m * 60 + (Number.isFinite(sec) ? sec : 0);
}

function movingAverage(arr: number[], win = 5) {
  if (win <= 1) return arr.slice();
  const out = new Array<number>(arr.length);
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    sum += arr[i];
    if (i >= win) sum -= arr[i - win];
    const denom = Math.min(i + 1, win);
    out[i] = sum / denom;
  }
  return out;
}

function normalizeCentered(arr: number[]) {
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const centered = arr.map((v) => v - mean);
  const peak = Math.max(1e-9, ...centered.map((v) => Math.abs(v)));
  return centered.map((v) => v / peak);
}

function downsample(times: number[], values: number[], targetHz = 100) {
  const outT: number[] = [];
  const outV: number[] = [];
  if (!times.length) return { times: outT, values: outV };
  const t0 = times[0];
  const dt = 1 / targetHz;
  let nextT = t0;

  for (let i = 0; i < times.length - 1; i++) {
    const t1 = times[i],
      t2 = times[i + 1];
    const v1 = values[i],
      v2 = values[i + 1];
    while (nextT >= t1 && nextT < t2) {
      const a = (nextT - t1) / Math.max(1e-9, t2 - t1);
      outT.push(nextT);
      outV.push((1 - a) * v1 + a * v2);
      nextT += dt;
    }
  }
  outT.push(times[times.length - 1]);
  outV.push(values[values.length - 1]);
  return { times: outT, values: outV };
}

function mapLin(v: number, inMin: number, inMax: number, outMin: number, outMax: number) {
  const a = (v - inMin) / (inMax - inMin);
  return outMin + a * (outMax - outMin);
}

// ---------- module state ----------
let rawTimesSec: number[] = [];
let rawVolts: number[] = [];
let osc: Tone.Oscillator | null = null;
let filter: Tone.Filter | null = null;
let limiter: Tone.Limiter | null = null;
let audioReady = false;

// ---------- CSV loader (blank time header + "Signal MV") ----------
export async function loadCsv(csvUrl: string): Promise<LoadSummary> {
  const res = await fetch(encodeURI(csvUrl), { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch CSV: ${res.status}`);
  let text = stripBOM(await res.text());

  // split lines; ignore trailing blanks
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) throw new Error("CSV appears empty");

  const delimiter = detectDelimiter(lines[0]);
  const header = lines[0].split(delimiter).map((s) => s.trim());
  const rows = lines.slice(1).map((l) => l.split(delimiter));

  // value index: try header "Signal MV", else last column
  let valIdx = header.findIndex((h) => /^signal\s*mv$/i.test(h));
  if (valIdx === -1) valIdx = Math.max(0, (header.length || rows[0]?.length || 1) - 1);

  // time index: prefer column 0 if blank header & HH:MM:SS, else common names, else 0 when >= 2 cols
  let timeIdx = -1;
  if (header[0] === "" || header[0] == null) {
    const looksLikeTime = rows.slice(0, 5).every((r) => r[0] && r[0].includes(":"));
    if (looksLikeTime) timeIdx = 0;
  }
  if (timeIdx === -1) {
    const guess = header.findIndex((h) => /^(unnamed:\s*0|time|time_s|timestamp)$/i.test(h));
    if (guess >= 0) timeIdx = guess;
  }
  if (timeIdx === -1 && (header.length >= 2 || rows[0]?.length >= 2)) timeIdx = 0;

  if (timeIdx < 0 || valIdx < 0) {
    throw new Error(`Could not find time/value columns. Saw headers: ${header.join(" | ")}`);
  }

  const tsec: number[] = [];
  const volts: number[] = [];
  for (const r of rows) {
    const tRaw = (r[timeIdx] ?? "").trim();
    const vRaw = (r[valIdx] ?? "").trim();
    if (!tRaw || !vRaw) continue;
    const t = parseHHMMSS(tRaw);
    const v = parseFloat(vRaw);
    if (!Number.isFinite(t) || !Number.isFinite(v)) continue;
    if (tsec.length && t < tsec[tsec.length - 1]) continue; // enforce monotonic time
    tsec.push(t);
    volts.push(v);
  }

  if (tsec.length < 2) throw new Error("Not enough valid rows after parsing.");

  rawTimesSec = tsec;
  rawVolts = volts;

  return {
    rows: tsec.length,
    tStart: tsec[0],
    tEnd: tsec[tsec.length - 1],
    vMin: Math.min(...volts),
    vMax: Math.max(...volts),
  };
}

// ---------- audio graph ----------
function setupAudioIfNeeded() {
  if (audioReady) return;
  osc = new Tone.Oscillator({ type: "sine", frequency: 220 }).start();
  filter = new Tone.Filter({ frequency: 1000, type: "lowpass", Q: 0.5 });
  limiter = new Tone.Limiter(-1).toDestination();
  osc.connect(filter).connect(limiter);
  audioReady = true;
}

// ---------- start/stop ----------
export async function start(opts: StartOptions = {}) {
  if (!rawTimesSec.length) throw new Error("Call loadCsv() first.");

  const {
    timeCompression = 50,
    smoothingWindow = 5,
    controlRateHz = 100,
    freqMin = 220,
    freqMax = 660,
    cutoffMin = 300,
    cutoffMax = 5000,
  } = opts;

  await Tone.start(); // must be in a user gesture
  const ctx = Tone.getContext().rawContext;
  if (ctx.state !== "running") await ctx.resume();
  setupAudioIfNeeded();

  // preprocess
  const smoothed = movingAverage(rawVolts, smoothingWindow);
  const norm = normalizeCentered(smoothed);

  // resample onto uniform grid (required for value curves)
  const { times, values } = downsample(rawTimesSec, norm, controlRateHz);
  if (times.length < 2) throw new Error("Not enough points after resampling.");

  // map to arrays
const freqCurve: number[] = new Array(values.length);
const cutoffCurve: number[] = new Array(values.length);
  for (let i = 0; i < values.length; i++) {
    const v = values[i]; // -1..1
    let f = mapLin(v, -1, 1, freqMin, freqMax);
    let c = mapLin(v, -1, 1, cutoffMin, cutoffMax);
    if (f < 1) f = 1;
    if (c < 10) c = 10;
      freqCurve[i] = f;
      cutoffCurve[i] = c;
  }

  // schedule curves
  const now = Tone.now();
  const duration = (times[times.length - 1] - times[0]) / timeCompression;

  // clear prior automation
  osc!.frequency.cancelAndHoldAtTime(now);
  filter!.frequency.cancelAndHoldAtTime(now);

  // one-shot automation (non-blocking)
  osc!.frequency.setValueCurveAtTime(freqCurve, now, duration);
  filter!.frequency.setValueCurveAtTime(cutoffCurve, now, duration);
}

export function stop() {
  if (!audioReady) return;
  try {
    osc?.stop("+0.05");
  } catch {}
  try {
    filter?.dispose();
  } catch {}
  try {
    limiter?.dispose();
  } catch {}
  osc = null;
  filter = null;
  limiter = null;
  audioReady = false;
}

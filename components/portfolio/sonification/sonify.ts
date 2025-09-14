// components/portfolio/sonification/sonify.ts
// CSV → C-major piano sonification (Tone.Player anchors, voice pool, streaming scheduler).

import * as Tone from "tone";

export type LoadSummary = { rows: number; tStart: number; tEnd: number; vMin: number; vMax: number };
export type PianoOptions = {
  timeCompression?: number;  // 1 = realtime; >1 = faster
  smoothingWindow?: number;  // moving average window
  stepRateHz?: number;       // steps/sec before compression
  scaleMidiLow?: number;     // 48=C3
  scaleMidiHigh?: number;    // 84=C6
  velocity?: number;         // 0..1
  noteLenSec?: number;       // note length before compression
  reverbWet?: number;        // 0..1
  maxNotes?: number;         // optional cap
};

/* -------------------- small helpers -------------------- */
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const mapLin = (v: number, inMin: number, inMax: number, outMin: number, outMax: number) =>
  outMin + ((v - inMin) / Math.max(1e-9, inMax - inMin)) * (outMax - outMin);
const stripBOM = (s: string) => (s.charCodeAt(0) === 0xfeff ? s.slice(1) : s);
const detectDelimiter = (l: string) => ((l.match(/\t/g) || []).length > (l.match(/,/g) || []).length ? "\t" : ",");
const parseHHMMSS = (s: string) => {
  const [hh, mm, ss] = String(s).trim().split(":");
  if (mm === undefined) return NaN;
  return (parseInt(hh || "0") || 0) * 3600 + (parseInt(mm || "0") || 0) * 60 + (parseFloat(ss || "0") || 0);
};
const movingAverage = (arr: number[], win = 5) => {
  if (win <= 1) return arr.slice();
  const out = new Array<number>(arr.length);
  let sum = 0;
  for (let i = 0; i < arr.length; i++) { sum += arr[i]; if (i >= win) sum -= arr[i - win]; out[i] = sum / Math.min(i + 1, win); }
  return out;
};
const normalizeCentered = (arr: number[]) => {
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const c = arr.map((v) => v - mean);
  const peak = Math.max(1e-9, ...c.map((v) => Math.abs(v)));
  return c.map((v) => v / peak);
};
const downsample = (times: number[], values: number[], hz = 100) => {
  const T: number[] = [], V: number[] = [];
  if (!times.length) return { times: T, values: V };
  const dt = 1 / hz; let next = times[0];
  for (let i = 0; i < times.length - 1; i++) {
    const t1 = times[i], t2 = times[i + 1], v1 = values[i], v2 = values[i + 1];
    while (next >= t1 && next < t2) { const a = (next - t1) / Math.max(1e-9, t2 - t1); T.push(next); V.push((1 - a) * v1 + a * v2); next += dt; }
  }
  T.push(times.at(-1)!); V.push(values.at(-1)!); return { times: T, values: V };
};
const buildScaleMidi = (low: number, high: number, deg = [0, 2, 4, 5, 7, 9, 11]) => {
  const out: number[] = []; for (let m = low; m <= high; m++) if (deg.includes(m % 12)) out.push(m); return out;
};

/* -------------------- module state -------------------- */
let rawTimesSec: number[] = [];
let rawVolts: number[] = [];

type Anchor = { midi: number; name: string; players: Tone.Player[]; offsetSec: number; rr: number };
let anchors: Anchor[] | null = null;
let pianoReverb: Tone.Reverb | null = null;
let pianoComp: Tone.Compressor | null = null;
let pianoLimiter: Tone.Limiter | null = null;

/* streaming scheduler */
let streamTimer: number | null = null;
let streamIdx = 0;
let streamStartAt = 0;
let streamStepSec = 0.25;
let streamDurSec = 0.25;
let streamSeqMidi: number[] = [];

/* -------------------- CSV loader -------------------- */
export async function loadCsv(csvUrl: string): Promise<LoadSummary> {
  const res = await fetch(encodeURI(csvUrl), { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch CSV: ${res.status}`);
  const text = stripBOM(await res.text());
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) throw new Error("CSV appears empty");

  const delim = detectDelimiter(lines[0]);
  const header = lines[0].split(delim).map((s) => s.trim());
  const rows = lines.slice(1).map((l) => l.split(delim));

  let valIdx = header.findIndex((h) => /^signal\s*mv$/i.test(h));
  if (valIdx < 0) valIdx = Math.max(0, (header.length || rows[0]?.length || 1) - 1);

  let timeIdx = -1;
  if (!header[0]) {
    const looksLike = rows.slice(0, 5).every((r) => r[0] && r[0].includes(":"));
    if (looksLike) timeIdx = 0;
  }
  if (timeIdx < 0) {
    const guess = header.findIndex((h) => /^(unnamed:\s*0|time|time_s|timestamp)$/i.test(h));
    if (guess >= 0) timeIdx = guess;
  }
  if (timeIdx < 0 && (header.length >= 2 || rows[0]?.length >= 2)) timeIdx = 0;
  if (timeIdx < 0 || valIdx < 0) throw new Error(`Could not find time/value columns. Saw headers: ${header.join(" | ")}`);

  const t: number[] = [], v: number[] = [];
  for (const r of rows) {
    const ts = (r[timeIdx] ?? "").trim(), vs = (r[valIdx] ?? "").trim();
    if (!ts || !vs) continue;
    const T = parseHHMMSS(ts), V = parseFloat(vs);
    if (!Number.isFinite(T) || !Number.isFinite(V)) continue;
    if (t.length && T < t.at(-1)!) continue;
    t.push(T); v.push(V);
  }
  if (t.length < 2) throw new Error("Not enough valid rows after parsing.");

  rawTimesSec = t; rawVolts = v;
  return { rows: t.length, tStart: t[0], tEnd: t.at(-1)!, vMin: Math.min(...v), vMax: Math.max(...v) };
}

/* -------------------- audio setup -------------------- */
const AUDIO_BASE = "/sounds/";     // adjust if needed
const VOICES = 6;                  // polyphony per anchor
const FADE_IN = 0.01, FADE_OUT = 0.06;

async function setupPianoIfNeeded() {
  if (anchors) return;
  const files = [
    { midi: 60, name: "C4", url: AUDIO_BASE + "C4.mp3", offsetSec: 1.0 },
    { midi: 64, name: "E4", url: AUDIO_BASE + "E4.mp3", offsetSec: 1.0 },
    { midi: 67, name: "G4", url: AUDIO_BASE + "G4.mp3", offsetSec: 1.0 },
    { midi: 72, name: "C5", url: AUDIO_BASE + "C5.mp3", offsetSec: 1.0 },
  ];

  pianoReverb  = new Tone.Reverb({ decay: 2.5, wet: 0.2 });
  pianoComp    = new Tone.Compressor({ threshold: -14, ratio: 2, attack: 0.01, release: 0.2 });
  pianoLimiter = new Tone.Limiter(-6);

  anchors = [];
  for (const f of files) {
    const players: Tone.Player[] = [];
    const url = encodeURI(f.url);
    for (let i = 0; i < VOICES; i++) {
      const p = new Tone.Player(url);
      p.autostart = false; p.fadeIn = FADE_IN; p.fadeOut = FADE_OUT;
      p.chain(pianoReverb!, pianoComp!, pianoLimiter!, Tone.Destination);
      await p.load(url);
      players.push(p);
    }
    anchors.push({ midi: f.midi, name: f.name, players, offsetSec: f.offsetSec, rr: 0 });
  }
}

const pickNearestAnchor = (midi: number) => {
  if (!anchors?.length) throw new Error("Anchors not loaded");
  return anchors.reduce((b, a) => (Math.abs(midi - a.midi) < Math.abs(midi - b.midi) ? a : b), anchors[0]);
};
const nextVoice = (a: Anchor) => a.players[(a.rr++) % a.players.length];

function safeStartVoice(voice: Tone.Player, offset: number, rate: number, tPlay: number, wantDur: number) {
  const durBuf = voice.buffer?.duration ?? 0;
  const maxDur = rate > 0 ? Math.max(0, (durBuf - offset) / rate) : 0;
  const dur = Math.min(wantDur, Math.max(0, maxDur - 0.005));
  if (dur <= 0) return false;
  voice.start(tPlay, offset, dur); return true;
}

/* -------------------- streaming scheduler -------------------- */
function stopStream() {
  if (streamTimer != null) { window.clearInterval(streamTimer); streamTimer = null; }
  streamIdx = 0; streamSeqMidi = [];
}
function scheduleOne(i: number, tPlay: number, velDb: number) {
  const a = pickNearestAnchor(streamSeqMidi[i]);
  const semis = streamSeqMidi[i] - a.midi;
  const rate = Math.pow(2, semis / 12);
  const v = nextVoice(a);
  v.playbackRate = rate; v.volume.value = velDb;
  safeStartVoice(v, a.offsetSec, rate, tPlay, streamDurSec);
}
function startStream(seq: number[], startAt: number, stepSec: number, durSec: number, velDb: number) {
  stopStream();
  streamSeqMidi = seq; streamStartAt = startAt; streamStepSec = stepSec; streamDurSec = durSec;

  const WINDOW = 2.0, TICK = 150; // seconds, ms
  const prime = Math.min(8, seq.length);
  for (let j = 0; j < prime; j++) scheduleOne(j, startAt + j * stepSec, velDb);
  streamIdx = prime;

  streamTimer = window.setInterval(() => {
    const now = Tone.now(), horizon = now + WINDOW;
    while (streamIdx < seq.length) {
      const tPlay = startAt + streamIdx * stepSec;
      if (tPlay > horizon) break;
      scheduleOne(streamIdx, tPlay, velDb);
      streamIdx++;
    }
    if (streamIdx >= seq.length) stopStream();
  }, TICK);
}

/* -------------------- public API -------------------- */
export async function startPiano(opts: PianoOptions = {}) {
  if (!rawTimesSec.length) throw new Error("Call loadCsv() first.");

  const {
    timeCompression = 1,
    smoothingWindow = 7,
    stepRateHz = 2,
    scaleMidiLow = 48,
    scaleMidiHigh = 84,
    velocity = 0.85,
    noteLenSec = 0.30,
    reverbWet = 0.2,
    maxNotes,
  } = opts;

  await Tone.start();
  const ctx = Tone.getContext().rawContext; if (ctx.state !== "running") await ctx.resume();
  Tone.getContext().lookAhead = 0.08;

  await setupPianoIfNeeded();
  if (pianoReverb) { (pianoReverb as any).preDelay = 0; pianoReverb.wet.value = reverbWet; }

  // preprocess → normalized values
  const norm = normalizeCentered(movingAverage(rawVolts, smoothingWindow));
  const { values } = downsample(rawTimesSec, norm, stepRateHz);
  if (values.length < 2) throw new Error("Not enough points after resampling.");

  // ✅ Correct mapping: value (-1..1) → index → C-major MIDI note
  const scale = buildScaleMidi(scaleMidiLow, scaleMidiHigh);
  const seqAll: number[] = new Array(values.length);
  for (let i = 0; i < values.length; i++) {
    const idx = clamp(Math.round(mapLin(values[i], -1, 1, 0, scale.length - 1)), 0, scale.length - 1);
    seqAll[i] = scale[idx];
  }
  const seq = maxNotes ? seqAll.slice(0, maxNotes) : seqAll;

  const startAt = Tone.now() + 0.08;
  const stepSec = Math.max(0.25, 1 / stepRateHz / Math.max(1, timeCompression));
  const durSec  = Math.max(0.25, noteLenSec / Math.max(1, timeCompression));
  const velDb   = Tone.gainToDb(clamp(velocity, 0, 0.9));

  startStream(seq, startAt, stepSec, durSec, velDb);
}

export function stopPiano() {
  stopStream();
  try { anchors?.forEach((a) => a.players.forEach((p) => p.stop())); } catch {}
}

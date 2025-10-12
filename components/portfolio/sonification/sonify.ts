// components/portfolio/sonification/sonify.ts
// CSV → C-major piano sonification (Tone.Player anchors, voice pool, streaming scheduler)
// + ambient FM pad sonification (simple)
// + choir pad sonification (streamed chunks, envelopes, limiter)
// Piano and Choir engines are fully separated. Piano has a per-note synth fallback if a sample note can't be started.

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

/* -------------------- helpers -------------------- */
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
  const mean = arr.reduce((a, b) => a + b, 0) / Math.max(1, arr.length);
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
const midiToFreq = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

/* -------------------- module state -------------------- */
let rawTimesSec: number[] = [];
let rawVolts: number[] = [];

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
  if (timeIdx < 0 || valIdx < 0) throw new Error(`Could not find time/value columns.`);

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

/* ===================================================================== */
/* ==================== PIANO ENGINE (old logic + per-note fallback) === */
/* ===================================================================== */
const PIANO_AUDIO_BASE = "/sounds/";
const PIANO_VOICES = 6;
const PIANO_FADE_IN = 0.01, PIANO_FADE_OUT = 0.06;

type PianoAnchor = { midi: number; name: string; players: Tone.Player[]; offsetSec: number; rr: number };

let pianoAnchors: PianoAnchor[] | null = null;
let pianoReverb: Tone.Reverb | null = null;
let pianoComp: Tone.Compressor | null = null;
let pianoLimiter: Tone.Limiter | null = null;

let pianoTimer: number | null = null;
let pianoIdx = 0;
let pianoStartAt = 0;
let pianoStepSec = 0.25;
let pianoDurSec = 0.25;
let pianoSeqMidi: number[] = [];

// Per-note synth fallback — ALWAYS created so any skipped sample still makes sound
let pianoFallback: Tone.PolySynth | null = null;

async function setupPianoIfNeeded() {
  if (pianoAnchors) return;

  // ensure fallback exists
  if (!pianoFallback) {
    pianoFallback = new Tone.PolySynth(Tone.Synth, {
      envelope: { attack: 0.01, decay: 0.15, sustain: 0.2, release: 0.35 }
    }).toDestination();
  }

  const files = [
    { midi: 60, name: "C4", url: PIANO_AUDIO_BASE + "C4.mp3", offsetSec: 1.0 },
    { midi: 64, name: "E4", url: PIANO_AUDIO_BASE + "E4.mp3", offsetSec: 1.0 },
    { midi: 67, name: "G4", url: PIANO_AUDIO_BASE + "G4.mp3", offsetSec: 1.0 },
    { midi: 72, name: "C5", url: PIANO_AUDIO_BASE + "C5.mp3", offsetSec: 1.0 },
  ];

  pianoReverb  = new Tone.Reverb({ decay: 2.5, wet: 0.2 });
  pianoComp    = new Tone.Compressor({ threshold: -14, ratio: 2, attack: 0.01, release: 0.2 });
  pianoLimiter = new Tone.Limiter(-6);

  const anchors: PianoAnchor[] = [];
  for (const f of files) {
    const players: Tone.Player[] = [];
    const url = encodeURI(f.url);
    for (let i = 0; i < PIANO_VOICES; i++) {
      const p = new Tone.Player(url);
      p.autostart = false; p.fadeIn = PIANO_FADE_IN; p.fadeOut = PIANO_FADE_OUT;
      p.chain(pianoReverb!, pianoComp!, pianoLimiter!, Tone.Destination);
      await p.load(url);
      players.push(p);
    }
    anchors.push({ midi: f.midi, name: f.name, players, offsetSec: f.offsetSec, rr: 0 });
  }
  pianoAnchors = anchors;
  console.log(`[piano] anchors loaded: ${pianoAnchors.length} × ${PIANO_VOICES} voices`);
}

const pianoPickNearestAnchor = (midi: number) => {
  if (!pianoAnchors?.length) throw new Error("[piano] anchors not loaded");
  return pianoAnchors.reduce((b, a) => (Math.abs(midi - a.midi) < Math.abs(midi - b.midi) ? a : b), pianoAnchors[0]);
};
const pianoNextVoice = (a: PianoAnchor) => a.players[(a.rr++) % a.players.length];

function pianoSafeStartVoice(voice: Tone.Player, offset: number, rate: number, tPlay: number, wantDur: number) {
  const durBuf = voice.buffer?.duration ?? 0;
  const maxDur = rate > 0 ? Math.max(0, (durBuf - offset) / rate) : 0;
  const dur = Math.min(wantDur, Math.max(0, maxDur - 0.005));
  if (dur <= 0) return 0; // 0 = failed
  voice.start(tPlay, offset, dur);
  return dur; // >0 = success, actual dur
}

function pianoStopStream() {
  if (pianoTimer != null) { window.clearInterval(pianoTimer); pianoTimer = null; }
  pianoIdx = 0; pianoSeqMidi = [];
}

function pianoScheduleOne(i: number, tPlay: number, velDb: number) {
  const midi = pianoSeqMidi[i];

  // try sample-based
  let started = false;
  try {
    const a = pianoPickNearestAnchor(midi);
    const semis = midi - a.midi;
    const rate = Math.pow(2, semis / 12);
    const v = pianoNextVoice(a);
    v.playbackRate = rate; v.volume.value = velDb;
    const dur = pianoSafeStartVoice(v, a.offsetSec, rate, tPlay, pianoDurSec);
    started = dur > 0;
  } catch (e) {
    started = false;
  }

  // synth fallback if that step couldn't be started by the sample player
  if (!started && pianoFallback) {
    const freq = midiToFreq(midi);
    const gain = clamp(Tone.dbToGain(velDb), 0.05, 1);
    (pianoFallback as any).set({ volume: Tone.gainToDb(gain) });
    pianoFallback.triggerAttackRelease(freq, pianoDurSec, tPlay, gain);
  }
}

function pianoStartStream(seq: number[], startAt: number, stepSec: number, durSec: number, velDb: number) {
  pianoStopStream();
  pianoSeqMidi = seq; pianoStartAt = startAt; pianoStepSec = stepSec; pianoDurSec = durSec;

  const WINDOW = 4.0, TICK = 100; // slightly bigger window, quicker tick
  const prime = Math.min(12, seq.length);
  for (let j = 0; j < prime; j++) pianoScheduleOne(j, startAt + j * stepSec, velDb);
  pianoIdx = prime;

  pianoTimer = window.setInterval(() => {
    const now = Tone.now(), horizon = now + WINDOW;
    while (pianoIdx < seq.length) {
      const tPlay = startAt + pianoIdx * stepSec;
      if (tPlay > horizon) break;
      pianoScheduleOne(pianoIdx, tPlay, velDb);
      pianoIdx++;
    }
    if (pianoIdx >= seq.length) pianoStopStream();
  }, TICK);
}

/* ---- public API (old mapping) ---- */
export async function startPiano(opts: PianoOptions = {}) {
  if (!rawTimesSec.length) throw new Error("Call loadCsv() first.");

  const {
    timeCompression = 2,
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
  if (values.length < 2) throw new Error("[piano] Not enough points after resampling.");

  // value (-1..1) → index → C-major MIDI note
  const scale = buildScaleMidi(scaleMidiLow, scaleMidiHigh);
  const seqAll: number[] = new Array(values.length);
  for (let i = 0; i < values.length; i++) {
    const idx = clamp(Math.round(mapLin(values[i], -1, 1, 0, scale.length - 1)), 0, scale.length - 1);
    seqAll[i] = scale[idx];
  }
  const seq = maxNotes ? seqAll.slice(0, maxNotes) : seqAll;

  const startAt = Tone.now() + 0.12;
  const stepSec = Math.max(0.25, 1 / stepRateHz / Math.max(1, timeCompression));
  const durSec  = Math.max(0.28, noteLenSec / Math.max(1, timeCompression)); // slightly longer for clarity
  const velDb   = Tone.gainToDb(clamp(velocity, 0, 0.9));

  console.log("[piano] start", { count: seq.length, stepSec, durSec, velDb });
  pianoStartStream(seq, startAt, stepSec, durSec, velDb);
}

export function stopPiano() {
  pianoStopStream();
  try { pianoAnchors?.forEach((a) => a.players.forEach((p) => p.stop())); } catch {}
}

/* ===================================================================== */
/* ===================== AMBIENT FM PAD (simple) ======================= */
/* ===================================================================== */
let fm: Tone.FMSynth | null = null;

async function setupAmbientIfNeeded() {
  if (fm) return;
  fm = new Tone.FMSynth({
    harmonicity: 2,
    modulationIndex: 4,
    envelope: { attack: 0.2, decay: 0.3, sustain: 0.6, release: 1.2 },
    modulation: { type: "triangle" }
  }).toDestination();
}

export async function startAmbient({
  timeCompression = 3,
  smoothingWindow = 7,
  stepRateHz = 3,
  velocity = 0.6,
}: any = {}) {
  if (!rawTimesSec.length) throw new Error("Call loadCsv() first.");
  await Tone.start();
  const ctx = Tone.getContext().rawContext; if (ctx.state !== "running") await ctx.resume();
  await setupAmbientIfNeeded();

  const norm = normalizeCentered(movingAverage(rawVolts, smoothingWindow));
  const { values } = downsample(rawTimesSec, norm, stepRateHz);
  if (!values.length) return;

  const startAt = Tone.now() + 0.3;
  const stepSec = (1 / stepRateHz) / Math.max(1, timeCompression);
  for (let i = 0; i < values.length; i++) {
    const base = mapLin(values[i], -1, 1, 220, 660);
    const dur = clamp(0.4 / Math.max(1, timeCompression), 0.2, 1.2);
    const t = startAt + i * stepSec;
    fm!.triggerAttackRelease(base, dur, t, velocity);
  }
}

/* ===================================================================== */
/* ================= CHOIR (streamed chunks; unchanged) ================ */
/* ===================================================================== */
type ChoirVoice = {
  player: Tone.Player;
  gain: Tone.Gain;
  busyUntil: number;
};

let choirVoices: ChoirVoice[] = [];
let choirLoaded = false;
let choirTimer: number | null = null;

const CHOIR_FILE = "/sounds/choir.mp3";
const CHOIR_POLY = 8;
const CHOIR_OFFSET = 1.7;
const CHUNK_DUR = 1.5;
const HOP = 1.0;
const SEMIS_GAIN = 120;
const RATE_MIN = 0.9, RATE_MAX = 2.0;
const MIN_NEG_SEMIS = -3;
const BASE_SEMIS_BIAS = 2;
const START_OFFSET = 0;

let choirBus: Tone.Gain | null = null;
let choirLimiter: Tone.Limiter | null = null;

async function setupChoirIfNeeded() {
  if (choirLoaded) return;

  choirBus = new Tone.Gain(0.9);
  choirLimiter = new Tone.Limiter(-2);
  choirBus.chain(choirLimiter, Tone.Destination);

  for (let i = 0; i < CHOIR_POLY; i++) {
    const p = new Tone.Player(CHOIR_FILE);
    p.autostart = false;
    await p.load(CHOIR_FILE);
    const g = new Tone.Gain(0).connect(choirBus);
    p.connect(g);
    choirVoices.push({ player: p, gain: g, busyUntil: 0 });
  }
  choirLoaded = true;
  console.log(`[choir] Loaded ${choirVoices.length} voices`);
}

function getFreeVoice(t: number): ChoirVoice | null {
  let best: ChoirVoice | null = null;
  let bestTime = Infinity;
  for (const v of choirVoices) {
    if (v.busyUntil <= t) return v;
    if (v.busyUntil < bestTime) { bestTime = v.busyUntil; best = v; }
  }
  return best;
}

export async function startChoir({
  smoothingWindow = 5,
  stepRateHz = 2,
  timeCompression = 1,
  maxNotes,
}: any = {}) {
  if (!rawTimesSec.length) throw new Error("Call loadCsv() first.");
  await Tone.start();
  const ctx = Tone.getContext().rawContext; if (ctx.state !== "running") await ctx.resume();
  Tone.getContext().lookAhead = 0.07;

  await setupChoirIfNeeded();
  if (!choirVoices.length || !choirVoices[0].player.buffer) {
    console.error("[choir] No buffers loaded; aborting.");
    return;
  }

  const norm = normalizeCentered(movingAverage(rawVolts, smoothingWindow));
  const ds = downsample(rawTimesSec, norm, stepRateHz);
  let values = ds.values;
  if (maxNotes) values = values.slice(0, maxNotes);
  if (!values.length) return;

  const stepSec = 1 / stepRateHz / Math.max(1, timeCompression);
  const chunkDur = CHUNK_DUR / Math.max(1, timeCompression);
  const hop = HOP / Math.max(1, timeCompression);
  const chunkSize = Math.max(1, Math.round(chunkDur / stepSec));
  const hopSize = Math.max(1, Math.round(hop / stepSec));

  const chunks: number[] = [];
  for (let i = 0; i < values.length; i += hopSize) {
    const s = i;
    const e = Math.min(values.length, i + chunkSize);
    const part = values.slice(s, e);
    if (!part.length) continue;
    const avg = part.reduce((a, b) => a + b, 0) / part.length;
    chunks.push(avg);
  }
  if (!chunks.length) {
    console.warn("[choir] No chunks produced.");
    return;
  }

  if (choirTimer != null) { window.clearInterval(choirTimer); choirTimer = null; }
  const now = Tone.now();
  for (const v of choirVoices) v.busyUntil = now;

  const startTime = now + 0.6 + START_OFFSET;

  let idx = 0;
  const WINDOW = 1.8;
  const TICK = 120;

  choirTimer = window.setInterval(() => {
    const now2 = Tone.now();
    const horizon = now2 + WINDOW;

    while (idx < chunks.length) {
      const t = startTime + idx * hop;
      if (t > horizon) break;

      const avg = chunks[idx];
      const semisRaw = clamp(avg * SEMIS_GAIN, -12, 12);
      const semisSoft = Math.max(semisRaw, MIN_NEG_SEMIS);
      const semis = semisSoft + BASE_SEMIS_BIAS;
      const rate = clamp(Math.pow(2, semis / 12), RATE_MIN, RATE_MAX);

      const voice = getFreeVoice(t);
      if (!voice) break;

      const bufDur = voice.player.buffer?.duration ?? 2;
      const dur = clamp(Math.min(chunkDur, bufDur - CHOIR_OFFSET, 2.5), 0.12, 5);

      voice.gain.gain.setValueAtTime(0, t);
      voice.gain.gain.linearRampToValueAtTime(1, t + 0.06);
      voice.gain.gain.setValueAtTime(1, t + Math.max(0.08, dur - 0.1));
      voice.gain.gain.linearRampToValueAtTime(0, t + dur);

      voice.player.playbackRate = rate;
      voice.player.start(t, CHOIR_OFFSET, dur);
      voice.busyUntil = t + dur + 0.01;

      console.log(`[choir] chunk#${idx} @t=${t.toFixed(2)} dur=${dur.toFixed(2)} rate=${rate.toFixed(3)}`);
      idx++;
    }

    if (idx >= chunks.length) {
      if (choirTimer != null) { window.clearInterval(choirTimer); choirTimer = null; }
      console.log("[choir] finished scheduling.");
    }
  }, TICK);
}

/* -------------------- Global Stop -------------------- */
export function stopAll() {
  // Piano
  stopPiano();

  // Ambient
  try { fm?.dispose(); fm = null; } catch {}

  // Choir
  try {
    if (choirTimer != null) { window.clearInterval(choirTimer); choirTimer = null; }
    for (const v of choirVoices) { try { v.player.stop(); } catch {} v.gain.gain.setValueAtTime(0, Tone.now()); }
  } catch {}
}

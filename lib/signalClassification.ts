// lib/signalClassification.ts

export type DirectionKey = "rising" | "steady" | "fading";

export type EnergyLevel = "low" | "medium" | "high";
export type VolatilityLevel = "stable" | "fluctuating" | "spiking";

export type SignalSampleInput = {
  signal: number | string;
  timestamp?: string | number | Date;
  timestampMs?: number;
};

export type PreparedSample = {
  index: number;
  ms: number;
  iso: string;
  signal: number;
  absSignal: number;
};

export type AudioParams = {
  layers: number;
  brightness: "dark" | "balanced" | "bright";
  modulationDepth: number; // 0..1
  modulationDescription: string;
  glitchAmount: number; // 0..1
};

export type ClassifiedWindow = {
  index: number;
  startMs: number;
  endMs: number;
  startISO: string;
  endISO: string;
  sampleCount: number;
  localAvg: number;
  localVariance: number;
  normalizedVariance: number;
  energyLevel: EnergyLevel;
  volatility: VolatilityLevel;
  combinedLabel: string;
  peak: boolean;
  audio: AudioParams;
};

export type SignalWindowsAnalysis = {
  windowMs: number;
  hopMs: number;
  globalStats: {
    count: number;
    average: number;
    stdDev: number;
  };
  windows: ClassifiedWindow[];
};

export type ClassificationOptions = {
  windowMs?: number;
  hopMs?: number;
  minimumSamplesPerWindow?: number;
  desiredWindows?: number;
};

const DEFAULT_WINDOW_MS = 3 * 60 * 60 * 1000; // 3 hours
const DEFAULT_HOP_MS = DEFAULT_WINDOW_MS;
const DEFAULT_MIN_SAMPLES = 3;
const MIN_WINDOW_MS = 60 * 1000; // 1 minute
const MIN_WINDOWS_DEFAULT = 3;
const MAX_WINDOWS_DEFAULT = 16;

export function clamp01(value: number) {
  if (!Number.isFinite(value) || Number.isNaN(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

const MILLIS_PER_SECOND = 1000;

function toMilliseconds(input: string | number | Date): number {
  if (input instanceof Date) {
    return input.getTime();
  }
  if (typeof input === "string") {
    const parsed = Date.parse(input);
    if (Number.isFinite(parsed)) return parsed;
    const numeric = Number(input);
    if (Number.isFinite(numeric)) return numeric;
    throw new Error(`Unable to parse timestamp string "${input}"`);
  }
  if (typeof input === "number") {
    return input;
  }
  throw new Error("Unsupported timestamp input");
}

function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((acc, value) => acc + value, 0) / values.length;
}

function variance(values: number[], providedMean?: number): number {
  if (values.length < 2) return 0;
  const avg = providedMean ?? mean(values);
  const sumSq = values.reduce((acc, value) => {
    const delta = value - avg;
    return acc + delta * delta;
  }, 0);
  return sumSq / (values.length - 1);
}

function stdDev(values: number[], providedMean?: number): number {
  return Math.sqrt(Math.max(variance(values, providedMean), 0));
}

function normaliseSamples(inputs: SignalSampleInput[]): PreparedSample[] {
  if (!inputs.length) return [];

  let inferredMs = 0;
  let lastMs = 0;
  let initialised = false;

  return inputs
    .map((sample, index) => {
      const numericValue =
        typeof sample.signal === "string" ? Number(sample.signal) : sample.signal;
      if (!Number.isFinite(numericValue)) {
        return null;
      }

      let ms: number | null = null;
      if (sample.timestampMs != null) {
        ms = Number(sample.timestampMs);
      } else if (sample.timestamp != null) {
        try {
          ms = toMilliseconds(sample.timestamp);
        } catch {
          ms = null;
        }
      }

      if (!initialised) {
        if (ms == null) {
          ms = inferredMs;
        }
        inferredMs = ms;
        lastMs = ms;
        initialised = true;
      } else if (ms == null) {
        inferredMs += MILLIS_PER_SECOND;
        ms = inferredMs;
      } else {
        if (ms <= lastMs) {
          ms = lastMs + MILLIS_PER_SECOND;
        }
        inferredMs = ms;
        lastMs = ms;
      }

      return {
        index,
        ms,
        iso: new Date(ms).toISOString(),
        signal: numericValue,
        absSignal: Math.abs(numericValue),
      } as PreparedSample;
    })
    .filter((sample): sample is PreparedSample => Boolean(sample))
    .sort((a, b) => a.ms - b.ms);
}

function classifyEnergyLevel(
  localAvg: number,
  globalAvg: number,
  globalStd: number
): { level: EnergyLevel; peak: boolean } {
  if (!Number.isFinite(localAvg)) {
    return { level: "low", peak: false };
  }

  if (globalStd < 1e-6) {
    if (localAvg > globalAvg * 1.05) return { level: "high", peak: false };
    if (localAvg < globalAvg * 0.95) return { level: "low", peak: false };
    return { level: "medium", peak: false };
  }

  const halfStd = 0.5 * globalStd;
  const peakThreshold = globalAvg + globalStd;
  const highThreshold = globalAvg + halfStd;
  const lowThreshold = globalAvg - halfStd;

  if (localAvg < lowThreshold) return { level: "low", peak: false };
  if (localAvg > peakThreshold) return { level: "high", peak: true };
  if (localAvg > highThreshold) return { level: "high", peak: false };
  return { level: "medium", peak: false };
}

function classifyVolatility(normalizedVariance: number): VolatilityLevel {
  if (normalizedVariance < 0.3) return "stable";
  if (normalizedVariance < 0.7) return "fluctuating";
  return "spiking";
}

function combinedLabel(energy: EnergyLevel, volatility: VolatilityLevel): string {
  const cap = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);
  return `${cap(energy)}–${cap(volatility)}`;
}

function mapToAudio(energy: EnergyLevel, volatility: VolatilityLevel, peak: boolean): AudioParams {
  const energyLayers: Record<EnergyLevel, { layers: number; brightness: AudioParams["brightness"] }> = {
    low: { layers: 1, brightness: "dark" },
    medium: { layers: 2, brightness: "balanced" },
    high: { layers: 3, brightness: "bright" },
  };

  const base = energyLayers[energy];
  const layers = peak ? base.layers + 1 : base.layers;

  const volatilityMap: Record<VolatilityLevel, { modulationDepth: number; desc: string; glitch: number }> = {
    stable: { modulationDepth: 0.2, desc: "keep modulation minimal and gentle", glitch: 0 },
    fluctuating: { modulationDepth: 0.45, desc: "apply moderate modulation to show motion", glitch: 0.2 },
    spiking: { modulationDepth: 0.65, desc: "add controlled modulation or light glitch accents", glitch: 0.35 },
  };

  const vol = volatilityMap[volatility];

  return {
    layers,
    brightness: base.brightness,
    modulationDepth: clamp01(vol.modulationDepth + (peak ? 0.1 : 0)),
    modulationDescription: peak
      ? `${vol.desc}; highlight peaks with a subtle ramp`
      : vol.desc,
    glitchAmount: clamp01(vol.glitch + (peak ? 0.15 : 0)),
  };
}

export function classifyDirection(diff: number, guard: number): { id: DirectionKey; label: string } {
  const limit = guard <= 0 ? 0.05 : Math.max(guard * 0.15, 0.05);
  if (diff > limit) return { id: "rising", label: "rising" };
  if (diff < -limit) return { id: "fading", label: "fading" };
  return { id: "steady", label: "steady" };
}

export function classifySignalWindows(
  inputSamples: SignalSampleInput[],
  options: ClassificationOptions = {}
): SignalWindowsAnalysis {
  const samples = normaliseSamples(inputSamples);
  if (!samples.length) {
    const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
    const hopMs = options.hopMs ?? DEFAULT_HOP_MS;
    return {
      windowMs,
      hopMs,
      globalStats: { count: 0, average: 0, stdDev: 0 },
      windows: [],
    };
  }

  const minSamples = options.minimumSamplesPerWindow ?? DEFAULT_MIN_SAMPLES;

  const absValues = samples.map((sample) => sample.absSignal);
  const globalAvg = mean(absValues);
  const globalStd = stdDev(absValues, globalAvg);
  const varianceDenominator = globalStd > 1e-6 ? globalStd * globalStd : 1;

  const startMs = samples[0].ms;
  const endMs = samples[samples.length - 1].ms;
  const rawDuration = Math.max(endMs - startMs, 0);
  const totalDuration = Math.max(rawDuration, MIN_WINDOW_MS);

  let desiredWindows = options.desiredWindows;
  if (!desiredWindows || desiredWindows <= 0) {
    const durationHours = totalDuration / 3_600_000;
    if (durationHours >= 72) desiredWindows = 12;
    else if (durationHours >= 36) desiredWindows = 10;
    else if (durationHours >= 18) desiredWindows = 8;
    else if (durationHours >= 8) desiredWindows = 6;
    else if (durationHours >= 4) desiredWindows = 4;
    else desiredWindows = 3;
  }
  desiredWindows = Math.min(
    MAX_WINDOWS_DEFAULT,
    Math.max(MIN_WINDOWS_DEFAULT, Math.round(desiredWindows))
  );

  const defaultWindowMs = Math.max(
    MIN_WINDOW_MS,
    Math.ceil(totalDuration / desiredWindows)
  );
  const windowMs = options.windowMs ?? defaultWindowMs;
  const hopMs = options.hopMs ?? windowMs;

  const windows: ClassifiedWindow[] = [];

  for (let windowStart = startMs; windowStart <= endMs; windowStart += hopMs) {
    const windowEnd = windowStart + windowMs;
    const windowSamples = samples.filter(
      (sample) => sample.ms >= windowStart && sample.ms < windowEnd
    );

    if (windowSamples.length < minSamples) {
      continue;
    }

    const windowAbs = windowSamples.map((sample) => sample.absSignal);
    const localAvg = mean(windowAbs);
    const localVariance = variance(windowAbs);
    const normalizedVariance = clamp01(localVariance / varianceDenominator);

    const { level: energyLevel, peak } = classifyEnergyLevel(
      localAvg,
      globalAvg,
      globalStd
    );
    const volatility = classifyVolatility(normalizedVariance);

    windows.push({
      index: windows.length,
      startMs: windowStart,
      endMs: windowEnd,
      startISO: new Date(windowStart).toISOString(),
      endISO: new Date(windowEnd).toISOString(),
      sampleCount: windowSamples.length,
      localAvg,
      localVariance,
      normalizedVariance,
      energyLevel,
      volatility,
      combinedLabel: combinedLabel(energyLevel, volatility),
      peak,
      audio: mapToAudio(energyLevel, volatility, peak),
    });
  }

  return {
    windowMs,
    hopMs,
    globalStats: {
      count: samples.length,
      average: globalAvg,
      stdDev: globalStd,
    },
    windows,
  };
}

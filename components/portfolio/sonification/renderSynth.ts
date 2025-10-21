'use client';

export type SynthSamplePoint = {
  timestampMs: number;
  signal: number;
};

type RenderOptions = {
  durationSec?: number;
  stepIntervalSec?: number;
};

type SynthEvent = {
  time: number;
  frequency: number;
  velocity: number;
  duration: number;
};

const MIN_FREQ = 110; // A2 suggested 
const MAX_FREQ = 880; // A5

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function buildSynthEvents(
  samples: SynthSamplePoint[],
  durationSec: number,
  stepIntervalSec: number,
): SynthEvent[] {
  if (!samples.length) return [];

  const values = samples.map((sample) => sample.signal);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1e-6);

  const steps = Math.max(1, Math.floor(durationSec / stepIntervalSec));
  const indexStep = (samples.length - 1) / Math.max(steps - 1, 1);

  const events: SynthEvent[] = [];
  let prevAverage = samples[0]?.signal ?? 0;

  for (let i = 0; i < steps; i += 1) {
    const windowStart = clamp(Math.floor(i * indexStep), 0, samples.length - 1);
    const windowEnd =
      i === steps - 1
        ? samples.length - 1
        : clamp(Math.floor((i + 1) * indexStep), windowStart, samples.length - 1);

    let sum = 0;
    let count = 0;
    for (let index = windowStart; index <= windowEnd; index += 1) {
      sum += samples[index].signal;
      count += 1;
    }

    const average = count > 0 ? sum / count : samples[windowStart].signal;
    const delta = average - prevAverage;

    const norm = clamp((average - min) / range, 0, 1);
    const velocityNorm = clamp(Math.abs(delta) / (range || 1), 0, 1);

    const frequency = MIN_FREQ + norm * (MAX_FREQ - MIN_FREQ);
    const velocity = clamp(0.35 + velocityNorm * 0.45, 0.2, 0.95);
    const duration = clamp(0.2 + norm * 0.4, 0.18, stepIntervalSec * 0.95);

    events.push({
      time: clamp(i * stepIntervalSec, 0, durationSec),
      frequency,
      velocity,
      duration,
    });

    prevAverage = average;
  }

  return events;
}

let lameModulePromise: Promise<any> | null = null;

async function loadLame() {
  if (!lameModulePromise) {
    lameModulePromise = import("lamejs");
  }
  return lameModulePromise;
}

async function audioBufferToMp3(buffer: AudioBuffer): Promise<Uint8Array> {
  const { Mp3Encoder } = await loadLame();
  if (!Mp3Encoder) {
    throw new Error("lamejs Mp3Encoder is unavailable");
  }

  const channelCount = Math.max(1, Math.min(buffer.numberOfChannels, 2));
  const sampleRate = buffer.sampleRate;
  const frameSize = 1152;

  const channelData: Float32Array[] = Array.from(
    { length: channelCount },
    (_, idx) => buffer.getChannelData(idx),
  );

  const samplesPerChannel = channelData[0]?.length ?? 0;
  if (!samplesPerChannel) {
    return new Uint8Array();
  }

  const encoder = new Mp3Encoder(channelCount, sampleRate, 192);
  const chunks: Uint8Array[] = [];

  const floatToInt16 = (value: number) => {
    const clamped = Math.max(-1, Math.min(1, value));
    return clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  };

  for (let position = 0; position < samplesPerChannel; position += frameSize) {
    const blockLength = Math.min(frameSize, samplesPerChannel - position);
    const frames = channelData.map((data) => {
      const block = new Int16Array(blockLength);
      for (let i = 0; i < blockLength; i += 1) {
        block[i] = floatToInt16(data[position + i] ?? 0);
      }
      return block;
    });

    const encoded =
      channelCount === 1
        ? encoder.encodeBuffer(frames[0])
        : encoder.encodeBuffer(frames[0], frames[1]);

    if (encoded.length) {
      chunks.push(new Uint8Array(encoded));
    }
  }

  const flushed = encoder.flush();
  if (flushed.length) {
    chunks.push(new Uint8Array(flushed));
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

export async function renderSynthMp3(
  samples: SynthSamplePoint[],
  options: RenderOptions = {},
): Promise<File> {
  if (!samples.length) {
    throw new Error("No samples available for synth rendering.");
  }

  const durationSec = clamp(options.durationSec ?? 120, 30, 240);
  const stepIntervalSec = clamp(options.stepIntervalSec ?? 0.5, 0.2, 2);

  const tone = await import("tone");
  const { Offline, PolySynth, Synth, Gain } = tone;

  const events = buildSynthEvents(samples, durationSec, stepIntervalSec);
  if (!events.length) {
    throw new Error("Failed to derive synth events from samples.");
  }

  type ToneBuffer = {
    toArray(): Float32Array[];
    sampleRate: number;
    numberOfChannels: number;
  };

  const releaseTail = 4;
  const toneBuffer = await Offline(
    async () => {
      const synth = new PolySynth(Synth, {
        oscillator: { type: "triangle8" },
        envelope: {
          attack: 0.03,
          decay: 0.2,
          sustain: 0.25,
          release: 1.2,
        },
      });
      synth.maxPolyphony = 6;

      const gain = new Gain(0.8).toDestination();
      synth.connect(gain);

      events.forEach((event) => {
        synth.triggerAttackRelease(
          event.frequency,
          event.duration,
          event.time,
          clamp(event.velocity, 0.1, 1),
        );
      });
    },
    durationSec + releaseTail,
  );

  const toAudioBuffer = (source: AudioBuffer | ToneBuffer): AudioBuffer => {
    if (source instanceof AudioBuffer) return source;
    const channels = source.toArray();
    const length = channels[0]?.length ?? 0;
    const buffer = new AudioBuffer({
      length,
      numberOfChannels: Math.max(channels.length, 1),
      sampleRate: source.sampleRate ?? 44100,
    });
    channels.forEach((data, index) => {
      const source =
        data instanceof Float32Array
          ? data
          : Float32Array.from(data as Iterable<number>);
      const channelArray = new Float32Array(source.length);
      channelArray.set(source);
      buffer.copyToChannel(channelArray, index);
    });
    return buffer;
  };

  const audioBuffer = toAudioBuffer(toneBuffer as ToneBuffer);
  const mp3Data = await audioBufferToMp3(audioBuffer);
  const mp3Bytes = new Uint8Array(mp3Data.length);
  mp3Bytes.set(mp3Data);
  const file = new File([mp3Bytes.buffer], "mushroom-synth.mp3", {
    type: "audio/mpeg",
    lastModified: Date.now(),
  });
  return file;
}

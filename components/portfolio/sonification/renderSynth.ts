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

const MIN_FREQ = 110; // A2
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

  for (let i = 0; i < steps; i += 1) {
    const sourceIndex = Math.floor(i * indexStep);
    const sample = samples[clamp(sourceIndex, 0, samples.length - 1)];
    const prevSample =
      samples[clamp(sourceIndex - 1, 0, samples.length - 1)] ?? sample;
    const delta = sample.signal - prevSample.signal;

    const norm = clamp((sample.signal - min) / range, 0, 1);
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
  }

  return events;
}

async function audioBufferToMp3(buffer: AudioBuffer): Promise<Uint8Array> {
  const lamejs = await import("lamejs");
  const Mp3Encoder = lamejs.Mp3Encoder;

  const channelCount = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;

  const channelData = Array.from({ length: channelCount }, (_, channel) =>
    buffer.getChannelData(channel),
  );

  const samplesPerChannel = channelData[0]?.length ?? 0;
  if (!samplesPerChannel) return new Uint8Array();

  const encoder = new Mp3Encoder(channelCount > 1 ? 2 : 1, sampleRate, 192);
  const blockSize = 1152;
  const chunks: Uint8Array[] = [];

  let position = 0;
  while (position < samplesPerChannel) {
    const chunkLength = Math.min(blockSize, samplesPerChannel - position);
    const buffers: Int16Array[] = [];

    for (let channel = 0; channel < (channelCount > 1 ? 2 : 1); channel += 1) {
      const source =
        channelData[channel] ?? channelData[0] ?? new Float32Array(chunkLength);
      const slice = source.subarray(position, position + chunkLength);
      const int16 = new Int16Array(slice.length);

      for (let i = 0; i < slice.length; i += 1) {
        const sample = clamp(slice[i], -1, 1);
        int16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      }
      buffers.push(int16);
    }

    const mp3buf =
      buffers.length === 2
        ? encoder.encodeBuffer(buffers[0], buffers[1])
        : encoder.encodeBuffer(buffers[0]);

    if (mp3buf.length) {
      chunks.push(new Uint8Array(mp3buf));
    }

    position += chunkLength;
  }

  const flush = encoder.flush();
  if (flush.length) {
    chunks.push(new Uint8Array(flush));
  }

  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
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

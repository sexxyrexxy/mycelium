// components/portfolio/sonification/sonify.ts

import type {
  ClassifiedWindow,
  SignalWindowsAnalysis,
} from "@/lib/signalClassification";

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

function fallbackRequest(): SunoRequest {
  return {
    prompt:
      "Begin balanced and medium-energy, rise briefly to bright high-energy tones, then fade through controlled glitches into a dark, calm ending. Keep transitions seamless and cohesive.",
    customMode: true,
    instrumental: true,
    model: "V3_5",
    style: "Orchestra",
    title: "Mycelium Echoes",
    styleWeight: 1,
    weirdnessConstraint: 0.05,
    negativeTags: "percussion, drums, kicks, clap,vocals",
  };
}

function describeWindow(window: ClassifiedWindow): string {
  const index = window.index + 1;
  const layers =
    window.audio.layers === 1
      ? "1 soft layer"
      : `${window.audio.layers} evolving layers`;
  const brightness =
    window.audio.brightness === "dark"
      ? "dark tone"
      : window.audio.brightness === "balanced"
        ? "balanced tone"
        : "brighter tone";
  const peakSuffix = window.peak ? " Peak energy: add gentle shimmer, not loudness." : "";
  const modulation = window.audio.modulationDescription.replace(/\.$/, "");
  const glitch = window.audio.glitchAmount <= 0.05
    ? "almost no glitch accents"
    : window.audio.glitchAmount <= 0.25
      ? "light glitch accents"
      : "controlled glitch accents";

  return (
    `Window ${index} (${window.combinedLabel}): ${layers} with a ${brightness}. ` +
    `${modulation}. Use ${glitch}.` +
    peakSuffix
  );
}

export function mapSignalToSuno(analysis: SignalWindowsAnalysis | null): SunoRequest {
  if (!analysis || !analysis.windows.length) {
    return fallbackRequest();
  }

  const { windows, globalStats } = analysis;

  const maxLayers = Math.max(...windows.map((w) => w.audio.layers));
  const maxModDepth = Math.max(...windows.map((w) => w.audio.modulationDepth));
  const hasPeak = windows.some((w) => w.peak);

  const summary =
    `Global baseline average ${globalStats.average.toFixed(3)} mV, standard deviation ${globalStats.stdDev.toFixed(3)} mV. ` +
    `Use up to ${maxLayers} layered synth voices with evolving textures. ` +
    `Keep modulation depth under ${Math.round(maxModDepth * 100)}% and avoid percussion entirely. ` +
    `${hasPeak ? "When peak windows appear, signal them with extra shimmer or subtle harmonic lift instead of volume spikes. " : ""}` +
    `Transitions must remain smooth—no abrupt cuts or chaotic jumps.`;

  const windowNarrative = windows.map(describeWindow).join(" ");

  const finalWindow = windows.at(-1);
  const finalNote = finalWindow
    ? `Final window (${windows.length}) settles into ${finalWindow.combinedLabel}; let the piece conclude with ${finalWindow.audio.layers === 1 ? "one gentle layer" : `${finalWindow.audio.layers} restrained layers`} and keep modulation ${finalWindow.audio.modulationDescription.toLowerCase()}.`
    : "";

  // const prompt =
  //   `Compose a minimal, percussion-free sci-fi ambient piece close to two minutes long. ` +
  //   `${summary} ${windowNarrative} ${finalNote} ` +
  //   `No drums, kicks, claps, or harsh noise. Maintain a cohesive flow throughout.`;

//   const prompt = `2-minute instrumental Mushroom Status Report. No vocals or percussion. Tempo follows energy: low = 60 BPM, medium = 75 BPM, high = 95 BPM.
// Begin medium-stable with 2 calm synth layers. Build to high-stable—3 bright evolving synths, faster tempo but minimal modulation (<65%). Shift to medium-spiking, same tempo with brief controlled glitch accents. Conclude in low-stable—1 soft layer, slow tempo, long reverb fade. Keep transitions seamless; flow must evolve naturally without sections or breaks. Sci-fi ambient tone, smooth and cohesive throughout.`
const prompt = `2-minute orchestral instrumental Mushroom Status Report. No vocals or percussion. Tempo follows energy: low = 60 BPM, medium = 75 BPM, high = 95 BPM. Start medium-stable with soft strings and woodwinds. Gradually build to high-stable where trumpets enter—bright, strong, and clear to show peak energy. Shift into medium-spiking with controlled brass swells and brief woodwind flutters. Conclude low-stable with only strings and gentle horns fading slowly, no trumpet. Keep all transitions seamless; energy is expressed only by trumpet loudness and orchestral brightness. Maintain a smooth, cinematic sci-fi atmosphere—strict 2-minute continuous evolution, no breaks or sections.`
  console.log(prompt)
  return {
    customMode: true,
    instrumental: true,
    model: "V5",
    style: "Synthwave cyberpunk",
    title: "Ghost Fungi Transmission",
    styleWeight: 1,
    weirdnessConstraint: 0.05,
    negativeTags: "percussion, drums,kicks, clap, harsh noise",
    prompt,
  };
}

"use client";

import { useEffect, useState } from "react";
import MushroomLifeCycle, {
  type MushroomStage,
} from "@/components/portfolio/MushroomLifeCycle";

type DefaultMushroomAnimationProps = {
  size?: number;
  stage?: MushroomStage;
  pulseSpeedMs?: number;
};

export default function DefaultMushroomAnimation({
  size = 240,
  stage = "SPROUT",
  pulseSpeedMs = 2400,
}: DefaultMushroomAnimationProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const loop = (now: number) => {
      const elapsed = now - start;
      const phase = (elapsed % pulseSpeedMs) / pulseSpeedMs;
      const eased = 0.5 - 0.5 * Math.cos(phase * Math.PI * 2);
      setProgress(eased);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [pulseSpeedMs]);

  return <MushroomLifeCycle size={size} stage={stage} progress={progress} />;
}

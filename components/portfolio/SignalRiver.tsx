
"use client";

import { useEffect, useRef } from "react";
import type { SignalDatum } from "@/hooks/useMushroomSignals";

const MAX_PARTICLES = 900;
const SPAWN_INTERVAL_MS = 60;
const SPEED = 120;
const FADE_SPEED = 0.35;
const COLOR_SCALE = [
  { threshold: 0, color: [0, 255, 214] },
  { threshold: 0.5, color: [111, 201, 255] },
  { threshold: 1, color: [186, 164, 255] },
];

const TAU = Math.PI * 2;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const pickColor = (norm: number) => {
  const clamped = Math.max(0, Math.min(norm, 1));
  const nextIndex = COLOR_SCALE.findIndex((stop) => stop.threshold >= clamped);
  if (nextIndex <= 0) return COLOR_SCALE[0].color;
  const prev = COLOR_SCALE[nextIndex - 1];
  const next = COLOR_SCALE[nextIndex];
  const span = next.threshold - prev.threshold || 1;
  const localT = (clamped - prev.threshold) / span;
  return [
    Math.round(lerp(prev.color[0], next.color[0], localT)),
    Math.round(lerp(prev.color[1], next.color[1], localT)),
    Math.round(lerp(prev.color[2], next.color[2], localT)),
  ] as const;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  life: number;
  intensity: number;
  color: [number, number, number];
};

type SignalRiverProps = {
  data: SignalDatum[];
  width?: number;
  height?: number;
  replayToken?: number;
  onSample?: (sample: SignalDatum | null) => void;
};

export function SignalRiver({
  data,
  width = 960,
  height = 360,
  replayToken = 0,
  onSample,
}: SignalRiverProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const lastSpawnRef = useRef(0);
  const indexRef = useRef(0);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    particlesRef.current = [];
    indexRef.current = 0;
    lastSpawnRef.current = performance.now();

    if (!data.length) {
      ctx.fillStyle = "#030712";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      onSample?.(null);
      return;
    }

    let running = true;
    let lastTime = performance.now();

    const signals = data.map((d) => d.signal);
    const min = Math.min(...signals);
    const max = Math.max(...signals);
    const range = max - min || 1;

    const spawn = (now: number) => {
      if (!data.length) return;
      if (now - lastSpawnRef.current < SPAWN_INTERVAL_MS) return;
      lastSpawnRef.current = now;

      if (indexRef.current >= data.length) {
        running = false;
        onSample?.(null);
        return;
      }

      const sample = data[indexRef.current];
      indexRef.current += 1;
      const norm = (sample.signal - min) / range;

      onSample?.(sample);

      particlesRef.current.push({
        x: 0,
        y: height - norm * height,
        vx: SPEED,
        life: 1,
        intensity: norm,
        color: pickColor(norm),
      });

      if (particlesRef.current.length > MAX_PARTICLES) {
        particlesRef.current.splice(0, particlesRef.current.length - MAX_PARTICLES);
      }
    };

    const step = (now: number) => {
      if (!running) return;
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      spawn(now);

      ctx.fillStyle = "rgba(4, 10, 24, 0.6)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * delta;
        p.life = Math.max(0, p.life - FADE_SPEED * delta);
        if (p.life <= 0 || p.x > canvas.width) {
          particles.splice(i, 1);
          continue;
        }

        const glow = 8 + p.intensity * 18;
        const alpha = Math.max(p.life, 0) * 0.95;
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glow);
        gradient.addColorStop(0, `rgba(${p.color[0]}, ${p.color[1]}, ${p.color[2]}, ${alpha})`);
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.fillStyle = gradient;
        ctx.fillRect(p.x - glow, p.y - glow, glow * 2, glow * 2);

        ctx.fillStyle = `rgba(${p.color[0]}, ${p.color[1]}, ${p.color[2]}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.6 + p.intensity * 2.4, 0, TAU, true);
        ctx.fill();
      }

      animationRef.current = requestAnimationFrame(step);
    };

    animationRef.current = requestAnimationFrame(step);

    return () => {
      running = false;
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [data, height, width, replayToken, onSample]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="h-[360px] w-full rounded-3xl border border-emerald-500/20 bg-[#030712]"
    />
  );
}

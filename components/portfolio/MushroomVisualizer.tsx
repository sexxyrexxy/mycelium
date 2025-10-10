"use client";

import { useEffect, useRef } from "react";
import type { SignalDatum } from "@/hooks/useMushroomSignals";

type Dot = { x: number; y: number; radius: number };

type Mushroom = {
  x: number;
  baseY: number;
  height: number;
  targetHeight: number;
  growthSpeed: number;
  capColor: string;
  stemColor: string;
  dots: Dot[];
};

type Props = { data: SignalDatum[]; replayToken?: number };

export function MushroomVisualizer({ data, replayToken = 0 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mushroomsRef = useRef<Mushroom[]>([]);
  const animRef = useRef<number>();
  const timeRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const initMushrooms = () => {
      const width = canvas.width;
      const height = canvas.height;
      const numMushrooms = 5;
      const gap = width / (numMushrooms + 1);

      mushroomsRef.current = Array.from({ length: numMushrooms }, (_, i) => {
        const dots: Dot[] = Array.from(
          { length: Math.floor(Math.random() * 4 + 2) },
          () => ({
            x: (Math.random() - 0.5) * 20,
            y: (Math.random() - 0.5) * 10,
            radius: Math.random() * 1.2 + 0.5,
          })
        );

        return {
          x: gap * (i + 1),
          baseY: height - 5,
          height: 0,
          targetHeight: 20 + Math.random() * 20,
          growthSpeed: 0.02 + Math.random() * 0.02,
          capColor: "rgb(200,30,30)",
          stemColor: "rgb(139,69,19)",
          dots,
        };
      });
    };

    initMushrooms();

    const animate = () => {
      timeRef.current += 0.02;
      const width = canvas.width;
      const height = canvas.height;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);

      mushroomsRef.current.forEach((m) => {
        // Grow and shrink smoothly
        m.height =
          m.height + Math.sin(timeRef.current * 2) * m.growthSpeed * 20;
        if (m.height < 5) m.height = 5;
        if (m.height > m.targetHeight) m.height = m.targetHeight;

        const capY = m.baseY - m.height;

        // Draw stem (slightly curved)
        ctx.beginPath();
        ctx.strokeStyle = m.stemColor;
        ctx.lineWidth = 4;
        ctx.moveTo(m.x - 1, m.baseY);
        ctx.lineTo(m.x, capY);
        ctx.lineTo(m.x + 1, m.baseY);
        ctx.stroke();

        // Draw dome-shaped cap
        const capRadius = 15 + m.height * 0.2;
        ctx.beginPath();
        ctx.fillStyle = m.capColor;
        ctx.arc(m.x, capY, capRadius, Math.PI, 0, false); // top half circle
        ctx.fill();

        // Draw white dots (fixed)
        ctx.fillStyle = "white";
        m.dots.forEach((dot) => {
          ctx.beginPath();
          ctx.arc(m.x + dot.x, capY + dot.y, dot.radius, 0, Math.PI * 2);
          ctx.fill();
        });
      });

      animRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [replayToken]);

  return (
    <div
      ref={containerRef}
      className="w-full h-32 rounded-2xl border overflow-hidden"
    >
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}

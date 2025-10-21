"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { drawBioluminescentMushrooms } from "@/components/portfolio/visualisation/Cave";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Signal = {
  timestamp: string;
  signal: number | null;
};

// Helper: convert rgb string (e.g. "rgb(49, 133, 147)") to hex "#31" + ...
const rgbStringToHex = (rgb: string) => {
  const result = rgb.match(/\d+/g);
  if (!result || result.length < 3) return "#000000";
  const [r, g, b] = result.map(Number);
  return (
    "#" +
    [r, g, b]
      .map((x) => {
        const hex = x.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
      })
      .join("")
  );
};

// Helper to map glowColor hex to closest description
const getDescriptionForColor = (hexColor: string) => {
  const colors = [
    { color: "#0a3d62", text: "Dark Blue — minimal drift, resting state." },
    { color: "#1b5f73", text: "Blue-Green — calm and balanced activity." },
    { color: "#4cb7b5", text: "Teal — adaptive baseline drift, responsive state." },
    { color: "#c4dce5", text: "Pale Teal — elevated baseline; high activity or mild stress." },
  ];

  function hexToRgb(hex: string) {
    const bigint = parseInt(hex.replace("#", ""), 16);
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
  }

  function colorDistance(c1: number[], c2: number[]) {
    return Math.sqrt(
      Math.pow(c1[0] - c2[0], 2) +
      Math.pow(c1[1] - c2[1], 2) +
      Math.pow(c1[2] - c2[2], 2)
    );
  }

  const currentRgb = hexToRgb(hexColor);
  let closest = colors[0];
  let minDist = colorDistance(currentRgb, hexToRgb(closest.color));

  for (const c of colors) {
    const dist = colorDistance(currentRgb, hexToRgb(c.color));
    if (dist < minDist) {
      minDist = dist;
      closest = c;
    }
  }

  return closest;
};

const MushroomCaveVisualization: React.FC = () => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const params = useParams();
  const mushId = params?.id as string;

  const [glowColor, setGlowColor] = useState<string>("rgb(10, 61, 98)"); // initial rgb matching #0a3d62
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!svgRef.current || !mushId) return;

    setLoading(true);
    setError(null);

    const ProcessDataWorker = new Worker("/Workers/ProcessData.js");
    let cleanup: (() => void) | null = null;

    fetch(`/api/mushroom/${mushId}?range=1d`)
      .then((res) => {
        if (!res.ok) throw new Error(`Unable to fetch mushroom signal data: API ${res.status}`);
        return res.json();
      })
      .then((json) => {
        const signals: Signal[] = json.signals;
        ProcessDataWorker.postMessage({ type: "data", data: signals });
      })
      .catch((err) => {
        console.error("Error fetching mushroom data:", err);
        setError(err.message);
        setLoading(false);
      });

    ProcessDataWorker.onmessage = (event) => {
      const { mappedSpeeds, normalizedBaseline, spikes, error } = event.data;

      if (error) {
        console.error("Worker error:", error);
        setError("Failed to process mushroom signal data.");
        setLoading(false);
        return;
      }

      cleanup = drawBioluminescentMushrooms(
        svgRef.current!,
        800,
        600,
        normalizedBaseline,
        mappedSpeeds,
        (currentColor) => {
          setGlowColor(currentColor);
        }
      );
      setLoading(false);
    };

    return () => {
      if (cleanup) cleanup();
      ProcessDataWorker.terminate();
    };
  }, [mushId]);

  // Convert the current rgb glowColor to hex to get description text
  const currentDesc = getDescriptionForColor(rgbStringToHex(glowColor));

  return (
    <div className="flex flex-col items-center justify-center bg-white px-4 py-10 sm:px-6">
      <h1 className="mb-1 text-center text-2xl font-bold md:text-3xl">Pulse Cavern</h1>
      <h5 className="mb-2 text-center text-gray-700 italic">
        Bioluminescent mapping of electrical signal intensity
      </h5>
      <p className="mb-6 max-w-3xl text-center text-gray-700">
        This visualization transforms raw electrical signals from mushrooms into a glowing subterranean landscape.
        Bioluminescent fungi pulse gently with rhythmic activity, while occasional spikes displayed as white mushroom glows — highlighting moments
        of intensity, reaction, or change.
      </p>
      <div className="mx-auto mb-6 h-px w-2/4 bg-[#564930]" />

      {/* Error message above container */}
      {error && (
        <div className="mb-4 text-red-600 font-semibold">{error}</div>
      )}

      {/* SVG container with relative positioning for overlays */}
      <div className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-gray-300/50 bg-[#0b0b0b] shadow-md">
        <div className="relative aspect-[4/3] w-full">
          {loading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/50">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-dashed" />
            </div>
          )}

          <svg
            ref={svgRef}
            viewBox="0 0 800 600"
            preserveAspectRatio="xMidYMid meet"
            className="absolute inset-0 h-full w-full"
          />
        </div>
      </div>

      <div className="mt-6 w-full max-w-[800px] grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Glow Hue = Baseline Activity</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-700 space-y-4 flex flex-col items-center">
            <div
              style={{
                backgroundColor: glowColor, // use exact rgb string here
                width: "80%",
                height: 24,
                borderRadius: 6,
                boxShadow: `0 0 10px ${glowColor}`, // exact rgb here too
                marginBottom: 12,
              }}
            />
            <p className="text-center">{currentDesc.text}</p>
            <p>
              The background shading reflects the mushroom’s average signal level. Darker blue tones mean calmer baseline activity, while lighter tones suggest heightened excitability.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MushroomCaveVisualization;

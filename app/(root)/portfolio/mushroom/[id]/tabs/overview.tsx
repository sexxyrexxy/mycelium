import { ChartLineInteractive } from "@/components/portfolio/summaryLineChart";
import { SonificationPanel } from "@/components/portfolio/SonificationPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  MushroomGarden,
  MushroomSprite,
} from "@/components/portfolio/PixelMushrooms";
import { useParams } from "next/navigation";
import React, { useMemo, useState, useRef, useEffect } from "react";

export default function Overview() {
  const { id } = useParams<{ id: string }>();

  // Understanding panel (accordion)
  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement | null>(null);

  // NEW: dynamic average (mV) for this mushroom
  const [avgMv, setAvgMv] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/mushroom/${id}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`API ${res.status}`);
        const payload = await res.json();
        const signals: Array<{ timestamp: string; signal: number | null }> =
          payload?.signals ?? [];

        const vals = signals
          .filter((s) => s && s.timestamp && s.signal != null)
          .map((s) => Number(s.signal))
          .filter((n) => Number.isFinite(n));

        if (!cancelled) {
          if (vals.length) {
            const sum = vals.reduce((a, b) => a + b, 0);
            setAvgMv(sum / vals.length);
          } else {
            setAvgMv(null);
          }
        }
      } catch {
        if (!cancelled) setAvgMv(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);


  // --- Small internal component for the 5-segment level bar ---
  function SegBar({ level, filledClass, label }: { level: number; filledClass: string; label: string }) {
    return (
      <div aria-label={`${label} level ${level} out of 5`} className="flex gap-1 mt-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            className={`h-2 w-8 rounded ${i < level ? filledClass : "bg-gray-200"}`}
          />
        ))}
      </div>
    );
  }

  // --- Helper for status chip styling by level ---
  function levelChip(level: number) {
    if (level >= 4) return { text: "High", cls: "bg-green-100 text-green-700" };
    if (level === 3) return { text: "Medium", cls: "bg-amber-100 text-amber-700" };
    return { text: "Low", cls: "bg-gray-100 text-gray-700" };
  }

  // Hardcoded demo levels
  const nutrientLevel = 4; // High
  const humidityLevel = 3; // Medium
  const lightLevel = 2;    // Low

  const nutrientChip = levelChip(nutrientLevel);
  const humidityChip = levelChip(humidityLevel);
  const lightChip = levelChip(lightLevel);

  return (
    <>
      {/* Friendly header intro */}
      <div className="flex flex-col items-center text-center mt-2 mb-6">
        <h1 className="text-3xl md:text-4xl font-extrabold">
          Mushroom Overview
        </h1>
        <h5 className="mt-1 text-gray-700 italic">
          Real-time signals and simple insights
        </h5>
        <p className="mt-3 text-gray-700 max-w-[800px]">
          See how your mushroom is doing right now. Watch the signal graph,
          listen to the activity, and get quick tips that explain what it all
          means.
        </p>
        <div className="mx-auto mt-4 h-px w-3/4 bg-gray-300" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[65%_35%] gap-6">
        {/* Left side (65%) */}
        <div>
          <ChartLineInteractive mushId={id} />

          {/* NEW: Care panel directly below the chart */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Your Mushroom's Needs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Nutrients */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-medium flex items-center gap-2">
                    🍄 Nutrients
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${nutrientChip.cls}`}>
                    {nutrientChip.text} • {nutrientLevel}/5
                  </span>
                </div>
                <SegBar level={nutrientLevel} filledClass="bg-emerald-500" label="Nutrients" />
                <p className="text-xs text-gray-600 mt-2">
                  Tip: Mix in fresh substrate or supplement with spent coffee grounds or bran for a gentle boost.
                </p>
              </div>

              {/* Humidity */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-medium flex items-center gap-2">
                    💧 Humidity
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${humidityChip.cls}`}>
                    {humidityChip.text} • {humidityLevel}/5
                  </span>
                </div>
                <SegBar level={humidityLevel} filledClass="bg-sky-500" label="Humidity" />
                <p className="text-xs text-gray-600 mt-2">
                  Tip: Aim for 85–92% RH. Lightly mist walls (not caps) and keep airflow gentle.
                </p>
              </div>

              {/* Light */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-medium flex items-center gap-2">
                    ☀️ Light
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${lightChip.cls}`}>
                    {lightChip.text} • {lightLevel}/5
                  </span>
                </div>
                <SegBar level={lightLevel} filledClass="bg-amber-400" label="Light" />
                <p className="text-xs text-gray-600 mt-2">
                  Tip: Bright, indirect light is perfect. Think “north-facing window” or diffused LED.
                </p>
              </div>

              {/* Tiny note that it's demo data */}
              <p className="text-[10px] text-gray-400 mt-3">
                Demo levels shown for design. Hook these to your readings later.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right side (35%) */}
        <div className="flex flex-col gap-1">
          <Card>
            <CardHeader>
              <CardTitle>Mushroom #{id} Details:</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p>
                  <span className="text-gray-500">Electrical Signals:</span>{" "}
                  <span className="text-xl font-bold"> 400 mv</span>{" "}
                  <span className="text-red-600">-102.52 (-6.83%)</span>
                </p>
                {/* interpretation (bold key idea) */}
                <p className="text-sm text-gray-600 mt-1">
                  A little quieter today. Your mushroom might be{" "}
                  <strong>resting</strong> 🌙
                </p>
              </div>

              <div>
                <p>
                  <span className="text-gray-500">Average signal:</span>{" "}
                  {avgMv != null ? <strong>{avgMv.toFixed(1)} mV</strong> : "—"}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  <strong>Steady average</strong>. Conditions look{" "}
                  <strong>balanced</strong> 👍
                </p>
              </div>

              <div>
                <p className="text-gray-500">Today change: +10</p>
                <p className="text-sm text-gray-600 mt-1">
                  <strong>Small boost</strong> ⚡ could be from{" "}
                  <strong>light</strong>, <strong>moisture</strong>, or a gentle{" "}
                  <strong>touch</strong>.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activity Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div className="text-center flex-1">
                  <p className="text-gray-400 text-sm">Activity Status</p>
                  <p className="text-green-500 font-bold text-lg">
                    High Activity 🌟
                  </p>
                </div>
                <div className="h-6 w-px bg-gray-300 mx-4"></div>
                <div className="text-center flex-1">
                  <p className="text-gray-400 text-sm">Activity Meaning</p>
                  <p className="text-gray-700 font-medium text-sm mt-1">
                    The mushroom is lively and likely in a{" "}
                    <strong>growth phase</strong> 🌱
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <main className="space-y-6">
            <SonificationPanel csvUrl="/GhostFungi.csv" />
          </main>
        </div>
      </div>

      {/* Understanding panel with sprites moved INSIDE the dropdown */}
      <div className="lg:col-span-2 w-full mt-6">
        <div
          onClick={() => setOpen(!open)}
          className="cursor-pointer bg-[#564930] text-white rounded-md p-3 flex items-center gap-3 max-w-[1000px] mx-auto"
        >
          <span className="text-lg font-semibold">
            🧠 Understanding Mushroom Signals
          </span>
          <span
            className={`transform transition-transform duration-300 ${
              open ? "rotate-90" : ""
            }`}
          >
            &#9654;
          </span>
        </div>

        <div
          ref={contentRef}
          style={{
            height: open ? `${contentRef.current?.scrollHeight}px` : "0px",
          }}
          className="overflow-hidden transition-all duration-500 ease-in-out mt-2 max-w-[1000px] mx-auto"
        >
          <ul className="bg-[#564930] rounded-md p-2 space-y-2">
            <li className="flex flex-col gap-1 p-2 rounded-md">
              <span className="text-lg text-white font-semibold">
                What are they? 🤔
              </span>
              <span className="text-base text-white">
                Mushrooms send tiny electrical pulses through their network,
                kind of like a heartbeat. Tracking these pulses shows when they
                are <strong>calm</strong>, <strong>active</strong>, or{" "}
                <strong>reacting</strong> to changes.
              </span>
            </li>
            <li className="flex flex-col gap-1 p-2 rounded-md">
              <span className="text-lg text-white font-semibold">
                Why it matters 🌍
              </span>
              <ul className="list-disc list-inside text-base text-white space-y-1">
                <li>
                  See when your mushroom is <strong>most active</strong>{" "}
                </li>
                <li>
                  Spot <strong>stress</strong> or unusual patterns{" "}
                </li>
                <li>
                  Learn how fungal networks{" "}
                  <strong>respond to the environment</strong>{" "}
                </li>
              </ul>
            </li>

            {/* Sprites moved inside the dropdown after all text */}
            <div className="flex gap-5 mt-2 justify-center">
              <MushroomSprite species="flyAgaric" size={160} duration={2.2} />
              <MushroomSprite species="shiitake" size={160} duration={2.2} />
              <MushroomSprite species="oyster" size={160} duration={2.2} />
            </div>
          </ul>
        </div>
      </div>
    </>
  );
}

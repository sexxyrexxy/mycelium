import { SonificationPanel } from "@/components/portfolio/SonificationPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MushroomSprite } from "@/components/portfolio/PixelMushrooms";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { RTLineChart } from "@/components/portfolio/RTLineChart";

export default function Overview() {
  const { id } = useParams<{ id: string }>();

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
  function SegBar({
    level,
    filledClass,
    label,
  }: {
    level: number;
    filledClass: string;
    label: string;
  }) {
    return (
      <div
        aria-label={`${label} level ${level} out of 5`}
        className="flex gap-1 mt-2"
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            className={`h-2 w-8 rounded ${
              i < level ? filledClass : "bg-gray-200"
            }`}
          />
        ))}
      </div>
    );
  }

  // --- Helper for status chip styling by level ---
  function levelChip(level: number) {
    if (level >= 4) return { text: "High", cls: "bg-green-100 text-green-700" };
    if (level === 3)
      return { text: "Medium", cls: "bg-amber-100 text-amber-700" };
    return { text: "Low", cls: "bg-gray-100 text-gray-700" };
  }

  // Hardcoded demo levels
  const nutrientLevel = 4; // High
  const humidityLevel = 3; // Medium
  const lightLevel = 2; // Low

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
          <RTLineChart mushId={id} />{" "}
          {/* displays HISTORICAL and REALTIME data - Kai */}
          {/* NEW: Care panel directly below the chart */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Your Mushrooms Needs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Nutrients */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-medium flex items-center gap-2">
                    🍃 Nutrients
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${nutrientChip.cls}`}
                  >
                    {nutrientChip.text} • {nutrientLevel}/5
                  </span>
                </div>
                <SegBar
                  level={nutrientLevel}
                  filledClass="bg-[#AAA432]"
                  label="Nutrients"
                />
                <p className="text-xs text-gray-600 mt-2">
                  Tip: Mix in fresh substrate or supplement with spent coffee
                  grounds or bran for a gentle boost.
                </p>
              </div>

              {/* Humidity */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-medium flex items-center gap-2">
                    💧 Humidity
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${humidityChip.cls}`}
                  >
                    {humidityChip.text} • {humidityLevel}/5
                  </span>
                </div>
                <SegBar
                  level={humidityLevel}
                  filledClass="bg-[#3274aa]"
                  label="Humidity"
                />
                <p className="text-xs text-gray-600 mt-2">
                  Tip: Aim for 85–92% RH. Lightly mist walls (not caps) and keep
                  airflow gentle.
                </p>
              </div>

              {/* Light */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-medium flex items-center gap-2">
                    ☀️ Light
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${lightChip.cls}`}
                  >
                    {lightChip.text} • {lightLevel}/5
                  </span>
                </div>
                <SegBar
                  level={lightLevel}
                  filledClass="bg-amber-400"
                  label="Light"
                />
                <p className="text-xs text-gray-600 mt-2">
                  Tip: Bright, indirect light is perfect. Think “north-facing
                  window” or diffused LED.
                </p>
              </div>

              {/* Tiny note that it's demo data */}
              <p className="text-[10px] text-gray-400 mt-3">
                Demo levels shown for design. Hook these to your readings later.
              </p>
            </CardContent>
          </Card>
          <Card className="mt-4 bg-[#766647] text-white shadow-lg">
            <CardHeader>
              <CardTitle className="text-white">
                Understanding Mushroom Signals
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-relaxed">
              <section className="space-y-2">
                <h3 className="text-lg font-semibold text-white">
                  What are they?
                </h3>
                <p>
                  Mushrooms send tiny electrical pulses through their network,
                  much like a heartbeat. Tracking these pulses reveals when they
                  are <strong>calm</strong>, <strong>active</strong>, or{" "}
                  <strong>reacting</strong> to changes around them.
                </p>
              </section>
              <section className="space-y-2">
                <h3 className="text-lg font-semibold text-white">
                  Why it matters
                </h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>Spot when your mushroom is at peak activity.</li>
                  <li>Catch early signs of stress or unusual patterns.</li>
                  <li>
                    Learn how fungal networks respond to their environment.
                  </li>
                </ul>
              </section>
              <div className="flex flex-wrap justify-center gap-6 pt-2">
                <MushroomSprite species="flyAgaric" size={140} duration={2} />
                <MushroomSprite species="shiitake" size={140} duration={2} />
                <MushroomSprite species="oyster" size={140} duration={2} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right side (35%) */}
        <div className="flex flex-col gap-4">
          <Card className="overflow-hidden border-none bg-gradient-to-br from-[#C89E4D]/30 via-white to-white shadow-lg">
            <CardHeader>
              <CardTitle>Pulse Snapshot</CardTitle>
              <p className="text-xs uppercase tracking-[0.2em] text-[#6a6720]/80">
                Colony #{id}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/70">
                    Average
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-[#6a6720]">
                    {avgMv != null ? `${avgMv.toFixed(1)} mV` : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Baseline energy across current samples.
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/70">
                    Mood
                  </p>
                  <p className="mt-1 text-lg font-semibold text-[#6a6720]">
                    Steady + balanced
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Signals hovering around a comfortable band.
                  </p>
                </div>
              </div>
              <div className="rounded-xl bg-white/80 px-4 py-3 text-sm leading-relaxed text-muted-foreground shadow-inner">
                When the average drifts upward, expect fresh growth or response
                to touch. A drop hints at rest—check humidity or light if it
                lingers.
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-none bg-gradient-to-br from-[#AAA432]/35 via-white to-white shadow-lg">
            <CardHeader>
              <CardTitle>Activity Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/70">
                    Status
                  </p>
                  <p className="mt-1 text-lg font-semibold text-[#6a6720]">
                    High Activity
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Frequent bursts across the latest window.
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/70">
                    Momentum
                  </p>
                  <p className="mt-1 text-lg font-semibold text-[#6a6720]">
                    +18%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Climbing faster than the previous slice.
                  </p>
                </div>
              </div>
              <div className="rounded-xl bg-white/80 px-4 py-3 text-sm leading-relaxed text-muted-foreground shadow-inner">
                If the next range stays bright, the mycelium is capitalising on
                fresh moisture or airflow. A fading momentum line suggests it is
                cooling off—perfect time for a light mist.
              </div>
            </CardContent>
          </Card>

          <main className="space-y-6">
            <SonificationPanel mushId={id} />
          </main>
        </div>
      </div>
    </>
  );
}

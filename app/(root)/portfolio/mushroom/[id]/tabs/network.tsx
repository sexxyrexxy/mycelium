"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { drawVoronoiChart } from "@/components/portfolio/visualisation/Network";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Signal = {
  timestamp: string;
  signal: number | null;
};

const MushroomNetwork: React.FC = () =>  {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const params = useParams();
  const mushId = params?.id as string;

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

      cleanup = drawVoronoiChart(
        svgRef.current!,
        800,
        600,
        mappedSpeeds,
        normalizedBaseline,
        spikes,
        false
      );
      setLoading(false);
    };

    return () => {
      if (cleanup) cleanup();
      ProcessDataWorker.terminate();
    };
  }, [mushId]);

  return (
    <div className="flex flex-col justify-center items-center min-h-[500px] bg-white px-4 md:px-0">
      <h1 className="mb-1 text-2xl font-bold">Mushroom Signal Network</h1>
      <h5 className="mb-2 text-gray-700 italic">
        Visualized using a Voronoi diagram
      </h5>
      <p className="mb-6 text-gray-700 text-center max-w-[700px]">
        This visualization maps the mushroom’s electrical activity into a
        network-like structure. Each region and ripple represents changes in
        signal strength, allowing you to spot steady growth, sudden spikes, and
        how the mycelium adapts to its environment over time.
      </p>
      <div className="mx-auto mb-6 h-px w-2/4 bg-[#564930]"></div>

      {/* Container div for SVG with relative positioning for overlay */}
      <div className="relative rounded-2xl overflow-hidden shadow-md border border-gray-300/50 w-full max-w-[800px]">
        {error && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-red-100 text-red-700 text-sm font-medium text-center px-4">
            {error}
          </div>
        )}

        {/* Loading spinner overlay */}
        {loading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white bg-opacity-50">
            <div className="w-12 h-12 border-4 border-blue-500 border-dashed rounded-full animate-spin"></div>
          </div>
        )}

        <svg
          ref={svgRef}
          viewBox="0 0 800 600"
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-auto"
        ></svg>
      </div>

      <div className="mt-6 w-full max-w-[800px] grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cards remain unchanged */}
        <Card>
          <CardHeader>
            <CardTitle>Background = Baseline Activity</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-700 space-y-2">
            <p>
              The background shading reflects the mushroom’s average signal
              level. <span className="italic">Cooler tones</span> mean calmer
              baseline activity, while <span className="italic">warmer tones</span> suggest heightened excitability — often linked to
              active growth or environmental response.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ripples = Signal Dynamics</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-700 space-y-2">
            <p>
              Moving ripples represent how quickly signals are changing.
              <span className="text-yellow-700 font-medium"> Fast ripples</span>{" "}
              highlight sudden bursts of activity (like reacting to touch, light,
              or moisture).{" "}
              <span className="text-teal-700 font-medium">Slow ripples</span>{" "}
              indicate steadier, stable conditions.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ripple Colors = Spike Detection</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-700 space-y-2">
            <div className="flex flex-col gap-2">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 bg-teal-400 rounded-full"></span>
                <span>Teal — normal fluctuations, everyday rhythm.</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 bg-yellow-400 rounded-full"></span>
                <span>
                  Gold — strong spike, unusual activity; may indicate stress or
                  stimulation.
                </span>
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Grower Tips</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-700 space-y-2">
            <ul className="list-disc list-inside space-y-1">
              <li>
                A network glowing warm with fast ripples = mushroom is highly
                active. Keep conditions stable to support growth.
              </li>
              <li>
                Mostly teal, slow ripples = a healthy, balanced state. This is
                ideal for steady development.
              </li>
              <li>
                Persistent gold flashes = check moisture, airflow, or light — the
                mushroom may be stressed or over-stimulated.
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MushroomNetwork;

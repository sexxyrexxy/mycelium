"use client";

import { drawVoronoiChart } from "@/components/portfolio/network/Network";
import React, { useEffect, useRef, useState } from "react";

const MushroomNetwork: React.FC = () => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [legendOpen, setLegendOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const ProcessDataWorker = new Worker("/Workers/ProcessData.js");
    let cleanup: (() => void) | null = null;

    fetch("/GhostFungi.csv")
      .then(res => res.text())
      .then(csvText => {
        ProcessDataWorker.postMessage({ type: "csv", data: csvText });
      });

    ProcessDataWorker.onmessage = event => {
      const { mappedSpeeds, normalizedBaseline, spikes, error } = event.data;

      if (error) {
        console.error(error);
        return;
      }

      cleanup = drawVoronoiChart(svgRef.current!, 800, 600, mappedSpeeds, normalizedBaseline, spikes, false);
    };

    return () => {
      ProcessDataWorker.terminate();
      if (cleanup) cleanup();
    };
  }, []);

  return (
    <div className="flex flex-col justify-center items-center min-h-[500px] bg-white px-4 md:px-0">
      <h1 className="mb-1 text-2xl font-bold">Mushroom Signal Network</h1>
      <h5 className="mb-2 text-gray-700 italic">Depicted using a Voronoi diagram</h5>
      <p className="mb-6 text-gray-700 text-center max-w-[700px]">
        A visual representation of the electrical activity patterns, highlighting fluctuations and network interactions. 
        Users may identify stable growth areas, detect unusual spikes, and understand how the network responds to different stimuli over time.
      </p>
      <div className="mx-auto mb-6 h-px w-2/4 bg-[#564930]"></div>
      <div className="rounded-2xl overflow-hidden shadow-md border border-gray-300/50 w-full max-w-[800px]">
        <svg
          ref={svgRef}
          viewBox="0 0 800 600"
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-auto"
        ></svg>
      </div>

      {/* Legend Accordion */}
      <div className="mt-4 w-full max-w-[800px]">
        <div
          onClick={() => setLegendOpen(!legendOpen)}
          className="cursor-pointer bg-[#564930] text-white rounded-md p-2 font-semibold flex justify-between items-center"
        >
          Legend
          <span
            className={`ml-2 inline-block transform transition-transform duration-300 ${
              legendOpen ? "rotate-90" : ""
            }`}
          >
            &#9654;
          </span>
        </div>

        <div
  ref={contentRef}
  className="overflow-hidden transition-all duration-500 ease-in-out mt-2"
  style={{ height: legendOpen ? `${contentRef.current?.scrollHeight}px` : "0px" }}
>
  <ul className="text-sm text-white bg-[#564930] rounded-md p-2">
    <li className="flex flex-col gap-1 p-2 rounded-md">
      <span className="font-semibold">Background = Baseline Drift</span>
      <span className="text-xs">
        The background color shows the mushroom’s baseline electrical signals, calculated as a moving average. 
        A cooler tone background indicates lower average activity, while warmer indicates higher average activity, 
        highlighting increased electrical activity and overall 'excitability' in the mushroom.
      </span>
    </li>
    <li className="flex flex-col gap-1 p-2 rounded-md">
      <span className="font-semibold">Ripples = Rate of Change</span>
      <span className="text-xs">
        Ripples along the network lines represent changes in the mushroom’s electrical signals over time. Faster-moving ripples indicate greater fluctuations in signal magnitude, 
        highlighting moments of heightened activity in the network, which can indicate potential responses to stimuli. Slow ripples depict small 
        differences in rate of change between consecutive dataset points, which may indicate the network is relatively stable.
      </span>
    </li>
    <li className="flex flex-col gap-1 p-2 rounded-md">
      <span className="font-semibold">Ripple Colors</span>
      <div className="flex gap-4 text-xs">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-teal-400 rounded-full"></span>
          Teal — normal fluctuations.
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-yellow-400 rounded-full"></span>
          Gold — strong spike, unusual activity.
        </span>
      </div>
    </li>
  </ul>
</div>
      </div>
    </div>
  );
};

export default MushroomNetwork;

"use client";

import { drawVoronoiChart } from "@/components/portfolio/network/Network";
import React, { useEffect, useRef } from "react";

const MushroomNetwork: React.FC = () => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    // Create Web Worker
    const ProcessDataWorker = new Worker("/Workers/ProcessData.js");
    let cleanup: (() => void) | null = null;

    // Fetch CSV and send to worker
    fetch("/GhostFungi.csv")
      .then((res) => res.text())
      .then((csvText) => {
        ProcessDataWorker.postMessage({ type: "csv", data: csvText });
      });

    // Listen for processed data from worker
    ProcessDataWorker.onmessage = (event) => {
      const { mappedSpeeds, normalizedBaseline, error } = event.data;

      if (error) {
        console.error(error);
        return;
      }

      console.log("First 5 mapped speeds:", mappedSpeeds.slice(0, 5));
      console.log("First 5 normalized baseline values:", normalizedBaseline.slice(0, 5));

      // Draw Voronoi chart once both arrays are ready
      cleanup = drawVoronoiChart(svgRef.current!, 800, 600, mappedSpeeds, normalizedBaseline);
    };

    // Cleanup on component unmount
    return () => {
      ProcessDataWorker.terminate();
      if (cleanup) cleanup();
    };
  }, []);

  return (
<div className="flex flex-col justify-center items-center min-h-[500px] bg-white">
  <h1 className="mb-4 text-xl font-bold">Voronoi Network</h1>
  <div className="rounded-2xl overflow-hidden border-3 border-black">
    <svg ref={svgRef} width={800} height={600}></svg>
  </div>
</div>
  );
};

export default MushroomNetwork;

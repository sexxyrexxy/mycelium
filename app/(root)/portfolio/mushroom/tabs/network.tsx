"use client";

import { drawVoronoiChart } from "@/components/portfolio/network/Network";
import React, { useEffect, useRef } from "react";

const MushroomNetwork: React.FC = () => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    const cleanup = drawVoronoiChart(svgRef.current, 800, 600);
    return cleanup;
  }, []);

  return (
    <div className="flex flex-col justify-center items-center min-h-[500px] bg-white">
      <h1 className="mb-4 text-xl font-bold">Voronoi Network</h1>
      <svg ref={svgRef} width={800} height={600}></svg>
    </div>
  );
};

export default MushroomNetwork;

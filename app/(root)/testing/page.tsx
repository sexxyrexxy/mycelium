// app/voronoi/page.tsx (if using App Router)
// OR pages/voronoi.tsx (if using Pages Router)

"use client"; // needed if you’re using App Router

import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

const Network: React.FC = () => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const width = 800;
    const height = 600;

    // Clear previous contents if re-mounted
    svg.selectAll("*").remove();

    const numSites = 100;
    const sites = Array.from({ length: numSites }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
    }));

    const voronoiDiagram = d3.Delaunay.from(
      sites,
      (d: { x: number }) => d.x,
      (d: { y: number }) => d.y
    ).voronoi([0, 0, width, height]);

    const edges: {
      start: [number, number];
      end: [number, number];
      lineElement?: d3.Selection<SVGLineElement, unknown, null, undefined>;
    }[] = [];

    for (const polygon of voronoiDiagram.cellPolygons()) {
      const vertices = Array.from(polygon);
      vertices.forEach((v, i) => {
        const start = v as [number, number];
        const end = vertices[(i + 1) % vertices.length] as [number, number];
        edges.push({ start, end });
      });
    }

    // Draw animated edges
    edges.forEach((e) => {
      e.lineElement = svg
        .append("line")
        .attr("x1", e.start[0])
        .attr("y1", e.start[1])
        .attr("x2", e.start[0])
        .attr("y2", e.start[1])
        .attr("stroke", "black")
        .transition()
        .duration(700)
        .attr("x2", e.end[0])
        .attr("y2", e.end[1])
        .ease(d3.easeLinear);
    });

    // Animate edge colors
    let t = 0;
    d3.timer(() => {
      t += 0.05;
      edges.forEach((e, i) => {
        if (!e.lineElement) return;
        const phase = i * 0.1;
        const intensity = (Math.sin(t + phase) + 1) / 1.5;
        const colorValue = Math.floor(255 * intensity);
        e.lineElement.attr(
          "stroke",
          `rgb(${colorValue},${colorValue},${colorValue})`
        );
      });
    });
  }, []);

  return (
    <div className="flex justify-center items-center min-h-screen bg-white">
      <h1>Hi</h1>
      <svg ref={svgRef} width={800} height={600}></svg>
    </div>
  );
};

export default Network;

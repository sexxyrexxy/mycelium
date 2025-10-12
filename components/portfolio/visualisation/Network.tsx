import * as d3 from "d3";

export function drawVoronoiChart(
  svgElement: SVGSVGElement,
  width = 800,
  height = 600,
  mappedSpeeds: number[] = [],
  normalizedBaseline: number[] = [],
  spikes: number[] = [],
  realTime: boolean = false
) {
  const svg = d3.select(svgElement);
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
    baseLine?: d3.Selection<SVGLineElement, unknown, null, undefined>;
    pulseLine?: d3.Selection<SVGLineElement, unknown, null, undefined>;
  }[] = [];

  for (const polygon of voronoiDiagram.cellPolygons()) {
    const vertices = Array.from(polygon);
    vertices.forEach((v, i) => {
      const start = v as [number, number];
      const end = vertices[(i + 1) % vertices.length] as [number, number];

      const baseLine = svg
        .append("line")
        .attr("x1", start[0])
        .attr("y1", start[1])
        .attr("x2", end[0])
        .attr("y2", end[1])
        .attr("stroke", "black")
        .attr("stroke-width", 1.5);

      const pulseLine = svg
        .append("line")
        .attr("x1", start[0])
        .attr("y1", start[1])
        .attr("x2", end[0])
        .attr("y2", end[1])
        .attr("stroke", "teal")
        .attr("stroke-width", 0)
        .attr("stroke-opacity", 0);

      edges.push({ start, end, baseLine, pulseLine });
    });
  }

  const spikeColor = d3.interpolateRgb("teal", "gold");

  let t = 0;
  let speedIndex = 0;
  let currentSpeed = 0.02;

  // --- Real-time speed updates once per second ---
  let speedTimer: NodeJS.Timeout | null = null;
  if (realTime) {
    speedTimer = setInterval(() => {
      if (mappedSpeeds.length > 0) {
        currentSpeed = mappedSpeeds[speedIndex % mappedSpeeds.length];
        speedIndex++;
      }
    }, 1000);
  }

  // --- Animation loop ---
  const timer = d3.timer(() => {
    if (mappedSpeeds.length === 0 || normalizedBaseline.length === 0) return;

    if (!realTime) {
      // default mode: update speed every tick
      currentSpeed = mappedSpeeds[speedIndex % mappedSpeeds.length];
      speedIndex++;
    }

    t += currentSpeed;

    // Background based on baseline
    const baselineVal = normalizedBaseline[speedIndex % normalizedBaseline.length];
    svg.style("background-color", d3.interpolateRdYlBu(1 - baselineVal));

    // Update edges
    edges.forEach((e, i) => {
      if (!e.pulseLine || e.pulseLine.empty()) return;

      const phase = i * 0.1;
      const pulse = (Math.sin(t + phase) + 1) / 2;
      const spikeVal = spikes[i % spikes.length] ?? 0;
      const color = spikeColor(spikeVal);

      e.pulseLine
        .attr("stroke", color)
        .attr("stroke-width", 1 + pulse * 3)
        .attr("stroke-opacity", pulse);
    });
  });

  return () => {
    timer.stop();
    if (speedTimer) clearInterval(speedTimer);
    svg.selectAll("*").remove();
  };
}

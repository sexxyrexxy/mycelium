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

  const tealColor = d3.color("teal")!;
  const goldColor = d3.color("gold")!;
  const spikeDuration = 2000; // milliseconds for web-wide spike flash
  let webSpikeActive = false;
  let spikeStartTime = 0;

  let t = 0;
  let speedIndex = 0;
  let currentSpeed = 0.02;

  let speedTimer: NodeJS.Timeout | null = null;
  if (realTime) {
    speedTimer = setInterval(() => {
      if (mappedSpeeds.length > 0) {
        currentSpeed = mappedSpeeds[speedIndex % mappedSpeeds.length];
        speedIndex++;
      }
    }, 1000);
  }

  const timer = d3.interval(() => {
    if (mappedSpeeds.length === 0 || normalizedBaseline.length === 0) return;

    if (!realTime) {
      currentSpeed = mappedSpeeds[speedIndex % mappedSpeeds.length];
      speedIndex++;
    }

    t += currentSpeed;

    const baselineVal = normalizedBaseline[speedIndex % normalizedBaseline.length];
    svg.style("background-color", d3.interpolateRdYlBu(1 - baselineVal));

    // --- Check if any spike is detected this tick ---
    const spikeDetected = spikes[speedIndex % spikes.length] === 1;
    if (spikeDetected && !webSpikeActive) {
      webSpikeActive = true;
      spikeStartTime = Date.now();
    }

    const elapsed = Date.now() - spikeStartTime;
    if (webSpikeActive && elapsed > spikeDuration) {
      webSpikeActive = false;
    }

    // --- Update edges ---
    edges.forEach((e, i) => {
      if (!e.pulseLine || e.pulseLine.empty()) return;

      const phase = i * 0.1;
      const pulse = (Math.sin(t + phase) + 1) / 2;

      // Base teal pulse
      tealColor.opacity = pulse;

      if (webSpikeActive) {
        // Overlay gold pulse during spike
        goldColor.opacity = pulse;
        e.pulseLine.attr("stroke", goldColor.toString());
      } else {
        e.pulseLine.attr("stroke", tealColor.toString());
      }

      e.pulseLine.attr("stroke-width", 1 + pulse * 3).attr("stroke-opacity", pulse);
    });
  }, 10);

  return () => {
    timer.stop();
    if (speedTimer) clearInterval(speedTimer);
    svg.selectAll("*").remove();
  };
}

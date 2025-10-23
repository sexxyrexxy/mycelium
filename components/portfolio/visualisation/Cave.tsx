import * as d3 from "d3";

export function drawBioluminescentMushrooms(
  svgElement: SVGSVGElement,
  width: number,
  height: number,
  baselineArray: number[] = [],
  rateOfChangeArray: number[] = [],
  spikesArray: number[] = [],
  onColorChange?: (color: string) => void
) {
  const svg = d3.select(svgElement);
  svg.selectAll("*").remove();

  // -- glow filter ---
  const defs = svg.append("defs");

  const filter = defs.append("filter")
    .attr("id", "base-glow")
    .attr("x", "-50%")
    .attr("y", "-50%")
    .attr("width", "200%")
    .attr("height", "200%");

    // Add Gaussian blur
  filter.append("feGaussianBlur")
    .attr("in", "SourceGraphic")
    .attr("stdDeviation", 8) 
    .attr("result", "coloredBlur");
    
    
  const feMerge = filter.append("feMerge");
  feMerge.append("feMergeNode").attr("in", "coloredBlur");
  feMerge.append("feMergeNode").attr("in", "coloredBlur");
  feMerge.append("feMergeNode").attr("in", "coloredBlur");
  feMerge.append("feMergeNode").attr("in", "SourceGraphic");

  const numMushrooms = 80;
  const sizeScale = d3.scaleLinear().domain([0, numMushrooms]).range([5, 15]);
  const yScale = d3.scaleLinear().domain([0, numMushrooms]).range([height * 0.1, height * 0.9]);
  const colorInterpolator = d3.interpolateRgb("#0a3d62", "#4cb7b5");

  const mushrooms: {
    cap: d3.Selection<SVGPathElement, unknown, null, undefined>;
    glow: d3.Selection<SVGPathElement, unknown, null, undefined>;
    phase: number;
    baseColor: string;
  }[] = [];

  for (let i = 0; i < numMushrooms; i++) {
    const size = sizeScale(i);
    const x = Math.random() * width;
    const y = yScale(i);

    const pathData = d3.path();
    pathData.moveTo(x - size, y);
    pathData.arc(x, y, size, Math.PI, 0, false);

    const glowPath = svg.append("path")
      .attr("d", pathData.toString())
      .attr("fill", "#000")
      .attr("filter", "url(#base-glow)")
      .lower();

    const cap = svg.append("path")
      .attr("d", pathData.toString())
      .attr("stroke", "#08304f")
      .attr("stroke-width", 1);

    const stemHeight = size * 1.5;
    const stemWidth = size * 0.3;
    svg.append("rect")
      .attr("x", x - stemWidth / 2)
      .attr("y", y)
      .attr("width", stemWidth)
      .attr("height", stemHeight)
      .attr("fill", "#08304f");

    mushrooms.push({
      cap,
      glow: glowPath,
      phase: Math.random() * Math.PI * 2,
      baseColor: colorInterpolator(0),
    });
  }

  // --- Baseline update ---
  let index = 0;
  const baselineUpdate = d3.interval(() => {
    if (index >= baselineArray.length) index = 0;

    const baseValue = baselineArray[index];
    const baseColor = colorInterpolator(baseValue);
    if (onColorChange) onColorChange(baseColor);

    mushrooms.forEach((m) => {
      m.baseColor = baseColor;
      m.cap.attr("fill", baseColor);
    });

    index++;
  }, 100);

  // --- Spike tracking ---
  const activeSpikes: { m: typeof mushrooms[0]; phase: number }[] = [];
  const seenSpikes = new Set<number>();
  let spikeIndex = 0;

  // --- Glow loop ---
  let t = 0;
  let speedIndex = 0;

  const glowLoop = d3.interval(() => {
    if (rateOfChangeArray.length > 0) {
      const currentSpeed = rateOfChangeArray[speedIndex % rateOfChangeArray.length];
      t += currentSpeed;
      speedIndex++;
    } else {
      t += 0.02;
    }

    // --- Base glow ---
    mushrooms.forEach((m) => {
      const pulse = (Math.sin(t + m.phase) + 1) / 2;
      const glowColor = d3.color(m.baseColor);
      if (!glowColor) return;
      glowColor.opacity = pulse;
      m.glow.attr("fill", glowColor.toString());
    });

    // --- Detect new spikes ---
    if (spikeIndex < spikesArray.length) {
      if (spikesArray[spikeIndex] === 1 && !seenSpikes.has(spikeIndex)) {
        seenSpikes.add(spikeIndex);
        console.log("Spike detected at index:", spikeIndex);

        const numMushroomsToGlow = 6;
        for (let j = 0; j < numMushroomsToGlow; j++) {
          const m = mushrooms[Math.floor(Math.random() * mushrooms.length)];
          activeSpikes.push({ m, phase: t });
        }
      }
      spikeIndex++;
    } else {
      spikeIndex = 0;
      seenSpikes.clear();
      console.log("Spike array complete — resetting");
    }

    // --- Animate spikes ---
    for (let i = activeSpikes.length - 1; i >= 0; i--) {
      const spike = activeSpikes[i];
      const pulse = (Math.sin(t - spike.phase) + 1) / 2;
      const spikeColor = d3.color("white")!;
      spikeColor.opacity = pulse;
      spike.m.glow.attr("fill", spikeColor.toString());

      if (pulse < 0.01) activeSpikes.splice(i, 1);
    }
  }, 10);

  // --- Cleanup ---
  return () => {
    baselineUpdate.stop();
    glowLoop.stop();
    svg.selectAll("*").remove();
  };
}

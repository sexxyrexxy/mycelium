import * as d3 from "d3";

export function drawBioluminescentMushrooms(
  svgElement: SVGSVGElement,
  width: number,
  height: number,
  baselineArray: number[],
  rateOfChangeArray: number[],
  onColorChange?: (color: string) => void
) {
  const svg = d3.select(svgElement);
  svg.selectAll("*").remove();

  const defs = svg.append("defs");

  // Create a reusable glow filter
  defs.append("filter")
    .attr("id", "base-glow")
    .attr("x", "-50%")
    .attr("y", "-100%")
    .attr("width", "200%")
    .attr("height", "400%") 
    .html(`
      <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="blur" />
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    `);

  const numMushrooms = 80;
  const sizeScale = d3.scaleLinear().domain([0, numMushrooms]).range([5, 15]);
  const yScale = d3.scaleLinear().domain([0, numMushrooms]).range([height * 0.1, height * 0.9]);
  const colorInterpolator = d3.interpolateRgb("#0a3d62", "#4cb7b5");

  const mushrooms: {
    cap: d3.Selection<SVGPathElement, unknown, null, undefined>;
    glow: d3.Selection<SVGPathElement, unknown, null, undefined>;
    rate: number;
    phase: number;
    baseColor: string;
  }[] = [];

  for (let i = 0; i < numMushrooms; i++) {
    const size = sizeScale(i);
    const x = Math.random() * width;
    const y = yScale(i);

    // Cap path
    const pathData = d3.path();
    pathData.moveTo(x - size, y);
    pathData.arc(x, y, size, Math.PI, 0, false);

    // Glow path (separate, underneath the cap)
    const glowPath = svg.append("path")
      .attr("d", pathData.toString())
      .attr("fill", "#000")
      .attr("filter", "url(#base-glow)")
      .lower(); // Send to back

    // Main mushroom cap
    const cap = svg.append("path")
      .attr("d", pathData.toString())
      .attr("stroke", "#08304f")
      .attr("stroke-width", 1);

    // Stem
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
      rate: 0.05,
      phase: Math.random() * Math.PI * 2,
      baseColor: colorInterpolator(0),
    });
  }

  let index = 0;
  const baselineUpdate = d3.interval(() => {
    if (index >= baselineArray.length) index = 0;

    const baseValue = baselineArray[index];
    const baseColor = colorInterpolator(baseValue);
    if (onColorChange) onColorChange(baseColor);

    mushrooms.forEach((m) => {
      const roc = rateOfChangeArray[index % rateOfChangeArray.length] ?? 0.2;
      m.rate = 0.5 + roc * 2.0;
      m.baseColor = baseColor;

      m.cap.attr("fill", baseColor);
    });

    index++;
  }, 100);

  const glowLoop = d3.timer((elapsed) => {
    const t = elapsed / 1000;

    mushrooms.forEach((m) => {
      // Pulse glow opacity based on sin curve
      const pulse = 0.3 + 0.7 * Math.abs(Math.sin(t * m.rate + m.phase)); // range [0.3, 1.0]
      const glowColor = d3.color(m.baseColor);
      if (!glowColor) return;

      glowColor.opacity = pulse;
      m.glow.attr("fill", glowColor.toString());
    });
  });

  return () => {
    baselineUpdate.stop();
    glowLoop.stop();
    svg.selectAll("*").remove();
  };
}

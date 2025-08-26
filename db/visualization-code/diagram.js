// REFERENCES
// https://d3js.org/d3-delaunay/voronoi#voronoi_update/

const svg = d3.select("#voronoiSvg"); // Selects the Svg created in the .html file
const width = +svg.attr("width"); // Reads width attribute from .html
const height = +svg.attr("height"); // Reads the height attribute from .html

// Generate 100 random points for the veroni diagram to generate from
// This controls the density of the diagram. E.g., less points less dense structure.
// Ensuring generation is random ensures each dataset has a new shape

// Consideration: Once the diagram is generated, should it be linked to that dataset? Can feel personalised
// Consideration: Perhaps depending on the mushroom the number of seeds can change to 
const numSites = 100;
const sites = [];
for (let i = 0; i < numSites; i++) { 
    sites.push({ x: Math.random() * width, y: Math.random() * height }); // Pushes a randomly generated tuple of points
}

// Computes the voronoi diagram from generated sites
const voronoiDiagram = d3.Delaunay.from(sites, d => d.x, d => d.y)
    .voronoi([0, 0, width, height]); // parameters are the bounds of the visualisation (e.g., the corners [(0,0), (0,width), (0,height), (width, height)])

 // Extract edges into an array
 // Storing the edges allows us to later manipulate the visuals on edge by edge cases.
const edges = [];
for (const polygon of voronoiDiagram.cellPolygons()) {
    const vertices = Array.from(polygon);
    vertices.forEach((v, i) => {
        edges.push({ start: v, end: vertices[(i + 1) % vertices.length] });
    });
}

// Iterate over the edge array, assign points to ends of the line and a colour (to visualise)
edges.forEach(e => {
    e.lineElement = svg.append("line")
        .attr("x1", e.start[0])
        .attr("y1", e.start[1])
        .attr("x2", e.end[0])
        .attr("y2", e.end[1])
        .attr("stroke", "black")
        .attr("stroke-width", 1.5);
});

// Colour animation occurs AFTER the lines have been generated to avoid conficts with generation
let t = 0;
d3.timer(() => {
    // Consideration: can t value be substituted by rate of change from dataset?
    t += 0.05; // speed of color change, larger value for quicker colour change
    edges.forEach((e, i) => {
        const phase = i * 0.05;
        const intensity = (Math.sin(t + phase) + 1) / 2; // 0–1
        const colorValue = Math.floor(255 * intensity);
        e.lineElement.attr("stroke", `rgb(${colorValue},${colorValue},${colorValue})`);
    });
});


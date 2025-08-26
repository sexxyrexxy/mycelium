// const svg = d3.select("#voronoiSvg");
// const width = +svg.attr("width");
// const height = +svg.attr("height");

// // Generate 100 random points for the veroni diagram to generate from
// // This controls the density of the diagram. E.g., less points less dense structure.
// // Ensuring generation is random ensures each dataset has a new shape

// // Consideration: Once the diagram is generated, should it be linked to that dataset? Can feel personalised
// // Consideration: Perhaps depending on the mushroom the number of seeds can change to 
// // represent the different structure
// const numSites = 100;
// const sites = [];
// for (let i = 0; i < numSites; i++) {
//     sites.push({
//         x: Math.random() * width,
//         y: Math.random() * height
//     });
// }

// // Compute Voronoi diagram
// const voronoiDiagram = d3.Delaunay.from(
//     sites, d => d.x, d => d.y
// ).voronoi([0, 0, width, height]);

// // Extract edges into an array
// // Storing the edges allows us to later manipulate the visuals on edge by edge cases.
// const edges = [];
// for (const polygon of voronoiDiagram.cellPolygons()) {
//     const vertices = Array.from(polygon);
//     vertices.forEach((v, i) => {
//         const start = v;
//         const end = vertices[(i + 1) % vertices.length];
//         edges.push({start, end});
//     });
// }

// // Draw edges and colour each black
// edges.forEach(e => {
//     svg.append("line")
//         .attr("x1", e.start[0])
//         .attr("y1", e.start[1])
//         .attr("x2", e.start[0]) // start at start point
//         .attr("y2", e.start[1])
//         .attr("stroke", "black") // all edges black
//         .transition()
//         .duration(700) // animation duration
//         .attr("x2", e.end[0])
//         .attr("y2", e.end[1])
//         .ease(d3.easeLinear);
// });


// // Possible implementation of changing colors

// // JavaScript code example for text color transition
// // const textElement = document.getElementById('text');
// // let colorValue = 0;

// // function transitionColor() {
// //     colorValue = (colorValue + 1) % 256; // Loop through 0-255
// //     const color = 'rgb(' + colorValue + ', 0, 0)'; // Change from red to black
// //     textElement.style.color = color;
// // }

// // setInterval(transitionColor, 100); // Change color every 100 milliseconds

const svg = d3.select("#voronoiSvg");
const width = +svg.attr("width");
const height = +svg.attr("height");

const numSites = 100;
const sites = [];
for (let i = 0; i < numSites; i++) {
    sites.push({
        x: Math.random() * width,
        y: Math.random() * height
    });
}

const voronoiDiagram = d3.Delaunay.from(
    sites, d => d.x, d => d.y
).voronoi([0, 0, width, height]);

const edges = [];
for (const polygon of voronoiDiagram.cellPolygons()) {
    const vertices = Array.from(polygon);
    vertices.forEach((v, i) => {
        const start = v;
        const end = vertices[(i + 1) % vertices.length];
        edges.push({ start, end });
    });
}

// Store line references as before
edges.forEach(e => {
    e.lineElement = svg.append("line")
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

// Animate colors back and forth
let t = 0;
function transitionEdgeColors() {
    t += 0.05; // controls speed
    edges.forEach((e, i) => {
        const phase = i * 0.1; // phase shift for gradient effect
        // sin function oscillates between 0 and 1
        const intensity = (Math.sin(t + phase) + 1) / 1.5;
        const colorValue = Math.floor(255 * intensity);
        e.lineElement.attr("stroke", `rgb(${colorValue},${colorValue},${colorValue})`);
    });
}

d3.timer(transitionEdgeColors);


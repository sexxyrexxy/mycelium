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

// Decided to use linear interpolation for a smoother rate of change animation
// avoids stepping between each second, but at a cost of each
// calculation being a bit behind the actual rate of change value computed
// T is the fraction (between 0.1 and 1) which pointA moves towards the value of pointB
function linearInterpolation(pointA, pointB, t) {
  return pointA + (pointB - pointA) * t;
}

let minRate = 0;
let maxRate = 0;

// Load CSV and populate rates
// This code is temporary until we can fetch from FireBase
d3.csv("../../data visualisations/Cordyceps militari FORMATTED DATA.csv", d3.autoType)
  .then(data => {
    console.log("CSV loaded, total rows:", data.length);

    // The below calculates the discrete derivative between two points, and outputs the general slope (aka rate of change)
    // slice(1) skips the first element as this has nothing to compare to
    rates = data.slice(1).map((d, i) => (d.signal_mv - data[i].signal_mv));
    console.log("Rates computed, total rates:", rates.length);
    console.log("First 5 rates:", rates.slice(0, 5));

    })
  .catch(err => console.error("Error loading CSV:", err));


function mapRateToSpeed(rate, rates) {

  const minRate = Math.min(...rates);
  const maxRate = Math.min(...rates);
  const MAX_RATE = 0.50;  // maximum expected rate of change
  // The above was chosen by looking at the first five rate of changes given
const MIN_SPEED = 0.001; // slowest animation speed
const MAX_SPEED = 0.6;  // fastest animation speed

  // normalise the rates of change between 0 and 1
  const normalized = (rate - minRate) / (maxRate - minRate);

  // // Map to desired speed range
 return MIN_SPEED + normalized * (MAX_SPEED - MIN_SPEED);
}

let rates = []; // an array to store
let currentSpeed = 0.00; // Initialise start values for the current speed
let targetSpeed = 0.05;
let rateIndex = 0; // Is the current position in the array of rate of changes

// The below needs to be written before the timer, as this function is constantly running
// This function
setInterval(() => {
  if (rates.length === 0) return; // wait until rates are loaded, or if none exit
  const rate = rates[rateIndex % rates.length]; // The modulo operator ensures it wraps around to the start of the array again
  console.log("rate is currently: ", rate)
  targetSpeed = mapRateToSpeed(rate); // a rate of change is mapped to a speed
  //targetSpeed = rate;
  rateIndex++;
}, 1000); // 1000 milliseconds = 1 second

let phase = 0; // The current phase speed of the animation

d3.timer(() => {
  // Smoothly move currentSpeed toward the targetSpeed
  // This prevents sudden jumps in animation speed when the rate changes
  currentSpeed = linearInterpolation(currentSpeed, targetSpeed, 0.05);

  // Increase the animation phase by the current speed (could be positive or negative)
  // Higher currentSpeed → faster ripples/pulses
  phase += currentSpeed;

  // Loop through each edge to update its color based on the sine wave animation
  edges.forEach((edge, index) => {
    // Add a small phase offset per edge so edges don't all pulse in sync (looks like it spreads out throughout the branches)
    const edgePhase = index * 0.05;

    // Compute a normalized intensity (0 → 1) using a sine wave
    const intensity = Math.sin((phase + edgePhase)+ 1);
    // console.log(intensity, index)
    // console.log(currentSpeed, index)
  
    //console.log(normalised);
    // The following code calculates the colour, will be amended for the next section
    // Convert intensity to a greyscale color value (0 → 255)
    const colorValue = Math.floor(255 * intensity);

    // Update the edge's stroke color using the calculated greyscale
    // e.g., rgb(0,0,0) = black  rgba(253, 252, 252, 1) = white
    edge.lineElement.attr("stroke", `rgb(${colorValue},${colorValue},${colorValue})`);
  });
});



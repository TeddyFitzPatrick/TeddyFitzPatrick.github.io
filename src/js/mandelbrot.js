// Rendering 
let canvas, canvasX, canvasY
const red = "rgb(255, 0, 0)";
const green = "rgb(0, 255, 0)";
const blue = "rgb(0, 0, 255)";

// Mandelbrot variables
const divergence_threshold = 1_000_000;
let divergence_iterations, z_0, ctx, inverted, renderAxes, gradient, brightness, scale;
// Zooming
const magicX = -0.761574;
const magicY = -0.0847596
let xOffset = magicX;
let yOffset = magicY;

// HTML Status Updates
let timeToGenerateDisplay, scaleDisplay, brightnessDisplay, sharpnessDisplay

window.onload = function () {
  // Default program args
  applyDefaults();
  // HTML Status update
  timeToGenerateDisplay = document.getElementById("timeToGenerate");
  scaleDisplay = document.getElementById("scaleDisplay");
  brightnessDisplay = document.getElementById("brightnessDisplay");
  sharpnessDisplay = document.getElementById("sharpnessDisplay");
  // Add event listeners
  addEventListeners();
  // Handle canvas retrieval failure
  if (!canvas.getContext) {
    console.log("Couldn't get context");
    return;
  }
  // Mandelbrot rendering
  draw();
}

// Adds event listeners to the buttons, canvas, and window resizing
function addEventListeners(){
  // Canvas click event - Apply zoom on canvas and re-render
  canvas.addEventListener('click', function(){
    let clickX = Number(event.clientX - canvasX);
    let clickY = Number(event.clientY - canvasY);
    xOffset = scale * (clickX / canvas.width) - (scale/2) + xOffset
    yOffset = scale * (clickY / canvas.width) - (scale/2) + yOffset;
    scale *= 0.2;
    draw();
  });
  // Canvas right click event - Apply unzoom on canvas and re-render
  canvas.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    scale *= 5;
    draw();
  });

  // Update the canvas and rendering on window resize
  window.addEventListener('resize', function() {
    applyDefaults();
    draw();
  });
  // Add event listeners for option selection
  document.getElementById('invert').addEventListener('click', function(){
      inverted = !inverted;
      draw();
  });
  document.getElementById('z_0').addEventListener('click', function(){
      z_0 = 1;
      draw();
  });
  document.getElementById('sharpen').addEventListener('click', function(){
      divergence_iterations += 1_000;
      draw();
  });
  document.getElementById('reset').addEventListener('click', function(){
    applyDefaults();
    draw();
  });
}

// Creates the canvas according to the size of the parent container (div).
function generateCanvas(){
  // Initialize canvas with default dimensions
  container = document.getElementById("mandelbrotContainer");
  canvas = document.getElementById("canvas");
  // Canvas will be a square to avoid a distorted mandelbrot set rendering
  canvas.width = Math.min((container.offsetWidth > 900) ? container.offsetWidth/2 : container.offsetWidth-20, 700);
  canvas.height = canvas.width;
  ctx = canvas.getContext("2d");
  // Store the canvas' x and y positions
  let rect = canvas.getBoundingClientRect(); 
  canvasX = rect.left + window.scrollX; 
  canvasY = rect.top + window.scrollY; 
}


function applyDefaults(){
  // Get the canvas
  generateCanvas();
  // Default offset position
  xOffset = magicX;
  yOffset = magicY;
  // Default mandelbrot args
  divergence_iterations = 1_000;
  z_0 = 0;
  inverted = false;
  renderAxes = false;
  gradient = true;
  scale = 4
  brightness = 5
}

// Drawing a pixel at an (x, y) coordinate of a specified rgb color
function drawPoint(x, y, color) {
  ctx.beginPath();
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 1, 1)
  ctx.fill();
}

// Modulates brightness in proportion to scale for visibility at lower scales
function adjustBrightness(){
  // Smaller scales require low brightness for clarity
  if (scale >= 1){
    brightness = 6;
  } else if (scale >= 0.1){
    brightness = 3;
  } else if (scale >= 0.001 ){
    brightness = 1;
  } else if (scale > 0.0001){
    brightness = 0.8;
  } else if (scale <= 0.0001){
    brightness = 0.2;
  }

}

// Rendering the Mandelbrot set and outputting the generation time to an HTML page
function draw() {
  // Adjust brightness according to scale
  adjustBrightness();
  // Display the scale, brightness, sharpness
  // Up to 3 sig-figs in scientific notation (i.e. 123456 > 1.23 * 10^5)
  scaleDisplay.innerHTML = (scale >= 1) ? scale : Number(scale.toPrecision(3)).toExponential();
  brightnessDisplay.innerHTML = brightness;
  sharpnessDisplay.innerHTML = divergence_iterations;
  // Start time in milliseconds
  const startTime = performance.now();
  // Clear screen
  ctx.fillStyle = inverted ? "black" : "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // Check every pixel in the canvas for if its in the Mandelbrot set
  for (let x = 0; x <= canvas.width; x++) {
    for (let y = 0; y <= canvas.height; y++) {
      // Check if the screen coordinates mapped onto the complex plane fit in the Mandelbrot set
      let inMandelbrot = isInMandelbrot(
        scale * (x / canvas.width) - (scale/2) + xOffset,
        scale * (y / canvas.height) - (scale/2) + yOffset       
      );
      // (-0.761574, -0.0847596)
      if (inMandelbrot == 0) {
        // Plot the point to its screen coordinates if its complex coordinates are in the set
        if (inverted) {
          drawPoint(x, y, "white");
        } else {
          drawPoint(x, y, "black");
        }
      // Gradient effects only apply when the selector is activated
      } else if(gradient){
        // Otherwise, plot the point with a brightness relative to the rate of its divergence (iteration count)
        let off;
        if (inverted) {
          off = Math.min(255, 255 - inMandelbrot * brightness);
          drawPoint(x, y, `rgb(${off}, ${off}, ${off})`);
        } else {
          off = Math.max(0, inMandelbrot * brightness);
          drawPoint(x, y, `rgb(${off}, ${off}, ${off})`);
        }
      }
    }
  }
  // Find the Mandelbrot generation execution time
  const endTime = performance.now();
  const timeToGenerate = (endTime - startTime) / 1000;
  timeToGenerateDisplay.innerHTML = timeToGenerate.toFixed(3);
}

/*
Runs an arbitary number of iterations of the f(z) = z^2 + c, determining if it diverges for complex number c
Complex coordinates c = {a + bi} are projected onto an (x, y) cartesian coordinate system 
When f(z) surpasses an arbitary divergence limit, the point will be colored with a brightness relative to its rate of its divergence
*/
function isInMandelbrot(a, b) {
  let output;
  let z_a = z_0;
  let z_b = 0;
  // Check for divergence
  for (let iteration = 1; iteration <= divergence_iterations; iteration++) {
    // Keep running the mandelbrot function for an arbitrary num of iterations to guesstimate divergence of a coordinate pair
    output = f(z_a, z_b, a, b);
    z_a = output[0];
    z_b = output[1];
    // If the real or imaginary value of the coordinate pair exceeds a certain threshold, it is divergent
    // By definition, divergent coordinate pairs are not in the mandelbrot set
    if (
      Math.abs(z_a) > divergence_threshold ||
      Math.abs(z_b) > divergence_threshold
    ) {
      return iteration;
    }
  }
  // The complex coordinate is in the mandelbrot set
  return 0;
}

/* 
Defined as f(z) = z^2 + c, where z and c are complex numbers
Recursive function, where f(z) represents the next iteration of z

Expanded form:
f(z) = (z_a + z_b * i)^2 + (a + bi)
=>
f(z) = z_a^2 + a - z_b^2, 2(z_a)(z_b) + b
*/
function f(z_a, z_b, a, b) {
  return [z_a ** 2 + a - z_b ** 2, 2 * z_a * z_b + b];
}

// Rendering
const fullScreenSize = 1280;
let container;
let canvas;
let canvasX, canvasY;
let startRenderingButton;

// Mandelbrot variables
let divergenceIterations,
	zInitial,
    ctx,
    inverted,
    renderAxes,
    gradient,
    brightness,
    scale;

// Zooming
let xOffset = 0;
let yOffset = 0;

// HTML Status Updates
let timeToGenerateDisplay, scaleDisplay, brightnessDisplay, sharpnessDisplay;

window.onload = function () {
    // Locate DOM Elements
    canvas = document.getElementById("canvas");
    startRenderingButton = document.getElementById("renderMandelbrot");
    timeToGenerateDisplay = document.getElementById("timeToGenerate");
    scaleDisplay = document.getElementById("scaleDisplay");
    brightnessDisplay = document.getElementById("brightnessDisplay");
    sharpnessDisplay = document.getElementById("sharpnessDisplay");
    // Add event listeners
    addEventListeners();
};

// Adds event listeners to the buttons, canvas, and window resizing
function addEventListeners() {
    // Canvas click event - Apply zoom on canvas and re-render
    canvas.addEventListener("click", () => {
        let clickX = Number(event.clientX - canvasX);
        let clickY = Number(event.clientY - canvasY + window.scrollY);
        xOffset = Number(scale * (clickX / canvas.width) - scale / 2 + xOffset);
        yOffset = Number(
            scale * (clickY / canvas.height) - scale / 2 + yOffset
        );
        scale *= 0.2;
        draw();
    });
    // Canvas right click event - Apply unzoom on canvas and re-render
    canvas.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        scale *= 5;
        draw();
    });
    // Start the mandelbrot rendering
    startRenderingButton.addEventListener("click", () => {
        startRenderingButton.classList.add("hidden");
        applyDefaults();
        draw();
    });

    // Add event listeners for option selection
    document.getElementById("invert").addEventListener("click", () => {
        inverted = !inverted;
        draw();
    });
    document.getElementById("zInitial").addEventListener("click", () => {
        zInitial = 1;
        draw();
    });
    document.getElementById("sharpen").addEventListener("click", () => {
        divergenceIterations += 1_000;
        draw();
    });
    document.getElementById("reset").addEventListener("click", () => {
        applyDefaults();
        draw();
    });
}

// Creates the canvas according to the size of the parent container (div).
function generateCanvas() {
    container = document.getElementById("mandelbrotContainer");
    // Canvas dimensions set to a square to avoid distorted rendering
    // full screen size+ (1280)
    if (window.innerWidth >= fullScreenSize) {
        canvas.width = container.offsetWidth;
    } else {
        canvas.width = Math.min(container.offsetWidth, container.offsetHeight);
    }
    canvas.height = canvas.width;
    ctx = canvas.getContext("2d");
    // Store the canvas' x and y positions
    let rect = canvas.getBoundingClientRect();
    canvasX = rect.left + window.scrollX;
    canvasY = rect.top + window.scrollY;
}

function applyDefaults() {
    // Get the canvas
    generateCanvas();
    // Default offset position
    xOffset = 0;
    yOffset = 0;
    // Default mandelbrot args
    divergenceIterations = 1_000;
    zInitial = 0;
    inverted = false;
    renderAxes = false;
    gradient = true;
    scale = 4;
    brightness = 5;
}

// Modulates brightness in proportion to scale for visibility at lower scales
function adjustBrightness() {
    // Smaller scales require low brightness for clarity
    brightness = 0.4 * (Math.log10(scale + 10 ** -6) + 6) + 0.1;
}

// Rendering the Mandelbrot set and outputting the generation time to an HTML page
function draw() {
    // Adjust brightness according to scale
    adjustBrightness();
    // Display the scale, brightness, sharpness
    // Up to 3 sig-figs in scientific notation (i.e. 123456 > 1.23 * 10^5)
    scaleDisplay.innerHTML =
        scale >= 1 ? scale : Number(scale.toPrecision(3)).toExponential();
    brightnessDisplay.innerHTML = Number(
        brightness.toPrecision(3)
    ).toExponential();
    sharpnessDisplay.innerHTML = divergenceIterations;
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
                scale * (x / canvas.width) - scale / 2 + xOffset,
                scale * (y / canvas.height) - scale / 2 + yOffset
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
            } else if (gradient) {
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

// Drawing a pixel at an (x, y) coordinate of a specified rgb color
function drawPoint(x, y, color) {
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 1, 1);
    ctx.fill();
}

/*
Runs an arbitary number of iterations of the f(z) = z^2 + c, determining if it diverges for complex number c
Complex coordinates c = {a + bi} are projected onto an (x, y) cartesian coordinate system 
When f(z) surpasses an arbitary divergence limit, the point will be colored with a brightness relative to its rate of its divergence
*/
function isInMandelbrot(a, b) {
    let output;
    let zReal = zInitial;
    let zComplex = 0;
    // Check for divergence
    for (let iteration = 1; iteration <= divergenceIterations; iteration++) {
        // Keep running the mandelbrot function for an arbitrary num of iterations to guesstimate divergence of a coordinate pair
        output = f(zReal, zComplex, a, b);
        zReal = output[0];
        zComplex = output[1];
        // If the real or imaginary value of the coordinate pair exceeds a certain threshold, it is divergent
        // By definition, divergent coordinate pairs are not in the mandelbrot set
        if (Math.abs(zReal) > 3 || Math.abs(zComplex) > 3) {
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
f(z) = (zReal + zComplex * i)^2 + (a + bi)
=>
f(z) = zReal^2 + a - zComplex^2, 2(zReal)(zComplex) + b
*/
function f(zReal, zComplex, a, b) {
    return [zReal ** 2 + a - zComplex ** 2, 2 * zReal * zComplex + b];
}

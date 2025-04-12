import { Particle } from './particle.js';
// Canvas variables
export let canvas, ctx;
const opacity = 0.03;

// Particle life variables
export const COLORS = ["red", "orange", "yellow", "green", "blue", "purple"];
export let particleCount = 1_000;
export let particleSize = 7;
export let forceMatrix 

export let frictionCoefficient = 0.03;
export let minRadius = 40;
export let maxRadius = 200;
export let particles = [];

window.addEventListener("load", () => {
    // TODO: 
    particleCount = Math.min(1000, 0.0006 * (window.innerWidth * window.innerHeight));
    particleCount = Math.max(particleCount, 200);
    loadSimulation();
    // setInterval(loadSimulation, 2000);
});

// Add event listeners for keyboard presses, mouse button clicks, and slider inputs
function addListeners(){
    // document.onkeypress = function (e) {
    //     e = e || window.event;
    //     // use e.keyCode
    //     generateForceMatrix();
    // };
    // document.onkeypress = function (f) {
    //     f = f || window.event;
    //     // use f.keyCode
    //     for (let colorOne of COLORS){
    //         for (let colorTwo of COLORS){
    //             forceMatrix[colorOne][colorTwo] *= -1;
    //         }
    //     }
    // };
    // Resize the canvas on window resize
    window.addEventListener("resize", function() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
    // Apply a force on click
    window.addEventListener("click", function(){
        let deltaX, deltaY, angle, xDir, yDir
        let forceMagnitude = 20;
        for (let particle of particles){
            deltaX = Number(event.clientX) - particle.position[0];
            deltaY = Number(event.clientY) - particle.position[1];
            angle = Math.atan2(deltaY, deltaX);
            xDir = Math.cos(angle);
            yDir = Math.sin(angle);
            particle.velocity[0] += forceMagnitude * xDir;
            particle.velocity[1] += forceMagnitude * yDir;
        }
    });

    if (document.getElementById("minRadiusSlider") === null) return;
    // Slider inputs
    const SLIDERS = ["minRadius", "maxRadius", "particleSize", "particleCount", "frictionCoefficient"];

    SLIDERS.forEach((sliderName) => {
        let slider = document.getElementById(sliderName + "Slider");
        let display = document.getElementById(sliderName + "Display");
        slider.addEventListener("input", (event) => {
            display.textContent = event.target.value;
            switch (sliderName){
                case "minRadius":
                    minRadius = Number(event.target.value);
                    break;
                case "maxRadius":
                    maxRadius = Number(event.target.value);
                    break;
                case "particleSize":
                    particleSize = Number(event.target.value);
                    break;
                case "particleCount":
                    // Add remove particles
                    let newParticleCount = Number(event.target.value);
                    if (newParticleCount >= particleCount){
                        generateParticles(newParticleCount - particleCount);
                    } else{
                        for (let i = 0; i < particleCount - newParticleCount; i++){
                            particles.pop();
                        }
                    }
                    particleCount = newParticleCount;
                    break;
                case "frictionCoefficient":
                    frictionCoefficient = Number(event.target.value);
                    break;
            }
        });
    });
    // Apply Defaults button
    let reloadButton = document.getElementById("applyDefaults");
    reloadButton.addEventListener("click", () => {
        window.location.reload();
    });
}

// Start the simulation 
export function loadSimulation(){
    // Get the canvas and set its size the body
    canvas = document.getElementById("canvas");
    ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Event Listeners
    addListeners();

    // Generate particles
    generateParticles(particleCount);

    // Generate a force mapping between colors (attraction/repulsion values between different colored particles)
    generateForceMatrix();

    // Start the particle life rendering
    setInterval(() => {
        render(opacity);
    }, 15);

}

// Generates a specified number of particles, each with their own random position and color
function generateParticles(particlesToGenerate){
    particles = [];
    for (let i = 1; i <= particlesToGenerate; i++){
        particles.push(new Particle(
            getRandomPosition(),
            [0, 0],
            COLORS[Math.floor(Math.random() * COLORS.length)]
        ));
    }
}

// Generate a matrix of attraction and repulsion values between different particle colors with random values
function generateForceMatrix(){
    forceMatrix = {};
    COLORS.forEach(color => {
        // Each color gets its own force mapping to every other color
        forceMatrix[color] = {};
        COLORS.forEach(otherColor => {
            // Get random attraction/repulsion force coefficient between colors
            // forceMatrix[color][otherColor] = Math.random() * 2 - 1;
            // NEGATIVE
            forceMatrix[color][otherColor] = Math.random() * 2 - 1.5;
        });
    });
}

// Clear the screen, apply particle logic, and then render the particles
function render(opacity){
    // Clear screen
    ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Apply particle forces, updating positions and velocities
    for (let particle of particles){
        particle.update();
    }
    // Render particle(s)
    for (let particle of particles){
        particle.render();
    }
}

// Utility
function getRandomNumber(min, max){
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomPosition(){
    return [getRandomNumber(Math.floor(canvas.width*0.4), Math.floor(canvas.width*0.6)), 
            getRandomNumber(Math.floor(canvas.height*0.4), Math.floor(canvas.height*0.6))];
}

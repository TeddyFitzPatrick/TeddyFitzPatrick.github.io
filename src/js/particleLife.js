import { Particle } from './particle.js';
// Canvas variables
export let canvas, ctx;

// Particle life variables
export const COLORS = ["red", "orange", "yellow", "green", "blue", "purple"];
export let particleCount = 1_000;
export let particleSize = 4;
export let forceMatrix 

export let frictionCoefficient = 0.1;
export let minRadius = 40;
export let maxRadius = 101;
export let particles = []


// Generates a specified number of particles, each with their own random position and color
function generateParticles(particlesToGenerate){
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
            forceMatrix[color][otherColor] = Math.random() * 2 - 1;
        });
    });
}

// Clear the screen, apply particle logic, and then render the particles
function render(){
    // Clear screen
    ctx.fillStyle = "black"
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
    window.addEventListener('resize', function() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
    // Apply a force on click
    canvas.addEventListener('click', function(){
        let deltaX, deltaY, angle, xDir, yDir
        let forceMagnitude = 40;
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


window.onload = function(){
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
    setInterval(render, 17);
};

// Utility
function getRandomNumber(min, max){
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomPosition(){
    return [getRandomNumber(0, canvas.width), getRandomNumber(0, canvas.height)];
}

import { Particle } from './particle.js';
// Canvas variables
export let canvas, ctx;

// Particle life variables
export const particleCount = 1_000;
export const particleSize = 5;
export const COLORS = ["red", "orange", "yellow", "green", "blue", "purple", "pink", "white"];
export let forceMatrix 

export const frictionCoefficient = 0.1;
export const minRadius = 40;
export const maxRadius = 100;
export let particles = []

function generateForceMatrix(){
    const forceValues = [-1, -0.8, -0.6, -0.4, -0.2, 0, 0.2, 0.4, 0.6, 0.8, 1];
    forceMatrix = {};
    COLORS.forEach(color => {
        // Each color gets its own force mapping to every other color
        forceMatrix[color] = {};
        COLORS.forEach(otherColor => {
            // Get random attraction/repulsion force coefficient between colors
            forceMatrix[color][otherColor] = forceValues[Math.floor(Math.random() * forceValues.length)];
        });
    });
}

function updateParticles(){
    for (let particle of particles){
        particle.update();
    }
}

function render(){
    // Clear screen
    ctx.fillStyle = "black"
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Logic
    updateParticles();
    // Render particle(s)
    for (let particle of particles){
        particle.render();
    }
}

window.onload = function(){
    // Get the canvas and set its size the body
    canvas = document.getElementById("canvas");
    ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    // Add Event Listeners

    // Apply a force after clicking
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

    window.onscroll = function(e){
        console.log(performance.now());
    }

    // Generate particles
    for (let i = 1; i <= particleCount; i++){
        particles.push(new Particle(
            getRandomPosition(),
            [0, 0],
            COLORS[Math.floor(Math.random() * COLORS.length)]
        ));
    }

    // DEBUG
    // particles.push(
    //     new Particle([480, 500], [0, 0], "red")
    // );
    // particles.push(
    //     new Particle([520, 500], [0, 0], "blue")
    // );

    // Generate a force mapping between colors (attraction/repulsion values between different colored particles)
    generateForceMatrix();

    console.log(forceMatrix);

    // Start the particle life rendering
    // render();
    setInterval(render, 17);
};

// Utility
function getRandomNumber(min, max){
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomPosition(){
    return [getRandomNumber(0, canvas.width), getRandomNumber(0, canvas.height)];
}

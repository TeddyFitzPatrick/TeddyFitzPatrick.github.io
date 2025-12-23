import { Particle } from './particle.js';
// Canvas variables
export let canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D;
let opacity = 0.05;

// Particle life variables
export const COLORS: string[] = ["red", "orange", "yellow", "green", "blue", "purple"];
export let particleSize: number = 7;
export let forceMatrix: Record<string, Record<string, number>>;

export let frictionCoefficient = 0.05;
export let minRadius: number = 40;
export let maxRadius: number = 200;
export let particles: Particle[] = [];

// Add event listeners for keyboard presses, mouse button clicks, and slider inputs
function addEventListeners(){
    // Resize the canvas on window resize
    window.addEventListener("resize", function() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
    // Apply a force on click
    canvas.addEventListener("click", function(event){
        let deltaX, deltaY, angle, xDir, yDir
        let forceMagnitude = 10;
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
}

// Start the simulation 
export function loadSimulation(canvasElement: HTMLCanvasElement, context: CanvasRenderingContext2D, particleCount: number){
    // Get the canvas and set its size the body
    canvas = canvasElement;
    ctx = context;

    // Event Listeners
    addEventListeners();

    // Generate particles
    particles = [];
    generateParticles(particleCount);

    // Generate a force mapping between colors (attraction/repulsion values between different colored particles)
    generateForceMatrix();

    // Start the particle life rendering
    const intervalId: NodeJS.Timeout = setInterval(() => {
        render();
    }, 20);
    
    return intervalId;
}

// Generates a specified number of particles, each with their own random position and color
function generateParticles(particlesToGenerate: number){
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
function render(){
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
function getRandomNumber(min: number, max: number){
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomPosition(){
    return [getRandomNumber(Math.floor(canvas.width*0.4), Math.floor(canvas.width*0.6)), 
            getRandomNumber(Math.floor(canvas.height*0.4), Math.floor(canvas.height*0.6))];
}


import { Particle } from './particle.ts';
import { useEffect, useRef, useState, type ChangeEvent } from "react";

// Canvas variables
export let canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D;

// Particle life variables
export const COLORS: string[] = ["red", "orange", "yellow", "green", "blue", "purple"];
export let forceMatrix: Record<string, Record<string, number>>;
export let particles: Particle[] = [];

type SimulationVariables = {
    frictionCoefficient: number,
    minRadius: number,
    maxRadius: number,
    particleSize: number,
    opacity: number
}
export let simulationVariables: SimulationVariables = {
    frictionCoefficient: 0.06,
    minRadius: 40,
    maxRadius: 200,
    particleSize: 7,
    opacity: 0.05
}

// Start the simulation 
export function loadSimulation(particleCount: number){
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
    ctx.fillStyle = `rgba(0, 0, 0, ${simulationVariables.opacity})`;
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

function getRandomNumber(min: number, max: number){
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomPosition(){
    return [getRandomNumber(Math.floor(canvas.width*0.4), Math.floor(canvas.width*0.6)), 
            getRandomNumber(Math.floor(canvas.height*0.4), Math.floor(canvas.height*0.6))];
}

type Slider = {name: string, variable: keyof typeof simulationVariables, minValue: number, maxValue: number, step?: number}
function Slider({name, variable, minValue, maxValue, step=1}: Slider){
    

    const initialValue = localStorage.getItem(variable) ?? simulationVariables[variable];
    const [sliderValue, setSliderValue] = useState(+initialValue)
    simulationVariables[variable] = +initialValue;
    const changeVariable = (event: ChangeEvent<HTMLInputElement>): void => {
        simulationVariables[variable] = +event.target.value;
        setSliderValue(simulationVariables[variable]);
        localStorage.setItem(variable, String(simulationVariables[variable]));
    }

    return <>
        <div className="flex flex-col">
            <div className="flex flex-row space-x-2">
                <input onChange={changeVariable}
                    type="range" 
                    name={name} 
                    min={minValue}
                    value={sliderValue} 
                    max={maxValue}
                    step={step}/>
                <label htmlFor={name}>
                    {name} 
                </label>
            </div>
            <label htmlFor={name}>
                ({sliderValue})
            </label>
            
        </div>
    </>
}

export function Sliders(){
    return <>
    <div className="fixed right-2 bottom-2 flex flex-col space-x-2">
        <Slider name={"Friction Coefficient"} 
            variable={"frictionCoefficient"} 
            minValue={0} 
            maxValue={0.1} 
            step={0.01}/>
        <Slider name={"Repulsion Distance"} 
            variable={"minRadius"}
            minValue={1} 
            maxValue={50}/>
        {/* <Slider name={"Max Distance"} 
            variable={"maxRadius"} 
            minValue={100} 
            maxValue={500}/> */}
        <Slider name={"Particle Radius"} 
            variable={"particleSize"} 
            minValue={1} 
            maxValue={10}/>
        <Slider name={"Opacity"} 
            variable={"opacity"} 
            minValue={0} 
            maxValue={0.3} 
            step={0.01}/>
    </div>
    </>
}

export function ParticleLife(){
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
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
    }, []);

    useEffect(() => {
        canvas = canvasRef.current as HTMLCanvasElement;
        if (!canvas) return;
        ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
        if (!ctx) return;
        intervalRef.current = loadSimulation(Math.max(Math.min(1000, 0.0006 * (window.innerWidth * window.innerHeight)), 200))
        return () => {
            if (intervalRef.current != null) clearInterval(intervalRef.current);
        };
    }, []);

    return <div className="w-full h-full bg-black">
        <canvas ref={canvasRef}
            width={window.innerWidth}
            height={window.innerHeight}
            className="w-full h-full"/>
    </div>
}

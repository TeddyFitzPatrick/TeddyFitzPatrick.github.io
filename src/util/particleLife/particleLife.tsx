
import { Particle } from './particle.ts';
import { useEffect, useRef, useState, type ChangeEvent } from "react";

// Canvas variables
export let canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D;
const FRAME_RATE = 50;

// Particle life variables
export const COLORS: string[] = ["red", "orange", "yellow", "green", "blue", "purple"];
export let particles: Particle[] = [];
const forceConstants = [-1.6, -1.2, -0.8, -0.4, 0, 0.4, 0.8, 1.2, 1.6];
const FORCE_STEP = 0.4;

export type colorMatrix = Map<string, Map<string, number>>;
type Setter<T> = React.Dispatch<React.SetStateAction<T>>;
type Ref<T> = React.RefObject<T>;
type SimulationVariables = {
    frictionCoefficient: number,
    minRadius: number,
    maxRadius: number,
    particleSize: number,
    opacity: number
}
export let simulationVariables: SimulationVariables = {
    frictionCoefficient: 0.10,
    minRadius: 50,
    maxRadius: 200,
    particleSize: 6,
    opacity: 0.08
}

// Start the simulation 
function loadSimulation(particleCount: number, forceMatrixRef: Ref<colorMatrix>, setForceMatrix: Setter<colorMatrix>){
    // Generate a force mapping between colors (attraction/repulsion values between different colored particles)
    const initMatrix = generateForceMatrix();
    setForceMatrix(initMatrix);

    // Generate particles
    particles = [];
    generateParticles(particleCount);

    // Start the particle life rendering
    // let iterations = 0;
    // let totalUpdate = 0.0;
    // let totalRender = 0.0;

    const timeBetweenFrames = 1000 / FRAME_RATE;
    const intervalId: NodeJS.Timeout = setInterval(() => {
        if (!forceMatrixRef || !forceMatrixRef.current || Array.from(forceMatrixRef.current.keys()).length === 0){
            // for when react is asynchronously updating forceMatrix state
            const {updateTime: _u, renderTime: _r} = gameLoop(initMatrix);
        } else{
            // performance indicators
            const {updateTime: _u, renderTime: r} = gameLoop(forceMatrixRef.current);
            // totalUpdate += u;
            // totalRender += r;
            // iterations += 1;
        }
        // if (iterations !== 0) {
        //     console.log("avg_update: " + (totalUpdate / iterations));
        //     console.log("avg_render: " + (totalRender / iterations));
        // }
    }, timeBetweenFrames);
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
    const forceMatrix = new Map();
    COLORS.forEach(color => {
        // Each color gets its own force mapping to every other color
        forceMatrix.set(color, new Map());
        COLORS.forEach(otherColor => {
            // Set the attraction or repulsion force constant for each pair of colors
            const randomForce = forceConstants[Math.floor(forceConstants.length * Math.random())];
            forceMatrix.get(color)!.set(otherColor, randomForce);
        });
    });
    return forceMatrix
}


// Clear the screen, apply particle logic, and then render the particles
function gameLoop(forceMatrix: colorMatrix){

    const t0 = performance.now();
    // Apply particle forces, updating positions and velocities
    for (let particle of particles){
        particle.update(forceMatrix);
    }
    const updateTime = performance.now() - t0;

    const t1 = performance.now();
    // Render particle(s)
    ctx.fillStyle = `rgba(0, 0, 0, ${simulationVariables.opacity})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let particle of particles){
        particle.render();
    }
    const renderTime = performance.now() - t1;

    return {
        updateTime,
        renderTime
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
        <div className="flex flex-col text-white">
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
            maxValue={0.2} 
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

export default function ParticleLife({canvasClasses}: {canvasClasses?: string}){
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    
    const [forceMatrix, setForceMatrix] = useState<colorMatrix>(new Map([]));
    const forceMatrixRef = useRef<colorMatrix>(forceMatrix);

    useEffect(()=>{
        forceMatrixRef.current = forceMatrix;
    }, [forceMatrix])

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
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
                deltaX = event.clientX - particle.position[0];
                deltaY = event.clientY - particle.position[1] + window.scrollY;
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
        // Particle count is set proportional to the screen dimensions
        const particleCount = Math.max(Math.min(1000, 0.0006 * (window.innerWidth * window.innerHeight)), 200);
        intervalRef.current = loadSimulation(particleCount, forceMatrixRef, setForceMatrix);
        return () => {
            if (intervalRef.current != null) clearInterval(intervalRef.current);
        };
    }, []);

    return <div className="w-full h-full">
        <canvas ref={canvasRef}
            width={window.innerWidth}
            height={window.innerHeight}
            className={`${canvasClasses} w-full h-full bg-black`}/>
        <InteractiveColorGrid forceMatrix={forceMatrix} setForceMatrix={setForceMatrix}/>
    </div>
}

function InteractiveColorGrid({forceMatrix, setForceMatrix}: {forceMatrix: colorMatrix, setForceMatrix: Setter<colorMatrix>}){
    const getForceShade = (value: number) => {
        const max = 1.5;
        const intensity = Math.min(Math.abs(value) / max, 1); // 0 → 1

        const channel = Math.round(255 * intensity);

        if (value < 0) {
            return `rgb(${channel}, 0, 0)`; // red only
        } else if (value > 0) {
            return `rgb(0, ${channel}, 0)`; // green only
        } else {
            return `rgb(0, 0, 0)`; // zero = black (or pick neutral)
        }
    };
    const step = FORCE_STEP;
    const min = forceConstants.at(0)!;
    const max = forceConstants.at(-1)!;
    const increaseForce = (colorKey: string, color: string) => {
        setForceMatrix(prevMatrix => {
            const updatedMatrix: colorMatrix = new Map(prevMatrix);
            const inner = new Map(updatedMatrix.get(colorKey)!); // clone inner map
            const force = inner.get(color)!;
            const updatedForce =
                force + step > max ? min : parseFloat((force + step).toFixed(1));
            inner.set(color, updatedForce);
            updatedMatrix.set(colorKey, inner);
            return updatedMatrix
        })
    }
    const decreaseForce = (colorKey: string, color: string) => {
        setForceMatrix(prevMatrix => {
            const updatedMatrix: colorMatrix = new Map(prevMatrix);
            const inner = new Map(updatedMatrix.get(colorKey)!); // clone inner map
            const force = inner.get(color)!;
            const updatedForce =
                force - step < min ? max : parseFloat((force - step).toFixed(1));
            inner.set(color, updatedForce);
            updatedMatrix.set(colorKey, inner);
            return updatedMatrix
        })
    }

    return <>
    {/* Disable context menu popup on right click (for better force decreasing) */}
    <div onContextMenu={(event) => event.preventDefault()}
        className="absolute left-1 bottom-1 hidden md:flex flex-col space-y-2 backdrop-blur-sm bg-black/60 p-2 rounded-xl shadow-xl">
        {Array.from(forceMatrix.keys()).reverse().map((colorKey, topIndex) => {
            return (
                <div style={{backgroundColor: colorKey}} 
                    className="w-6 h-6 shrink-0 flex flex-row space-x-2 rounded-sm shadow-xl"
                    key={topIndex}>
                    <div className="w-6 h-6 shrink-0"/> 
                    {Array.from(forceMatrix.get(colorKey)!.keys()).map((color, bottomIndex) => {
                        const initialForce = forceMatrix.get(colorKey)!.get(color)!;
                        const bgColor = getForceShade(initialForce);
                        return <button onClick={() => increaseForce(colorKey, color)}
                            onContextMenu={() => decreaseForce(colorKey, color)}
                            style={{backgroundColor: bgColor}}
                            className="w-6 h-6 shrink-0 hover:scale-110"
                            key={bottomIndex}/>
                    })}
                </div>
            )
        })}

        {/* Color labels on the bottom */}
        <div className="w-full flex space-x-2">
            <div className="w-6 h-6 shrink-0"/> 
            {Array.from(forceMatrix.keys()).map((color, index) => {
                return (
                    <div style={{backgroundColor: color}}
                        className="w-6 h-6 shrink-0 rounded-sm shadow-xl"
                        key={index}>
                    </div>
                )
            })}
        </div>
    </div>
    </>
}

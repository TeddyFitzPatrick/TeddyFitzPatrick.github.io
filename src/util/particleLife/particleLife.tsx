import { useEffect, useRef } from "react";
import { loadSimulation} from './particleLife.ts';

function ParticleLife(){
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const intervalRef = useRef<number | null>(null);

    useEffect(()=>{
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        intervalRef.current = loadSimulation(canvas, ctx, Math.max(Math.min(1000, 0.0006 * (window.innerWidth * window.innerHeight)), 200))

        return () => {
            if (intervalRef.current != null) clearInterval(intervalRef.current);
        };
    }, []);

    return (
        <canvas 
        ref={canvasRef}
        width={window.innerWidth}
        height={window.innerHeight}
        className="w-full h-full"></canvas>
    )
}

export default ParticleLife
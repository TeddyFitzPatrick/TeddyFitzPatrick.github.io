import { useRef, useState, useEffect } from "react";
type Setter<T> = React.Dispatch<React.SetStateAction<T>>;
const MAX_DIVERGENCE_ITERATIONS = 1_000;


export default function Mandelbrot(){
    const [loading, setLoading] = useState<boolean>(false);

    return <>
        <div className="w-screen h-screen overflow-x-hidden grid grid-cols-1 2xl:grid-cols-[auto_auto]">
            <div className="w-full h-full flex items-center justify-center">
                {loading && <Loading/>}
                <Canvas/>
            </div>
            <Controls/>
        </div>
    </>
}

function Loading(){
    return <>
        <div className="z-40 h-full max-w-screen max-h-screen aspect-square flex text-center items-center justify-center text-4xl">
            Re-rendering...
        </div>
    </>
}

const vertexShaderSrc = `
attribute vec2 a_position;

void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
}
`;
const fragmentShaderSrc = `
precision highp float;

uniform vec2 u_resolution;
uniform float u_scale;
uniform vec2 u_offset;
uniform int u_maxIter;

float mandelbrot(vec2 c) {
    vec2 z = vec2(0.0);
    for (int i = 0; i < 1000; i++) {
        if (i >= u_maxIter) break;
        if (dot(z, z) > 4.0) {
            float log_zn = log(dot(z, z)) / 2.0;
            float nu = log(log_zn / log(2.0)) / log(2.0);
            return float(i) + 1.0 - nu;
        }
        z = vec2(
            z.x * z.x - z.y * z.y,
            2.0 * z.x * z.y
        ) + c;
    }
    return -1.0;
}

void main() {
    vec2 uv = (gl_FragCoord.xy / u_resolution) - 0.5;
    vec2 c = uv * u_scale + u_offset;
    float iter = mandelbrot(c);
    if (iter < 0.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }
    float t = iter / float(u_maxIter);
    t = pow(t, 0.35);
    vec3 color = vec3(t);
    gl_FragColor = vec4(color, 1.0);
}
`;

function Canvas() {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) throw new Error("No canvas!");

        const gl = canvas.getContext("webgl");
        if (!gl) throw new Error("No WebGL context!");

        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        gl.viewport(0, 0, canvas.width, canvas.height);

        const program = createProgram(gl, vertexShaderSrc, fragmentShaderSrc);
        gl.useProgram(program);

        // fullscreen quad
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([
                -1, -1,
                 1, -1,
                -1,  1,
                -1,  1,
                 1, -1,
                 1,  1
            ]),
            gl.STATIC_DRAW
        );

        const posLoc = gl.getAttribLocation(program, "a_position");
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

        const uResolution = gl.getUniformLocation(program, "u_resolution");
        const uScale = gl.getUniformLocation(program, "u_scale");
        const uOffset = gl.getUniformLocation(program, "u_offset");
        const uMaxIter = gl.getUniformLocation(program, "u_maxIter");

        const scale = 5.0;
        const xOffset = 0.0;
        const yOffset = 0.0;

        gl.uniform2f(uResolution, canvas.width, canvas.height);
        gl.uniform1f(uScale, scale);
        gl.uniform2f(uOffset, xOffset, yOffset);
        gl.uniform1i(uMaxIter, MAX_DIVERGENCE_ITERATIONS);

        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        // measure performance
        const t0 = performance.now();
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        gl.finish();
        const t1 = performance.now();
        console.log("WebGL render time:", (t1 - t0).toFixed(12), "ms");
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="w-125 md:w-auto h-125 md:h-full max-w-screen max-h-screen aspect-square"
        />
    );
}

function createShader(gl: WebGLRenderingContext, type: number, src: string) {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(shader) || "");
    }

    return shader;
}

function createProgram(gl: WebGLRenderingContext, vs: string, fs: string) {
    const program = gl.createProgram()!;
    gl.attachShader(program, createShader(gl, gl.VERTEX_SHADER, vs));
    gl.attachShader(program, createShader(gl, gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program) || "");
    }

    return program;
}

function Controls(){
    return <>
        <div className="max-h-screen w-full bg-orange-200 text-center flex items-center justify-center flex-col px-4 text-xl">
            <h1>Controls</h1>
            <div>Under development. I am working on making this efficient. Wouldn't it be cool if this used GPU shaders?</div>
        </div>
    </>
}

// function render(ctx: CanvasRenderingContext2D, image: ImageData, setLoading: Setter<boolean>, size: number){
//     const data = image.data;

//     const scale = 5; // tbh
//     const xOffset = 0; //tbh
//     const yOffset = 0; //tbh
//     const brightness = 7; // tbh
    
//     for (let y = 0; y < size; y++) {
//         for (let x = 0; x < size; x++) {
//             const index = (x + y * size) * 4;
//             const escapedIteration = isInMandelbrot(
//                 scale * (x / size) - scale / 2 + xOffset,
//                 scale * (y / size) - scale / 2 + yOffset
//             );
//             if (escapedIteration === -1){
//                 data[index] = 0; 
//                 data[index+1] = 0;   
//                 data[index+2] = 0;   
//                 data[index+3] = 255; 
//             } else {
//                 const shade = 255 - escapedIteration * brightness;
//                 data[index] = shade;
//                 data[index+1] = shade;   
//                 data[index+2] = shade;   
//                 data[index+3] = 255; 
//             }
//         }
//     }
//     ctx.putImageData(image, 0, 0);

//     // setLoading(false);
// }

// /*
//     determines if a complex number z, passed as components a, b, representing z = a + b*i, falls within the Mandelbrot set.
//     returns -1 if the complex coordinate is in the Mandelbrot set, or the iteration it was found to diverge in testing
// */
// function isInMandelbrot(a: number, b: number) {
//     let z = {
//         a: 0,
//         b: 0
//     };
//     for (let iteration = 1; iteration <= MAX_DIVERGENCE_ITERATIONS; iteration++) {
//         /* 
//             Expanded form for when I forget what I was doing
//             f(z) = z^2 + c
//             f(z) = (z.a + z.b * i)^2 + (a + b * i)
//             f(z) = (z.a^2 - z.b^2 + a) <- Real component
//             f(z) = (2 * z.a * z.b + b) * i <- Imaginary component
//         */
//         // Apparently z.a * z.a is marginally faster than z.a ** 2
//         const newA = z.a * z.a - z.b * z.b + a;
//         const newB = 2 * z.a * z.b + b;
//         // divergence testing: |z| = sqrt(x^2 + y^2) > 2
//         // optimization: x^2 + y^2 > 4 
//         if (newA * newA + newB * newB > 4) {
//             return iteration;
//         }
//         // divergence test the next complex cord
//         z.a = newA
//         z.b = newB;
//     }
//     // the complex cord is in the mandelbrot set
//     return -1;
// }
import { useRef, useState, useEffect } from "react";
// type Setter<T> = React.Dispatch<React.SetStateAction<T>>;
const MAX_DIVERGENCE_ITERATIONS = 500;


export default function Mandelbrot(){
    const [loading, _setLoading] = useState<boolean>(false);

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

uniform vec2 u_offset_hi;
uniform vec2 u_offset_lo;

uniform int u_maxIter;

// -------- double-float helpers --------

// add two double-floats
vec2 df_add(vec2 a, vec2 b) {
    float s = a.x + b.x;
    float v = s - a.x;
    float t = ((b.x - v) + (a.x - (s - v))) + a.y + b.y;
    float hi = s + t;
    float lo = t - (hi - s);
    return vec2(hi, lo);
}

// multiply two double-floats
vec2 df_mul(vec2 a, vec2 b) {
    float p = a.x * b.x;
    float err = a.x * b.y + a.y * b.x;
    float hi = p + err;
    float lo = err - (hi - p);
    return vec2(hi, lo);
}

// square complex number
void complex_square(
    in vec2 zx, in vec2 zy,
    out vec2 rx, out vec2 ry
) {
    vec2 x2 = df_mul(zx, zx);
    vec2 y2 = df_mul(zy, zy);
    vec2 xy = df_mul(zx, zy);

    // real: x² - y²
    rx = df_add(x2, vec2(-y2.x, -y2.y));

    // imag: 2xy
    ry = df_add(xy, xy);
}

// -------- Mandelbrot --------

float mandelbrot(vec2 cx, vec2 cy) {
    vec2 zx = vec2(0.0);
    vec2 zy = vec2(0.0);

    for (int i = 0; i < 2000; i++) {
        if (i >= u_maxIter) break;

        // bailout (approx using hi only for speed)
        if (zx.x*zx.x + zy.x*zy.x > 4.0) {
            return float(i);
        }

        vec2 nx, ny;
        complex_square(zx, zy, nx, ny);

        zx = df_add(nx, cx);
        zy = df_add(ny, cy);
    }

    return -1.0;
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;

    // convert to double-float
    vec2 cx = df_add(vec2(uv.x * u_scale, 0.0), vec2(u_offset_hi.x, u_offset_lo.x));
    vec2 cy = df_add(vec2(uv.y * u_scale, 0.0), vec2(u_offset_hi.y, u_offset_lo.y));
    cx = df_add(cx, u_offset_lo);
    cy = df_add(cy, vec2(u_offset_lo.y, 0.0));

    float iter = mandelbrot(cx, cy);

    if (iter < 0.0) {
        gl_FragColor = vec4(0.0,0.0,0.0,1.0);
        return;
    }

    float t = iter / float(u_maxIter);
    vec3 col = 0.5 + 0.5*cos(3.0 + t*5.0 + vec3(0.0,0.6,1.0));

    gl_FragColor = vec4(col,1.0);
}
`;

function Canvas() {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const scaleRef = useRef(5.0);
    const offsetRef = useRef({x: 0.0, y: 0.0});

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
        const uOffsetHi = gl.getUniformLocation(program, "u_offset_hi");
        const uOffsetLo = gl.getUniformLocation(program, "u_offset_lo");
        const uMaxIter = gl.getUniformLocation(program, "u_maxIter");

        gl.uniform2f(uResolution, canvas.width, canvas.height);
        
        gl.uniform1i(uMaxIter, MAX_DIVERGENCE_ITERATIONS);

        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        function render(gl: WebGLRenderingContext) {
            gl.uniform1f(uScale, scaleRef.current);

            const x = offsetRef.current.x;
            const y = offsetRef.current.y;

            const hiX = Math.fround(x);
            const loX = x - hiX;

            const hiY = Math.fround(y);
            const loY = y - hiY;

            gl.uniform2f(uOffsetHi, hiX, hiY);
            gl.uniform2f(uOffsetLo, loX, loY);

            const zoom = 1 / scaleRef.current;
            let iter = Math.floor(50 + Math.log2(zoom) * 25);
            iter = Math.min(2000, Math.max(100, iter));

            gl.uniform1i(uMaxIter, iter);

            gl.drawArrays(gl.TRIANGLES, 0, 6);
        }

        canvas.addEventListener("wheel", (e) => {
            e.preventDefault();

            const zoomFactor = 1.1;
            const direction = e.deltaY > 0 ? 1 : -1;

            const rect = canvas.getBoundingClientRect();
            const px = (e.clientX - rect.left) * (canvas.width / rect.width);
            const py = (e.clientY - rect.top) * (canvas.height / rect.height);

            const nx = (px - 0.5 * canvas.width) / canvas.height;
            const ny = (0.5 * canvas.height - py) / canvas.height;

            const oldScale = scaleRef.current;

            // world position before zoom
            const worldX = offsetRef.current.x + nx * oldScale;
            const worldY = offsetRef.current.y + ny * oldScale;

            // update scale
            const factor = direction > 0 ? zoomFactor : 1 / zoomFactor;
            const newScale = oldScale * factor;
            scaleRef.current = newScale;

            // recompute offset so cursor stays fixed
            offsetRef.current.x = worldX - nx * newScale;
            offsetRef.current.y = worldY - ny * newScale;

            render(gl);
        }, { passive: false });

        // measure performance
        const t0 = performance.now();
        render(gl);
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
            <h1 className="text-3xl font-extrabold">Controls</h1>
            <div>I'm working on migrating this to WebGL. When I figure out GLSL, it infinite zoom again.</div>
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
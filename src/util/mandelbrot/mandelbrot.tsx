import { useRef, useState, useEffect } from "react";

export default function Mandelbrot() {
    const [loading, _setLoading] = useState<boolean>(false);
    return <>
        <div className="w-screen h-screen overflow-x-hidden grid grid-cols-1 2xl:grid-cols-[auto_auto]">
            <div className="w-full h-full flex items-center justify-center">
                {loading && <Loading />}
                <Canvas />
            </div>
            <Controls />
        </div>
    </>
}

function Loading() {
    return <>
        <div className="z-40 h-full max-w-screen max-h-screen aspect-square flex text-center items-center justify-center text-4xl">
            Re-rendering...
        </div>
    </>
}

function Controls() {
    return <>
        <div className="max-h-screen w-full bg-slate-950 border-2 border-white text-center flex items-center justify-center flex-col px-0 sm:px-4 text-xl">
            <div className="text-wrap max-w-60">
                If your device doesn't support WebGL2.0,
                you might not see anything.
            </div>
        </div>
    </>
}

const vertexShaderSource = `#version 300 es
in vec2 a_position;

void main(){
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const fragmentShaderSource = `#version 300 es
// fragment shader precision must be set (e.g. highp "high precision)
precision highp float;

out vec4 outColor;
uniform int u_max_iter;      // ...not sure if this is viable
uniform float u_scale;       // how "zoomed in"
uniform vec2 u_resolution;   // canvas display size
uniform vec2 u_offset;       // shifts the mandelbrot x and y

// look how good this is
int mandelbrot(vec2 offset){
  vec2 cords = vec2(0.0, 0.0);
  for (int iter=0; iter<1000; iter++){
    float new_x = cords.x * cords.x - cords.y * cords.y + offset.x;
    float new_y = 2.0 * cords.x * cords.y + offset.y;
    // diverges
    if (new_x * new_x + new_y * new_y > 4.0){
      return iter;
    }
    cords.x = new_x;
    cords.y = new_y;
  }
  // converges
  return -1;
}

void main(){
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 complex = uv * u_scale - vec2(0.5 * u_scale) + u_offset;
  // fix for aspect ratio
  float aspect = u_resolution.x / u_resolution.y;
  // width > height (desktop)
  if (aspect >= 1.0){
    complex.x *= aspect;
  } else{
    // height > width (mobile)
    complex.y /= aspect;
  }

  int divergence = mandelbrot(complex);
  if (divergence < 0){
    outColor = vec4(0, 0, 0, 1.0);
  } else {
    float color = min(float(divergence), 255.0) / 255.0;
    outColor = vec4(color, color, color, 1.0);
  }
}
`;

function Canvas() {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    let scale = 4.0;
    let maxIter = 1000;
    let gl: WebGL2RenderingContext | null = null;
    const locs: Record<string, WebGLUniformLocation | number | null> = {};
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) throw new Error(`Could not find canvas`);
        gl = canvas.getContext("webgl2");
        if (!gl) throw new Error(`Could not get webgl canvas context`);
        // compile the vertex and fragment shaders
        const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
        // link shaders to a program
        const program = createProgram(gl, vertexShader, fragmentShader);
        // get attr and uniform locations
        locs.pos = gl.getAttribLocation(program, "a_position");

        locs.maxIter = gl.getUniformLocation(program, "u_max_iter");
        locs.res = gl.getUniformLocation(program, "u_resolution");
        locs.offset = gl.getUniformLocation(program, "u_offset");
        locs.scale = gl.getUniformLocation(program, "u_scale");
        // initialize and bind buffers
        const posBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
        // vertex array object (vao) -> collection of attribute state
        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);
        gl.enableVertexAttribArray(locs.pos as number);
        // specify how to pull the data
        const size = 2;          // 2 components per iteration
        const type = gl.FLOAT;   // the data is 32bit floats
        const normalize = false; // don't normalize the data
        const stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
        const offset = 0;        // start at the beginning of the buffer
        gl.vertexAttribPointer(locs.pos as number, size, type, normalize, stride, offset);
        // before rendering, match the canvas size to its display size
        resizeCanvasToDisplaySize(gl.canvas as HTMLCanvasElement);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clearColor(0, 0, 0, 0);
        // we need to convert clip space values to pixels, so set the viewport
        gl.useProgram(program);
        gl.bindVertexArray(vao);
        // pass the canvas resolution to the vertex shader to do the pixels->clip space conversion
        gl.uniform2fv(locs.res, [gl.canvas.width, gl.canvas.height]);
        gl.uniform1f(locs.maxIter, maxIter);
        gl.uniform1f(locs.scale, scale);
        // full-screen quad
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([
                -1, -1,
                1, -1,
                -1, 1,
                -1, 1,
                1, -1,
                1, 1
            ]),
            gl.STATIC_DRAW
        );
        render(gl);

        window.addEventListener("resize", ()=>{
            if (!gl) return;
            render(gl);
        })
    }, []);
    const render = (gl: WebGL2RenderingContext) => {
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    };
    let startDrag: { x: number, y: number } | undefined;
    let xOffset = 0;
    let yOffset = 0;
    let isDragging = false;

    const zoom = (event: React.WheelEvent<HTMLCanvasElement>) => {
        if (!gl) throw new Error(`No WebGL on zoom`);
        // mouse coordinates to zoom into
        const { x, y } = getMouseCords(event);
        const flippedy = gl.canvas.height - y;
        const before_x = (x / gl.canvas.width) * scale - 0.5 * scale + xOffset;
        const before_y = (flippedy / gl.canvas.height) * scale - 0.5 * scale + yOffset;
        // change the scale
        scale *= Math.exp(-event.deltaY * 0.001);
        scale = Math.min(scale, 4.0);
        gl.uniform1f(locs.scale, scale);
        xOffset = before_x - (x / gl.canvas.width) * scale + 0.5 * scale;
        yOffset = before_y - (flippedy / gl.canvas.height) * scale + 0.5 * scale;
        gl.uniform2fv(locs.offset, [xOffset, yOffset]);
        render(gl);
    };
    /* web */
    const getMouseCords = (e: React.MouseEvent<HTMLCanvasElement> | React.WheelEvent<HTMLCanvasElement>): { x: number, y: number } => {
        const canvas = canvasRef.current;
        if (!canvas) throw new Error(`No canvas, couldn't get mouse coordinates`);
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    };
    const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
        // ignore non-left-click presses
        if (event.button !== 0) return;
        isDragging = true;
        startDrag = getMouseCords(event);
    };
    const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
        // ignore non-left-click moves
        if (event.button !== 0) return;
        if (!isDragging || !startDrag) return;
        if (!gl) throw new Error(`No WebGL on applying offset`);
        const { x, y } = getMouseCords(event);
        const dx_uv = (x - startDrag.x) / gl.canvas.width;
        const dy_uv = (y - startDrag.y) / gl.canvas.height;
        const aspect = gl.canvas.width / gl.canvas.height;
        xOffset -= dx_uv * scale * aspect;
        yOffset += dy_uv * scale;
        startDrag = { x, y };
        gl.uniform2fv(locs.offset, [xOffset, yOffset]);
        render(gl);
    };
    const handleMouseRelease = (event: React.MouseEvent<HTMLCanvasElement>) => {
        // ignore non-left-click releases
        if (event.button !== 0) return;
        isDragging = false;
        startDrag = undefined;
    };
    /* mobile */
    const getTouchCords = (e: React.TouchEvent<HTMLCanvasElement>): { x: number, y: number } => {
        const canvas = canvasRef.current;
        if (!canvas) throw new Error(`No canvas, couldn't get mouse coordinates`);
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.touches[0].clientX - rect.left,
            y: e.touches[0].clientY - rect.top,
        };
    };
    const handleTouchStart = (event: React.TouchEvent<HTMLCanvasElement>) => {
        isDragging = true;
        startDrag = getTouchCords(event);
    };
    const handleTouchMove = (event: React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDragging || !startDrag) return;
        if (!gl) throw new Error(`No WebGL on applying offset`);
        const { x, y } = getTouchCords(event);
        const dx_uv = (x - startDrag.x) / gl.canvas.width;
        const dy_uv = (y - startDrag.y) / gl.canvas.height;
        const aspect = gl.canvas.width / gl.canvas.height;
        xOffset -= dx_uv * scale * aspect;
        yOffset += dy_uv * scale;
        startDrag = { x, y };
        gl.uniform2fv(locs.offset, [xOffset, yOffset]);
        render(gl);
    };
    const handleTouchRelease = (_event: React.TouchEvent<HTMLCanvasElement>) => {
        isDragging = false;
        startDrag = undefined;
    };
    return <>
        <canvas
            onWheel={(e) => zoom(e)}
            onMouseDown={(e) => handleMouseDown(e)}
            onMouseMove={(e) => handleMouseMove(e)}
            onMouseUp={(e) => handleMouseRelease(e)}
            onMouseLeave={(e) => handleMouseRelease(e)}
            onTouchStart={(e) => handleTouchStart(e)}
            onTouchMove={(e) => handleTouchMove(e)}
            onTouchEnd={(e) => handleTouchRelease(e)}
            onTouchCancel={(e) => handleTouchRelease(e)}
            className="bg-black w-full h-full" ref={canvasRef} />
    </>
}

function createShader(gl: WebGL2RenderingContext, type: GLenum, source: string) {
    const shader = gl.createShader(type);
    if (!shader) throw new Error(`Could not create shader of type ${type} for GLContext ${gl} on source ${source}`);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) return shader; // compiled the shader successfully
    gl.deleteShader(shader);
    throw new Error(`Could not compile shader of type ${type}, ${gl}, ${source}`);
}

function createProgram(gl: WebGL2RenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    const success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) return program; // successfully created program and linked shaders
    gl.deleteProgram(program);
    throw new Error(`Could not create program or link shaders`);
}

function resizeCanvasToDisplaySize(canvas: HTMLCanvasElement) {
    // Lookup the size the browser is displaying the canvas in CSS pixels.
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;
    // Check if the canvas is not the same size.
    const needResize = canvas.width !== displayWidth ||
        canvas.height !== displayHeight;
    if (needResize) {
        // Make the canvas the same size
        canvas.width = displayWidth;
        canvas.height = displayHeight;
    }
    return needResize;
}
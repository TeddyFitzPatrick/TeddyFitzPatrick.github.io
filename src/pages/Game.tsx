import { useState, useEffect, useRef } from 'react'
import { solveWithClingo, countEnclosedTiles } from '../util/game/gamelogic.ts';

/* Rendering params */
let dogImg = new Image();
let waterImg = new Image();
let grassImg = new Image();
let wallImg = new Image();
let starImg = new Image();
// '_'  -> grass (wall placeable)
// 'x' -> water (wall not-placeable)
// 'd' -> dog (basically grass but rendered as a dog)
// 'w' -> placed wall (removable: becomes grass on remove)
const GRASS = "_";
const WATER = 'x';
const DOG = "d";
const WALL = "w";
const FILLED = "f";
const OPTIMAL = "o";
const squareInset = 4;

let submitted = false;
/* Wall count */
const initialWalls = 10;

/** EXAMPLE LEVEL */
const level = [
  ["_", "x", "_", "x", "_", "_", "_", "x", "_", "_"],
  ["_", "_", "_", "x", "_", "_", "x", "x", "_", "_"],
  ["_", "x", "_", "x", "x", "_", "_", "_", "_", "_"],
  ["x", "x", "_", "_", "_", "_", "_", "_", "_", "_"],
  ["_", "_", "_", "_", "_", "_", "_", "_", "_", "_"],
  ["_", "_", "_", "_", "d", "x", "x", "_", "_", "_"],
  ["x", "x", "_", "_", "_", "_", "_", "_", "_", "_"],
  ["x", "x", "_", "_", "_", "_", "_", "_", "_", "_"],
  ["x", "x", "_", "_", "_", "_", "_", "_", "_", "x"],
  ["x", "x", "_", "_", "x", "x", "_", "_", "_", "x"],
];

export default function Game() {
  return <>
    <div className="flex flex-col items-center justify-center p-24 w-screen h-screen bg-green-800">
      <Board dimension={level.length} asciiGrid={structuredClone(level)}/>      
    </div>
  </>
}

function Board({dimension, asciiGrid}: {dimension: number, asciiGrid: string[][]}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // walls remaining
  const [walls, setWalls] = useState<number>(initialWalls);
  // score
  const [score, setScore] = useState<number | undefined>(undefined);
  // load images then render the board (only call on mount)
  const loadAndRender = async function(){
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = Math.min(canvas.clientHeight, canvas.clientWidth);
    canvas.height = Math.min(canvas.clientHeight, canvas.clientWidth);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    try {
      // wait for the tile images to render
      await Promise.all([
        loadImage(dogImg, '/game/dog.svg'),
        loadImage(waterImg, '/game/water.svg'),
        loadImage(grassImg, '/game/grass.svg'),
        loadImage(wallImg, '/game/wall.svg'),
        loadImage(starImg, '/game/star.svg')
      ]);
      // load the board
      renderBoard(canvas, ctx, asciiGrid, dimension);
    } catch (err) {
      console.error('Failed to load images', err);
    }
  }
  // wall placing / removing
  const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // identify the row & col the user clicked
    const squareSize = canvas.width / dimension;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const col = Math.trunc(x / squareSize);
    const row = Math.trunc(y / squareSize);
    // out-of-bounds check
    if (row < 0 || row > dimension || col < 0 || col > dimension) return;
    // swap grass <-> wall on the grid
    if (asciiGrid[row][col] === GRASS && walls > 0){
      setWalls(walls - 1);
      asciiGrid[row][col] = WALL;
    } else if (asciiGrid[row][col] === WALL){
      setWalls(walls + 1);
      asciiGrid[row][col] = GRASS;
    } else{
      return;
    }
    // re-render the tile
    renderSquare(ctx, row, col, squareSize, asciiGrid);
    // render highlights for enclosed tiles if applicable
    const {count, board: enclosedGrid} = countEnclosedTiles(asciiGrid);
    // remove optimal indicators
    for (let r=0; r<dimension; r++){
      for (let c=0; c<dimension; c++){
        if (asciiGrid[r][c] === OPTIMAL) asciiGrid[r][c] = GRASS;
      }
    }

    // If there are enclosed tiles, draw stars on them
    renderBoard(
      canvas,
      ctx,
      (count === 0 || enclosedGrid === null) ? asciiGrid : enclosedGrid,
      dimension
    )
    // set the score
    if (count === 0 || enclosedGrid === null) setScore(undefined);
    else setScore(count * 10);
  }
  const handleSubmit = () => {
    if (score === undefined){
      alert("Enclose the dog first!");
      return;
    }
    alert("you achieved a score of " + score);
  };
  // board reset
  const resetBoard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // reset each square character
    for (let row=0; row<asciiGrid.length; row++){
      for (let col=0; col<asciiGrid[0].length; col++){
        asciiGrid[row][col] = level[row][col];
      }
    }
    // reset remaining walls
    setWalls(initialWalls);
    // reset score
    setScore(0);
    // re-render
    renderBoard(canvas, ctx, level, dimension);
  } 
  // show optimal solution
  const showOptimal = () => {
    resetBoard();
    const asyncOptimal = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      // get the optimal solution walls
      const {walls, region, area, isEnclosed} = await solveWithClingo(asciiGrid, initialWalls);
      // draw the original board
      resetBoard();
      renderBoard(canvas, ctx, level, dimension);
      // draw the solution walls
      for (const {x, y} of walls){
        asciiGrid[y][x] = "w";
        renderBoard(canvas, ctx, asciiGrid, dimension);
      }
      for (const {x, y} of region){
        if (asciiGrid[y][x] !== DOG) asciiGrid[y][x] = OPTIMAL;
        renderBoard(canvas, ctx, asciiGrid, dimension);
      }
      setScore(area * 10);
      setWalls(0);
    }
    asyncOptimal();
  }
  // render the board on mounting
  useEffect(() => {
    // load the images and the board
    loadAndRender();
  }, []);

  return <>
    <div className="relative h-full max-w-screen max-h-screen">
      {/* Board  */}
      <canvas className="h-[75vh] max-w-screen max-h-screen bg-green-600 aspect-square"
        ref={canvasRef}
        onClick={handleClick}>
      </canvas>
      {/* Text Indicators */}
      <div className="flex justify-between items-center mt-6 w-full text-4xl text-white font-bold">
        {/* Wall remaining indicator */}
        {
        walls === 0 ? 
        <h1 className="w-fit text-red-400 animate-bounce">Walls Remaining: {walls}</h1>
        : 
        <h1 className="w-fit flex-row flex space-x-3">
          <div className="font-light">Walls Remaining: </div>
          <div className="">{walls}</div>
        </h1>
        }
        {/* Score indicator */}
        <h1 className="w-fit flex-row flex space-x-3">
          <div className="font-light">Score:</div>
          <div className="">{score ?? "N/A"}</div>
        </h1>
      </div>
      
      {/* Buttons */}
      <div className="w-full h-24 rounded-2xl flex items-center justify-center p-2 mt-4 space-x-4">
        {/* reset */}
        <button 
          className="font-extrabold bg-red-800 text-white rounded-2xl shadow-2xl px-8 py-6 text-3xl hover:scale-102"
          onClick={resetBoard}>
            Reset
        </button>
        {/* Show optimal */}
        <button
          className="font-extrabold bg-cyan-800 text-white rounded-2xl shadow-2xl px-6 py-6 text-3xl hover:scale-102"
          onClick={showOptimal}>
          See Optimal
        </button>
        {/* Submit */}
        <button onClick={handleSubmit}
          className="bg-green-700 text-white font-extrabold rounded-2xl shadow-2xl px-6 py-6 text-3xl hover:scale-102">
          Submit
        </button>
      </div>
    </div>
  </>
}

function renderBoard(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, asciiGrid: string[][], dimension: number): void {
  const squareSize = canvas.width / dimension;
  for (let row=0; row<dimension; row++){
    for (let col=0; col<dimension; col++){
      // render the square/tile
      renderSquare(ctx, row, col, squareSize, asciiGrid);
    }
  }
}

function renderSquare(ctx: CanvasRenderingContext2D, row: number, col: number, squareSize: number, asciiGrid: string[][]){
  const square: string = asciiGrid[row][col];
  // Choose the background color & image for each square
  let img;
  if (square === GRASS || square === "" || square === " "){
    ctx.fillStyle = "green"
    img = grassImg;
  } else if (square === WATER){
    ctx.fillStyle = "blue";
    img = waterImg;
  } else if (square === DOG){
    ctx.fillStyle= "darkgreen"
    img = dogImg;
  } else if (square === WALL){
    ctx.fillStyle = "brown";
    img = wallImg;
  } else if (square === FILLED){
    ctx.fillStyle = "yellow";
    img = starImg;
  } else if (square === OPTIMAL){
    ctx.fillStyle = "cyan";
    img = starImg;
  }
  // Draw a basic rectangle with the fill color
  const x = col * squareSize + squareInset / 2;
  const y = row * squareSize + squareInset / 2;

  const renderSize = squareSize - squareInset;
  ctx.fillRect(x, y, renderSize, renderSize);
  // Draw the image if there is one
  if (img === undefined) return;
  // makes the grass green
  if (img === grassImg) ctx.filter = 'brightness(2.0) saturate(100%) invert(34%) sepia(93%) saturate(500%) hue-rotate(80deg)';
  // draw the image
  ctx.drawImage(img, x, y, renderSize, renderSize);
  // clear any rendering filters for the next tile
  ctx.filter = "none";
}

function loadImage(img: any, src: string) {
  return new Promise((resolve, reject) => {
    img.src = src;
    img.onload = () => resolve(img);
    img.onerror = reject;
  });
}

function debugGrid(grid: string[][]){
  for (let r=0; r<grid.length; r++){
    let out = ""; 
    for (let c=0; c<grid[0].length; c++){
      out += grid[r][c] + " ";
    }
    console.log(out + "\n");
    
  }
}

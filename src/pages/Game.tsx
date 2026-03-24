import { useState, useEffect, useRef } from 'react'
import { solveWithClingo, countEnclosedTiles } from '../util/game/gamelogic.ts';

/* Rendering params */
let dogImg = new Image();
let waterImg = new Image();
let grassImg = new Image();
let wallImg = new Image();
let starImg = new Image();
const GRASS = "_";
const WATER = 'x';
const DOG = "d";
const WALL = "w";
const FILLED = "f";
const OPTIMAL = "o";
const squareInset = 4;
let squareSize = 1;
const initialWalls = 10;
const level1 = [
  ["_", "x", "_", "x", "_", "_", "_", "x"],
  ["_", "_", "_", "x", "_", "_", "x", "x"],
  ["_", "x", "_", "x", "x", "_", "_", "_"],
  ["x", "x", "_", "_", "_", "_", "_", "_"],
  ["_", "_", "_", "d", "_", "_", "_", "_"],
  ["_", "_", "_", "_", "_", "x", "x", "_"],
  ["x", "x", "_", "_", "_", "_", "_", "_"],
  ["x", "x", "_", "_", "_", "_", "_", "_"],
];
const level2 = [
  ["_", "_", "x", "_", "x", "_", "_", "_", "x", "x"],
  ["_", "_", "x", "_", "x", "_", "x", "_", "x", "_"],
  ["x", "_", "_", "_", "x", "_", "x", "_", "_", "_"],
  ["_", "_", "_", "_", "x", "_", "_", "_", "_", "_"],
  ["x", "x", "_", "_", "_", "_", "_", "_", "x", "x"],
  ["_", "_", "_", "_", "d", "x", "x", "_", "_", "_"],
  ["_", "x", "_", "_", "_", "x", "x", "_", "x", "x"],
  ["x", "_", "_", "x", "_", "_", "_", "_", "_", "_"],
  ["_", "_", "_", "x", "_", "_", "x", "_", "_", "x"],
  ["x", "_", "_", "x", "x", "_", "_", "_", "_", "_"],
];
const level3 = [
  ["_", "_", "x", "_", "x", "_", "x", "_", "_", "_", "_", "x", "_", "x", "_", "x"],
  ["_", "x", "x", "_", "x", "_", "x", "x", "_", "x", "_", "x", "_", "x", "_", "x"],
  ["_", "_", "_", "_", "x", "_", "_", "x", "_", "x", "_", "_", "_", "x", "_", "x"],
  ["x", "_", "_", "x", "x", "_", "_", "x", "_", "_", "_", "_", "_", "x", "_", "_"],
  ["_", "_", "_", "_", "_", "_", "_", "x", "_", "x", "x", "_", "_", "_", "_", "_"],
  ["_", "x", "_", "_", "_", "x", "_", "_", "_", "x", "x", "_", "x", "_", "_", "_"],
  ["_", "x", "_", "_", "_", "_", "_", "x", "_", "_", "_", "_", "_", "_", "x", "_"],
  ["x", "x", "_", "x", "x", "_", "_", "_", "_", "x", "_", "_", "_", "_", "x", "x"],
  ["_", "_", "_", "_", "_", "_", "_", "_", "d", "_", "_", "_", "_", "_", "_", "_"],
  ["_", "_", "x", "_", "_", "_", "_", "x", "_", "_", "_", "x", "_", "_", "_", "_"],
  ["x", "x", "_", "_", "_", "x", "_", "_", "_", "_", "_", "_", "_", "x", "_", "_"],
  ["_", "_", "_", "_", "x", "_", "_", "_", "x", "_", "_", "_", "_", "x", "x", "x"],
  ["x", "_", "_", "x", "_", "_", "_", "_", "x", "_", "x", "_", "_", "_", "_", "_"],
  ["x", "x", "_", "x", "_", "_", "x", "_", "x", "_", "x", "_", "x", "_", "_", "_"],
  ["_", "_", "_", "x", "x", "_", "_", "_", "x", "_", "x", "x", "_", "_", "x", "x"],
  ["_", "_", "_", "x", "x", "_", "x", "_", "x", "_", "x", "x", "_", "_", "x", "x"],
];
let highscore = 0;

let initialLevel = level1;
let currentLevel = structuredClone(initialLevel);

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // walls remaining
  const [walls, setWalls] = useState<number>(initialWalls);
  // score
  const [score, setScore] = useState<number | undefined>(undefined);
  // record the highscore + alert
  const handleSubmit = () => {
    if (score === undefined){
      alert("Enclose the dog first!");
      return;
    }
    if (score > highscore){
        highscore = score;
        alert("New highscore of " + score + "!")
    } else{
        alert("Your score: " + score + ". Highscore: " + highscore + ".");
    }
  };
  // board reset
  const resetBoard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // reset each square character
    currentLevel = structuredClone(initialLevel);
    // reset remaining walls
    setWalls(initialWalls);
    // reset score
    highscore = 0;
    setScore(0);
    // re-render
    renderBoard(ctx, currentLevel);
  } 
  // switch levels
  const switchLevels = (otherLevel: string[][]) => {
    initialLevel = otherLevel;
    currentLevel = structuredClone(initialLevel);
    resetBoard();
    loadAndRender(canvasRef);
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
      const {walls, region, area, isEnclosed: _enclosed} = await solveWithClingo(currentLevel, initialWalls);
      // draw the original board
      resetBoard();
      renderBoard(ctx, currentLevel);
      // draw the solution walls
      for (const {x, y} of walls){
        currentLevel[y][x] = "w";
        renderSquare(ctx, currentLevel, y, x);
      }
      for (const {x, y} of region){
        if (currentLevel[y][x] !== DOG) currentLevel[y][x] = OPTIMAL;
        renderSquare(ctx, currentLevel, y, x);
      }
      setScore(area * 10);
      setWalls(0);
    }
    asyncOptimal();
  }
  return <>
  <div className="flex flex-col items-center justify-center w-screen max-w-screen min-h-screen bg-[url('/game/folder_with_grass/grass2.jpg')]">
    <div className="flex w-full justify-center space-x-2 items-center font-bold py-2">
      <button
        className="bg-cyan-500 p-4 rounded-2xl shadow-2xl hover:scale-102"
        onClick={() => switchLevels(level1)}>
        Level 1
      </button>
      <button 
        className="bg-cyan-700 p-4 rounded-2xl shadow-2xl hover:scale-102"
        onClick={() => switchLevels(level2)}>
        Level 2
      </button>
      <button 
        className="bg-cyan-900 p-4 rounded-2xl shadow-2xl hover:scale-102"
        onClick={() => switchLevels(level3)}>
        Level 3
      </button>
    </div>
    
    <Board canvasRef={canvasRef} walls={walls} setWalls={setWalls} score={score} setScore={setScore}/>     
    <Labels walls={walls} score={score}/>
    <div className="w-full h-24 rounded-2xl flex items-center justify-center p-2 space-x-1 sm:space-x-4 text-xl sm:text-3xl">
      {/* reset */}
      <button 
        className="font-extrabold bg-red-800 text-white rounded-2xl shadow-2xl p-4 sm:p-6 hover:scale-102"
        onClick={resetBoard}>
          Reset
      </button>
      {/* Show optimal */}
      <button
        className="font-extrabold bg-cyan-800 text-white rounded-2xl shadow-2xl p-4 sm:p-6 hover:scale-102"
        onClick={showOptimal}>
        See Optimal
      </button>
      {/* Submit */}
      <button onClick={handleSubmit}
        className="bg-green-700 text-white font-extrabold rounded-2xl shadow-2xl p-4 sm:p-6 hover:scale-102">
        Submit
      </button>
    </div> 
  </div>
  </>
}

function Board(
  {canvasRef, walls, setWalls, score: _score, setScore}:
  {canvasRef: React.RefObject<HTMLCanvasElement | null>,
  walls: number,
  setWalls: React.Dispatch<React.SetStateAction<number>>,
  score: number | undefined,
  setScore: React.Dispatch<React.SetStateAction<number | undefined>>}
) {
  // wall placing / removing
  const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // identify the row & col the user clicked
    const rect = canvas.getBoundingClientRect();
    const col = Math.trunc((event.clientX - rect.left) / squareSize);
    const row = Math.trunc((event.clientY - rect.top) / squareSize);
    // out-of-bounds check
    if (row < 0 || row > currentLevel.length || col < 0 || col > currentLevel.length) return;
    // swap grass <-> wall on the grid
    if (currentLevel[row][col] === GRASS && walls > 0){
      setWalls(walls - 1);
      currentLevel[row][col] = WALL;
    } else if (currentLevel[row][col] === WALL){
      setWalls(walls + 1);
      currentLevel[row][col] = GRASS;
    } else{
      return;
    }
    // re-render the tile
    renderSquare(ctx, currentLevel, row, col);
    // render highlights for enclosed tiles if applicable
    const {count, board: enclosed} = countEnclosedTiles(currentLevel);
    // remove optimal indicators
    currentLevel.map(row => row.map(element => {
      return (element === OPTIMAL) ? GRASS : element;
    }));
    // If there are enclosed tiles, draw stars on them
    renderBoard(ctx, enclosed ?? currentLevel);
    // set the score
    if (count === 0 || enclosed === null) setScore(undefined);
    else setScore(count * 10);
  }
  // render the board on mounting
  useEffect(() => {
    // load the images and the board
    loadAndRender(canvasRef);
  }, []);

  return <canvas 
    className="bg-green-600 aspect-square w-[min(95vw,95vh)] h-[min(95vw,95vh)] sm:w-[min(85vw,85vh)] sm:h-[min(85vw,85vh)]"
    ref={canvasRef}
    onClick={handleClick}>
  </canvas>
}

function Labels({walls, score}: {walls: number, score: number | undefined}){
  return <>
  {/* Text Indicators */}
  <div className="flex justify-around items-center w-full text-lg sm:text-4xl text-white mt-2">
    {/* Wall remaining indicator */}
    <h1 className={`w-fit ${walls === 0 ? "text-red-400 animate-bounce" : ""}`}>
      Walls Remaining: {walls}
    </h1>
    {/* Score indicator */}
    <h1 className="w-fit flex-row flex space-x-1">
      <div className="font-light">Score:</div>
      <div className="">{score ?? "N/A"}</div>
    </h1>
  </div>
  </>
}

// load images then render the board (only call on mount)
const loadAndRender = async function(canvasRef: React.RefObject<HTMLCanvasElement | null>){
  const canvas = canvasRef.current;
  if (!canvas) return;
  const dimension = currentLevel.length;
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  squareSize = canvas.width / dimension;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  try {
    // load the images
    if (!dogImg.src || !waterImg.src || !grassImg.src || !wallImg.src || !starImg.src){
      await Promise.all([
        loadImage(dogImg, '/game/dog.svg'),
        loadImage(waterImg, '/game/water.svg'),
        loadImage(grassImg, '/game/grass.svg'),
        loadImage(wallImg, '/game/wall.svg'),
        loadImage(starImg, '/game/star.svg')
      ]);
    }
    renderBoard(ctx, currentLevel);
  } catch (err) {
    console.error('Failed to load images', err);
  }
}

function renderBoard(ctx: CanvasRenderingContext2D, level: string[][]): void {
  const dimension = level.length;
  for (let row=0; row<dimension; row++){
    for (let col=0; col<dimension; col++){
      // render the square/tile
      renderSquare(ctx, level, row, col);
    }
  }
}

function renderSquare(ctx: CanvasRenderingContext2D, level: string[][], row: number, col: number){
  const square = level[row][col];
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

// function debugGrid(grid: string[][]){
//   for (let r=0; r<grid.length; r++){
//     let out = ""; 
//     for (let c=0; c<grid[0].length; c++){
//       out += grid[r][c] + " ";
//     }
//     console.log(out + "\n");
//   }
//   console.log("\n");
// }
